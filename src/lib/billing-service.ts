import { prisma } from "@/lib/prisma";
import {
  BillingFrequency,
  DiscountTarget,
  DiscountType,
  InvoiceStatus,
  Plan,
  Prisma,
  Subscription,
  SubscriptionStatus,
} from "@prisma/client";
import { AppError } from "@/lib/errors";
import { allocate, fromCents, percentOf, toCents } from "@/lib/money";
import { addUtcDays, addUtcMonths, endOfUtcDay, startOfUtcDay } from "@/lib/dates";
import { nextDocumentNumber } from "@/lib/sequence";
import { paymentTermsToDays } from "@/lib/payment-terms";

type Tx = Prisma.TransactionClient;

/** AppError code used when a billing period already has an invoice. */
export const INVOICE_ALREADY_EXISTS = "INVOICE_ALREADY_EXISTS";

/** Upper bound on missed periods caught up for one subscription in one run. */
const MAX_PERIODS_PER_RUN = 400;

/**
 * Reserves the next invoice number. Kept for existing callers; new code should
 * call nextDocumentNumber(tx, "INVOICE") inside its own transaction.
 */
export async function generateInvoiceNumber(): Promise<string> {
  return nextDocumentNumber(prisma, "INVOICE");
}

/** Due date = invoice date + the number of days in the payment terms. */
export function calculateDueDate(invoiceDate: Date, paymentTerms: string): Date {
  return addUtcDays(invoiceDate, paymentTermsToDays(paymentTerms));
}

/**
 * Next billing date after `currentDate` for the plan's frequency.
 *
 * `anchorDate` is the subscription's start date. Monthly and yearly plans keep
 * billing on that day of the month where possible instead of drifting
 * (Jan 31 -> Feb 28 -> Mar 31, not Jan 31 -> Mar 3).
 */
export function advanceBillingDate(
  currentDate: Date,
  frequency: BillingFrequency,
  anchorDate?: Date
): Date {
  const anchorDay = (anchorDate ?? currentDate).getUTCDate();
  switch (frequency) {
    case BillingFrequency.DAILY:
      return addUtcDays(currentDate, 1);
    case BillingFrequency.WEEKLY:
      return addUtcDays(currentDate, 7);
    case BillingFrequency.YEARLY:
      return addUtcMonths(currentDate, 12, anchorDay);
    case BillingFrequency.MONTHLY:
    default:
      return addUtcMonths(currentDate, 1, anchorDay);
  }
}

// ---------------------------------------------------------------------------
// Discounts
// ---------------------------------------------------------------------------

interface PricedLine {
  productId: string;
  quantity: number;
  amountCents: number;
}

interface DiscountOutcome {
  ruleId: string | null;
  totalCents: number;
  /** Discount allocated to each line, same order as the input lines. */
  perLineCents: number[];
}

const NO_DISCOUNT = (lines: PricedLine[]): DiscountOutcome => ({
  ruleId: null,
  totalCents: 0,
  perLineCents: lines.map(() => 0),
});

/**
 * Works out and claims the discount for one invoice, inside the invoice's
 * transaction.
 *
 * A code counts as one use per subscription, the first time it is applied, so
 * a monthly subscriber renewing doesn't use up the code's usage limit. The
 * claim is a conditional increment, so two invoices at once can't both take
 * the last use.
 */
async function applyDiscount(
  tx: Tx,
  subscriptionId: string,
  discountCode: string | null,
  lines: PricedLine[]
): Promise<DiscountOutcome> {
  if (!discountCode?.trim()) return NO_DISCOUNT(lines);

  const rule = await tx.discountRule.findUnique({
    where: { code: discountCode.trim().toUpperCase() },
  });
  if (!rule) return NO_DISCOUNT(lines);

  const now = new Date();
  if ((rule.startDate && now < rule.startDate) || (rule.endDate && now > rule.endDate)) {
    return NO_DISCOUNT(lines);
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.amountCents, 0);
  const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);

  if (rule.minQuantity && totalQuantity < rule.minQuantity) return NO_DISCOUNT(lines);
  if (rule.minPurchaseAmount && subtotalCents < toCents(rule.minPurchaseAmount)) {
    return NO_DISCOUNT(lines);
  }

  const eligibleWeights = lines.map((l) =>
    rule.targetType === DiscountTarget.SPECIFIC_PRODUCT && rule.targetProductId
      ? l.productId === rule.targetProductId
        ? l.amountCents
        : 0
      : l.amountCents
  );
  const eligibleCents = eligibleWeights.reduce((sum, w) => sum + w, 0);
  if (eligibleCents <= 0) return NO_DISCOUNT(lines);

  const totalCents =
    rule.type === DiscountType.PERCENTAGE
      ? Math.min(percentOf(eligibleCents, rule.value), eligibleCents)
      : Math.min(toCents(rule.value), eligibleCents);
  if (totalCents <= 0) return NO_DISCOUNT(lines);

  // Count a use only the first time this subscription gets the discount.
  const alreadyApplied =
    (await tx.invoice.count({ where: { subscriptionId, discountAmount: { gt: 0 } } })) > 0;

  if (!alreadyApplied) {
    const claimed = await tx.discountRule.updateMany({
      where: {
        id: rule.id,
        ...(rule.usageLimit != null ? { timesUsed: { lt: rule.usageLimit } } : {}),
      },
      data: { timesUsed: { increment: 1 } },
    });
    if (claimed.count === 0) return NO_DISCOUNT(lines); // usage limit reached
  }

  return { ruleId: rule.id, totalCents, perLineCents: allocate(totalCents, eligibleWeights) };
}

