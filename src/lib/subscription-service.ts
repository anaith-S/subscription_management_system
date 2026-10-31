import { prisma } from "@/lib/prisma";
import { Prisma, Role, SubscriptionStatus } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { addUtcDays } from "@/lib/dates";
import { fromCents, toCents } from "@/lib/money";
import { nextDocumentNumber } from "@/lib/sequence";
import { normalizePaymentTerms } from "@/lib/payment-terms";

type Tx = Prisma.TransactionClient;

// Legal transitions state map
const ALLOWED_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  DRAFT: [SubscriptionStatus.QUOTATION, SubscriptionStatus.CLOSED],
  QUOTATION: [SubscriptionStatus.CONFIRMED, SubscriptionStatus.CLOSED],
  CONFIRMED: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CLOSED],
  ACTIVE: [SubscriptionStatus.PAUSED, SubscriptionStatus.CLOSED],
  PAUSED: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CLOSED],
  CLOSED: [], // Terminal state
};

const FALLBACK_TAX_RATE = 10.0;

/**
 * Reserves the next subscription number. Kept for existing callers; new code
 * should call nextDocumentNumber(tx, "SUBSCRIPTION") inside its transaction.
 */
export async function generateSubscriptionNumber(): Promise<string> {
  return nextDocumentNumber(prisma, "SUBSCRIPTION");
}

/**
 * Transitions a subscription to a new status.
 *
 * Only internal users (ADMIN / STAFF) may change a subscription's status;
 * customers can view theirs but not confirm, activate, pause or close it.
 */
export async function transitionSubscription(
  subscriptionId: string,
  targetStatus: SubscriptionStatus,
  user: { id: string; role: string }
) {
  if (user.role.toUpperCase() === Role.CUSTOMER) {
    throw new AppError("Forbidden: customers cannot change subscription status", 403);
  }

  return prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });
    if (!subscription) throw new AppError("Subscription not found", 404);

    const currentStatus = subscription.status;
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(targetStatus)) {
      throw new AppError(
        `Invalid transition: Cannot jump from ${currentStatus} to ${targetStatus}. Allowed transitions: ${
          allowed.join(", ") || "None (Terminal State)"
        }`,
        409
      );
    }

    // Plan rules validation
    if (targetStatus === SubscriptionStatus.PAUSED && !subscription.plan.canPause) {
      throw new AppError(`Plan '${subscription.plan.name}' does not allow pausing.`, 409);
    }

    if (
      targetStatus === SubscriptionStatus.CLOSED &&
      currentStatus === SubscriptionStatus.ACTIVE &&
      !subscription.plan.canCloseEarly &&
      subscription.expiryDate &&
      new Date() < subscription.expiryDate
    ) {
      throw new AppError(
        `Plan '${subscription.plan.name}' does not allow closing early before expiry.`,
        409
      );
    }

    // Only update if nobody changed the status since we read it.
    const { count } = await tx.subscription.updateMany({
      where: { id: subscriptionId, status: currentStatus },
      data: { status: targetStatus },
    });
    if (count === 0) {
      throw new AppError("Subscription was changed by someone else. Reload and try again.", 409);
    }

    return tx.subscription.findUniqueOrThrow({
      where: { id: subscriptionId },
      include: { customer: true, plan: true, lines: true },
    });
  });
}

// ---------------------------------------------------------------------------
// Shared validation
// ---------------------------------------------------------------------------

/** Subscriptions can only belong to active CUSTOMER accounts. */
async function assertBillableCustomer(db: Tx, customerId: unknown) {
  if (typeof customerId !== "string" || !customerId) {
    throw new AppError("Customer ID is required");
  }
  const customer = await db.user.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError("Customer not found", 404);
  if (customer.role !== Role.CUSTOMER) {
    throw new AppError("Subscriptions can only be created for customer accounts");
  }
  if (!customer.isActive) throw new AppError("Customer account is inactive");
  return customer;
}

/** Returns the normalised code, or null. Rejects codes that don't exist. */
async function normalizeDiscountCode(db: Tx, code: unknown): Promise<string | null> {
  if (code === undefined || code === null || code === "") return null;
  if (typeof code !== "string") throw new AppError("discountCode must be a string");
  const normalized = code.trim().toUpperCase();
  const rule = await db.discountRule.findUnique({ where: { code: normalized } });
  if (!rule) throw new AppError(`Discount code '${code}' does not exist`);
  return normalized;
}

async function defaultTaxRate(db: Tx): Promise<number> {
  const rule = await db.taxRule.findFirst({ where: { isDefault: true } });
  return rule ? rule.ratePercentage : FALLBACK_TAX_RATE;
}

function assertExpiryAfterStart(startDate: Date, expiryDate: Date | null) {
  if (expiryDate && expiryDate <= startDate) {
    throw new AppError("Expiry date must be after the start date");
  }
}

// ---------------------------------------------------------------------------
// Creating subscriptions
// ---------------------------------------------------------------------------

export interface NewSubscriptionLine {
  productId: string;
  variantId?: string | null;
  quantity?: number | string;
  /** Optional override; defaults to product price + variant extra price. */
  unitPrice?: number | string | null;
  /** Optional override; defaults to the default tax rule. */
  taxRate?: number | string | null;
}

