import { prisma } from "@/lib/prisma";
import { SubscriptionStatus, Role } from "@prisma/client";

// Legal transitions state map
const ALLOWED_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  DRAFT: [SubscriptionStatus.QUOTATION, SubscriptionStatus.CLOSED],
  QUOTATION: [SubscriptionStatus.CONFIRMED, SubscriptionStatus.CLOSED],
  CONFIRMED: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CLOSED],
  ACTIVE: [SubscriptionStatus.PAUSED, SubscriptionStatus.CLOSED],
  PAUSED: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CLOSED],
  CLOSED: [], // Terminal state
};

/**
 * Generates an auto-incremented subscription number like SUB-0001, SUB-0002.
 */
export async function generateSubscriptionNumber(): Promise<string> {
  const count = await prisma.subscription.count();
  const nextNumber = count + 1;
  return `SUB-${String(nextNumber).padStart(4, "0")}`;
}

/**
 * Transitions a subscription to a new status.
 * Rejects any invalid jumps or unauthorized customer actions.
 */
export async function transitionSubscription(
  subscriptionId: string,
  targetStatus: SubscriptionStatus,
  user: { id: string; role: string }
) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true, customer: true, lines: true },
  });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  // Customers can only view, they cannot trigger manual transitions unless allowed
  if (user.role.toUpperCase() === Role.CUSTOMER && subscription.customerId !== user.id) {
    throw new Error("Unauthorized to access this subscription");
  }

  // Check state machine
  const currentStatus = subscription.status;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(targetStatus)) {
    throw new Error(
      `Invalid transition: Cannot jump from ${currentStatus} to ${targetStatus}. Allowed transitions: ${
        allowed.join(", ") || "None (Terminal State)"
      }`
    );
  }

  // Plan rules validation
  if (targetStatus === SubscriptionStatus.PAUSED && !subscription.plan.canPause) {
    throw new Error(`Plan '${subscription.plan.name}' does not allow pausing.`);
  }

  if (
    targetStatus === SubscriptionStatus.CLOSED &&
    currentStatus === SubscriptionStatus.ACTIVE &&
    !subscription.plan.canCloseEarly &&
    subscription.expiryDate &&
    new Date() < subscription.expiryDate
  ) {
    throw new Error(`Plan '${subscription.plan.name}' does not allow closing early before expiry.`);
  }

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: targetStatus,
    },
    include: { customer: true, plan: true, lines: true },
  });

  return updated;
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
    discountCode?: string;
    startDate?: Date;
  }
) {
  const template = await prisma.quotationTemplate.findUnique({
    where: { id: templateId },
    include: {
      plan: true,
      lines: {
        include: { product: { include: { variants: true } } },
      },
    },
  });

  if (!template) {
    throw new Error("Quotation template not found");
  }

  if (!template.planId || !template.plan) {
    throw new Error("Quotation template must be associated with a billing plan");
  }

  const customer = await prisma.user.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new Error("Customer user not found");
  }

  const startDate = options?.startDate || new Date();
  const expiryDate = new Date(startDate.getTime() + template.validityDays * 24 * 60 * 60 * 1000);
  const nextBillingDate = new Date(startDate); // First billing starts at start date

  const subNumber = await generateSubscriptionNumber();

  // Fetch default tax rule
  const defaultTax = await prisma.taxRule.findFirst({
    where: { isDefault: true },
  });
  const defaultTaxRate = defaultTax ? defaultTax.ratePercentage : 10.0;

  // Create subscription with copied lines
  const subscription = await prisma.subscription.create({
    data: {
      subscriptionNumber: subNumber,
      customerId: customer.id,
      planId: template.plan.id,
      status: SubscriptionStatus.DRAFT,
      startDate,
      expiryDate,
      nextBillingDate,
      paymentTerms: options?.paymentTerms || "Net 15",
      discountCode: options?.discountCode || null,
      lines: {
        create: template.lines.map((tLine) => {
          const unitPrice = tLine.unitPrice > 0 ? tLine.unitPrice : tLine.product.salesPrice;
          const lineTotal = unitPrice * tLine.quantity;
          return {
            productId: tLine.productId,
            quantity: tLine.quantity,
            unitPrice: unitPrice,
            taxRate: defaultTaxRate,
            amount: lineTotal,
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

  return subscription;
}