// ---------------------------------------------------------------------------
// Invoicing
// ---------------------------------------------------------------------------

const INVOICE_INCLUDE = {
  customer: true,
  lines: { include: { product: true } },
  subscription: { include: { plan: true } },
} satisfies Prisma.InvoiceInclude;

/**
 * What to change on the subscription once the period starting at
 * `periodStart` is billed. The schedule only moves on when the billed period
 * is the scheduled one; an ad-hoc invoice for another period leaves it alone.
 */
function scheduleUpdate(
  subscription: Subscription & { plan: Plan },
  periodStart: Date
): Prisma.SubscriptionUpdateInput {
  const scheduledStart = startOfUtcDay(subscription.nextBillingDate);
  if (periodStart.getTime() !== scheduledStart.getTime()) return {};

  const nextBillingDate = advanceBillingDate(
    periodStart,
    subscription.plan.frequency,
    startOfUtcDay(subscription.startDate)
  );
  const pastExpiry = subscription.expiryDate != null && nextBillingDate > subscription.expiryDate;

  return {
    nextBillingDate,
    ...(subscription.plan.autoClose && pastExpiry ? { status: SubscriptionStatus.CLOSED } : {}),
  };
}

/**
 * Bills one period of a subscription. Runs entirely inside `tx`, so the
 * invoice, the discount usage and the schedule update are saved together or
 * not at all.
 */
async function billPeriodInTx(
  tx: Tx,
  subscriptionId: string,
  requestedPeriodStart: Date | undefined,
  options: { customNotes?: string } = {}
) {
  const subscription = await tx.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true, lines: { include: { product: true, variant: true } } },
  });
  if (!subscription) throw new AppError("Subscription not found", 404);

  if (subscription.status !== SubscriptionStatus.ACTIVE) {
    throw new AppError(
      `Cannot bill subscription in '${subscription.status}' status. Must be ACTIVE.`,
      409
    );
  }
  if (subscription.lines.length === 0) {
    throw new AppError("Subscription has no product lines to bill", 409);
  }

  // Default to the next scheduled period, so a manual "create invoice" stays
  // in step with the billing run instead of overlapping it.
  const periodStart = startOfUtcDay(requestedPeriodStart ?? subscription.nextBillingDate);

  const existing = await tx.invoice.findFirst({ where: { subscriptionId, periodStart } });
  if (existing) {
    throw new AppError(
      `Invoice ${existing.invoiceNumber} already covers the period starting ${periodStart
        .toISOString()
        .slice(0, 10)}`,
      409,
      INVOICE_ALREADY_EXISTS
    );
  }

  const priced: PricedLine[] = subscription.lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    amountCents: toCents(line.unitPrice) * line.quantity,
  }));

  const discount = await applyDiscount(tx, subscription.id, subscription.discountCode, priced);

  // Tax is charged on what the customer actually pays: line amount minus its
  // share of the discount.
  let subtotalCents = 0;
  let taxCents = 0;
  const invoiceLines = subscription.lines.map((line, i) => {
    const amountCents = priced[i].amountCents;
    subtotalCents += amountCents;
    taxCents += percentOf(amountCents - discount.perLineCents[i], line.taxRate);

    const variantName = line.variant?.name ?? line.variant?.value;
    const variantLabel = variantName ? ` (${variantName})` : "";
    return {
      productId: line.productId,
      description: `${line.product.name}${variantLabel} - ${subscription.plan.name}`,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxRate: line.taxRate,
      amount: fromCents(amountCents),
    };
  });
  const totalCents = subtotalCents - discount.totalCents + taxCents;

  const invoiceDate = new Date();
  const invoice = await tx.invoice.create({
    data: {
      invoiceNumber: await nextDocumentNumber(tx, "INVOICE"),
      customerId: subscription.customerId,
      subscriptionId: subscription.id,
      periodStart,
      periodEnd: advanceBillingDate(
        periodStart,
        subscription.plan.frequency,
        startOfUtcDay(subscription.startDate)
      ),
      status: InvoiceStatus.DRAFT,
      invoiceDate,
      dueDate: calculateDueDate(invoiceDate, subscription.paymentTerms),
      subtotal: fromCents(subtotalCents),
      taxAmount: fromCents(taxCents),
      discountAmount: fromCents(discount.totalCents),
      totalAmount: fromCents(totalCents),
      notes:
        options.customNotes ||
        `Automated billing for ${subscription.subscriptionNumber} (${subscription.plan.name}). Terms: ${subscription.paymentTerms}.`,
      lines: { create: invoiceLines },
    },
    include: INVOICE_INCLUDE,
  });

  await tx.subscription.update({
    where: { id: subscription.id },
    data: { lastBilledDate: invoiceDate, ...scheduleUpdate(subscription, periodStart) },
  });

  return invoice;
}