export interface NewSubscriptionInput {
  customerId: string;
  planId: string;
  startDate?: Date;
  expiryDate?: Date | null;
  paymentTerms?: string;
  discountCode?: string | null;
  lines: NewSubscriptionLine[];
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return Number(value);
}

/** Creates a DRAFT subscription after validating every field. */
export async function createSubscription(input: NewSubscriptionInput) {
  if (!input.planId) throw new AppError("Plan is required");
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new AppError("At least one product line is required");
  }

  return prisma.$transaction(async (tx) => {
    const customer = await assertBillableCustomer(tx, input.customerId);

    const plan = await tx.plan.findUnique({ where: { id: input.planId } });
    if (!plan) throw new AppError("Plan not found", 404);

    const startDate = input.startDate ?? new Date();
    const expiryDate = input.expiryDate ?? null;
    assertExpiryAfterStart(startDate, expiryDate);

    const paymentTerms = normalizePaymentTerms(input.paymentTerms);
    const discountCode = await normalizeDiscountCode(tx, input.discountCode);
    const taxDefault = await defaultTaxRate(tx);

    const lines: Prisma.SubscriptionLineCreateWithoutSubscriptionInput[] = [];
    for (const [index, raw] of input.lines.entries()) {
      const label = `Line ${index + 1}`;
      if (!raw?.productId) throw new AppError(`${label}: product is required`);

      const product = await tx.product.findUnique({
        where: { id: raw.productId },
        include: { variants: true },
      });
      if (!product) throw new AppError(`${label}: product not found`);

      const variant = raw.variantId
        ? product.variants.find((v) => v.id === raw.variantId)
        : undefined;
      if (raw.variantId && !variant) {
        throw new AppError(`${label}: variant does not belong to ${product.name}`);
      }

      const quantity = optionalNumber(raw.quantity) ?? 1;
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new AppError(`${label}: quantity must be a whole number of at least 1`);
      }

      const catalogPrice = product.salesPrice + (variant?.extraPrice ?? 0);
      const unitPrice = optionalNumber(raw.unitPrice) ?? catalogPrice;
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new AppError(`${label}: unit price must be zero or more`);
      }

      const taxRate = optionalNumber(raw.taxRate) ?? taxDefault;
      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
        throw new AppError(`${label}: tax rate must be between 0 and 100`);
      }

      const unitCents = toCents(unitPrice);
      lines.push({
        product: { connect: { id: product.id } },
        ...(variant ? { variant: { connect: { id: variant.id } } } : {}),
        quantity,
        unitPrice: fromCents(unitCents),
        taxRate,
        amount: fromCents(unitCents * quantity),
      });
    }

    return tx.subscription.create({
      data: {
        subscriptionNumber: await nextDocumentNumber(tx, "SUBSCRIPTION"),
        customer: { connect: { id: customer.id } },
        plan: { connect: { id: plan.id } },
        status: SubscriptionStatus.DRAFT,
        startDate,
        expiryDate,
        nextBillingDate: startDate,
        paymentTerms,
        discountCode,
        lines: { create: lines },
      },
      include: {
        customer: true,
        plan: true,
        lines: { include: { product: true, variant: true } },
      },
    });
  });
}

/**
 * Creates a new subscription from a Quotation Template.
 * Copies the lines and calculates validity expiry date.
 */
export async function createSubscriptionFromTemplate(
  templateId: string,
  customerId: string,
  options?: {
    paymentTerms?: string;
    discountCode?: string | null;
    startDate?: Date;
  }
) {
  return prisma.$transaction(async (tx) => {
    const template = await tx.quotationTemplate.findUnique({
      where: { id: templateId },
      include: { plan: true, lines: { include: { product: true } } },
    });
    if (!template) throw new AppError("Quotation template not found", 404);

    if (!template.planId || !template.plan) {
      throw new AppError("Quotation template must be associated with a billing plan");
    }
    if (template.lines.length === 0) {
      throw new AppError("Quotation template has no product lines");
    }

    const customer = await assertBillableCustomer(tx, customerId);
    const paymentTerms = normalizePaymentTerms(options?.paymentTerms);
    const discountCode = await normalizeDiscountCode(tx, options?.discountCode);
    const taxRate = await defaultTaxRate(tx);

    const startDate = options?.startDate ?? new Date();
    const expiryDate = addUtcDays(startDate, template.validityDays);
    assertExpiryAfterStart(startDate, expiryDate);

    return tx.subscription.create({
      data: {
        subscriptionNumber: await nextDocumentNumber(tx, "SUBSCRIPTION"),
        customerId: customer.id,
        planId: template.plan.id,
        status: SubscriptionStatus.DRAFT,
        startDate,
        expiryDate,
        nextBillingDate: startDate, // First billing starts at start date
        paymentTerms,
        discountCode,
        lines: {
          create: template.lines.map((tLine) => {
            const unitCents = toCents(
              tLine.unitPrice > 0 ? tLine.unitPrice : tLine.product.salesPrice
            );
            return {
              productId: tLine.productId,
              quantity: tLine.quantity,
              unitPrice: fromCents(unitCents),
              taxRate,
              amount: fromCents(unitCents * tLine.quantity),
            };
          }),
        },
      },
      include: {
        customer: true,
        plan: true,
        lines: { include: { product: true } },
      },
    });
  });
}