function isDuplicatePeriodError(error: unknown): boolean {
  return (
    (error instanceof AppError && error.code === INVOICE_ALREADY_EXISTS) ||
    // Two requests raced past the existence check; the unique index caught it.
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
  );
}

/**
 * Creates the invoice for one billing period of an ACTIVE subscription.
 *
 * `periodStart` defaults to the subscription's next billing date, and billing
 * that period moves the schedule on. The unique (subscriptionId, periodStart)
 * index guarantees a period is never billed twice.
 */
export async function createInvoiceFromSubscription(
  subscriptionId: string,
  periodStart?: Date,
  options?: { customNotes?: string }
) {
  try {
    return await prisma.$transaction((tx) =>
      billPeriodInTx(tx, subscriptionId, periodStart, options)
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("An invoice for this period was just created", 409, INVOICE_ALREADY_EXISTS);
    }
    throw error;
  }
}

/**
 * Billing run: bills every ACTIVE subscription whose next billing date is
 * today or earlier, catching up any periods that were missed.
 *
 * Each period is its own transaction (invoice + schedule move together), so a
 * crash part-way through can never leave a subscription stuck with an
 * invoice but an old nextBillingDate. If a period already has an invoice
 * (e.g. one created by hand), the schedule is moved past it and it's counted
 * as skipped.
 */
export async function executeBillingRun(now: Date = new Date()) {
  const cutoff = endOfUtcDay(now);

  const dueSubscriptions = await prisma.subscription.findMany({
    where: { status: SubscriptionStatus.ACTIVE, nextBillingDate: { lte: cutoff } },
    select: { id: true, subscriptionNumber: true, customer: { select: { name: true } } },
    orderBy: { nextBillingDate: "asc" },
  });

  const results = {
    totalEvaluated: dueSubscriptions.length,
    invoicesCreated: 0,
    skipped: 0,
    invoices: [] as {
      invoiceId: string;
      invoiceNumber: string;
      customerName: string;
      amount: number;
      subscriptionNumber: string;
    }[],
    errors: [] as { subscriptionNumber: string; error: string }[],
  };

  for (const sub of dueSubscriptions) {
    for (let period = 0; ; period++) {
      if (period >= MAX_PERIODS_PER_RUN) {
        results.errors.push({
          subscriptionNumber: sub.subscriptionNumber,
          error: `Stopped after ${MAX_PERIODS_PER_RUN} periods; run billing again to continue catching up`,
        });
        break;
      }

      try {
        const outcome = await prisma.$transaction(async (tx) => {
          // Re-read inside the transaction: another run may have moved it on.
          const current = await tx.subscription.findUnique({
            where: { id: sub.id },
            include: { plan: true },
          });
          if (
            !current ||
            current.status !== SubscriptionStatus.ACTIVE ||
            current.nextBillingDate > cutoff
          ) {
            return { kind: "done" as const };
          }

          try {
            const invoice = await billPeriodInTx(tx, sub.id, current.nextBillingDate);
            return { kind: "billed" as const, invoice };
          } catch (error) {
            if (!(error instanceof AppError && error.code === INVOICE_ALREADY_EXISTS)) throw error;
            // Already invoiced: move the schedule past this period.
            await tx.subscription.update({
              where: { id: sub.id },
              data: scheduleUpdate(current, startOfUtcDay(current.nextBillingDate)),
            });
            return { kind: "skipped" as const };
          }
        });

        if (outcome.kind === "done") break;
        if (outcome.kind === "skipped") {
          results.skipped += 1;
          continue;
        }

        results.invoicesCreated += 1;
        results.invoices.push({
          invoiceId: outcome.invoice.id,
          invoiceNumber: outcome.invoice.invoiceNumber,
          customerName: sub.customer.name,
          amount: outcome.invoice.totalAmount,
          subscriptionNumber: sub.subscriptionNumber,
        });
      } catch (error) {
        if (isDuplicatePeriodError(error)) {
          // A concurrent run billed this period first; it will carry on from here.
          results.skipped += 1;
        } else {
          if (!(error instanceof AppError)) {
            console.error(`Billing run failed for ${sub.subscriptionNumber}:`, error);
          }
          results.errors.push({
            subscriptionNumber: sub.subscriptionNumber,
            error: error instanceof AppError ? error.message : "Failed to generate invoice",
          });
        }
        break;
      }
    }
  }

  return results;
}
