import { prisma } from "@/lib/prisma";
import { BillingFrequency, DiscountTarget, DiscountType, InvoiceStatus } from "@prisma/client";

export async function generateInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count();
  const nextNumber = count + 1;
  return `INV-${String(nextNumber).padStart(4, "0")}`;
}

/**
 * Calculates due date based on payment terms (e.g. Net 15, Net 30, Immediate)
 */
export function calculateDueDate(baseDate: Date, paymentTerms: string): Date {
  const dueDate = new Date(baseDate);
  if (paymentTerms.toLowerCase().includes("15")) {
    dueDate.setDate(dueDate.getDate() + 15);
  } else if (paymentTerms.toLowerCase().includes("30")) {
    dueDate.setDate(dueDate.getDate() + 30);
  } else if (paymentTerms.toLowerCase().includes("7")) {
    dueDate.setDate(dueDate.getDate() + 7);
  } else {
    // Immediate
    dueDate.setDate(dueDate.getDate() + 1);
  }
  return dueDate;
}

/**
 * Calculates next billing date by advancing by the plan's frequency
 */
export function advanceBillingDate(currentDate: Date, frequency: BillingFrequency): Date {
  const nextDate = new Date(currentDate);
  switch (frequency) {
    case BillingFrequency.DAILY:
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case BillingFrequency.WEEKLY:
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case BillingFrequency.MONTHLY:
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case BillingFrequency.YEARLY:
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1);
  }
  return nextDate;
}

/**
 * Evaluates and applies discount rule
 */
export async function evaluateDiscount(
  discountCode: string | null | undefined,
  subtotal: number,
  totalQuantity: number,
  lineItems: { productId: string; amount: number; quantity: number }[]
): Promise<{ discountAmount: number; discountId: string | null; ruleCode: string | null }> {
  if (!discountCode || discountCode.trim() === "") {
    return { discountAmount: 0, discountId: null, ruleCode: null };
  }

  const rule = await prisma.discountRule.findUnique({
    where: { code: discountCode.trim().toUpperCase() },
  });

  if (!rule) {
    return { discountAmount: 0, discountId: null, ruleCode: null };
  }

  const now = new Date();

  // Validate dates
  if (rule.startDate && now < rule.startDate) {
    return { discountAmount: 0, discountId: null, ruleCode: null };
  }
  if (rule.endDate && now > rule.endDate) {
    return { discountAmount: 0, discountId: null, ruleCode: null };
  }

  // Validate usage limit
  if (rule.usageLimit && rule.timesUsed >= rule.usageLimit) {
    return { discountAmount: 0, discountId: null, ruleCode: null };
  }

  // Validate minimum quantity
  if (rule.minQuantity && totalQuantity < rule.minQuantity) {
    return { discountAmount: 0, discountId: null, ruleCode: null };
  }

  // Validate minimum purchase amount
  if (rule.minPurchaseAmount && subtotal < rule.minPurchaseAmount) {
    return { discountAmount: 0, discountId: null, ruleCode: null };
  }

  // Calculate discount value
  let eligibleSubtotal = subtotal;

  if (rule.targetType === DiscountTarget.SPECIFIC_PRODUCT && rule.targetProductId) {
    // Only apply to matching product lines
    const matchingLines = lineItems.filter((l) => l.productId === rule.targetProductId);
    eligibleSubtotal = matchingLines.reduce((sum, l) => sum + l.amount, 0);
    if (eligibleSubtotal <= 0) {
      return { discountAmount: 0, discountId: null, ruleCode: null };
    }
  }

  let calculatedDiscount = 0;
  if (rule.type === DiscountType.PERCENTAGE) {
    calculatedDiscount = (eligibleSubtotal * rule.value) / 100;
  } else {
    // Fixed amount
    calculatedDiscount = Math.min(rule.value, eligibleSubtotal);
  }

  return {
    discountAmount: Math.round(calculatedDiscount * 100) / 100,
    discountId: rule.id,
    ruleCode: rule.code,
  };
}

/**
 * Creates an invoice from an active subscription for a specific billing period.
 * Enforces the unique constraint on (subscriptionId, periodStart) so nothing is billed twice.
 */
export async function createInvoiceFromSubscription(
  subscriptionId: string,
  periodStart: Date,
  options?: { customNotes?: string }
) {
  // Normalize periodStart date to midnight UTC to prevent subtle millisecond mismatches
  const normalizedPeriodStart = new Date(periodStart);
  normalizedPeriodStart.setHours(0, 0, 0, 0);

  // Check if invoice already exists for this subscription and period
  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      subscriptionId,
      periodStart: normalizedPeriodStart,
    },
  });

  if (existingInvoice) {
    throw new Error(
      `Invoice already generated for subscription ${subscriptionId} for period starting ${normalizedPeriodStart.toISOString().split("T")[0]}`
    );
  }

  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      customer: true,
      plan: true,
      lines: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
  });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  if (subscription.status !== "ACTIVE") {
    throw new Error(`Cannot bill subscription in '${subscription.status}' status. Must be ACTIVE.`);
  }

  // Calculate line items, taxes and subtotal
  let subtotal = 0;
  let totalTax = 0;
  let totalQuantity = 0;

  const invoiceLinesData = subscription.lines.map((line) => {
    const lineSubtotal = line.unitPrice * line.quantity;
    const lineTax = (lineSubtotal * line.taxRate) / 100;

    subtotal += lineSubtotal;
    totalTax += lineTax;
    totalQuantity += line.quantity;

    const variantLabel = line.variant ? ` (${line.variant.name})` : "";
    const description = `${line.product.name}${variantLabel} - ${subscription.plan.name}`;

    return {
      productId: line.productId,
      description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxRate: line.taxRate,
      amount: lineSubtotal,
    };
  });

  // Calculate discounts
  const discountResult = await evaluateDiscount(
    subscription.discountCode,
    subtotal,
    totalQuantity,
    subscription.lines.map((l) => ({
      productId: l.productId,
      amount: l.unitPrice * l.quantity,
      quantity: l.quantity,
    }))
  );

  const discountAmount = discountResult.discountAmount;
  const totalAmount = Math.max(0, subtotal + totalTax - discountAmount);
  const invoiceNumber = await generateInvoiceNumber();
  const dueDate = calculateDueDate(normalizedPeriodStart, subscription.paymentTerms);

  // Execute invoice creation and discount usage increment in a transaction
  const invoice = await prisma.$transaction(async (tx) => {
    const createdInvoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        customerId: subscription.customerId,
        subscriptionId: subscription.id,
        periodStart: normalizedPeriodStart,
        periodEnd: advanceBillingDate(normalizedPeriodStart, subscription.plan.frequency),
        status: InvoiceStatus.DRAFT,
        invoiceDate: new Date(),
        dueDate,
        subtotal: Math.round(subtotal * 100) / 100,
        taxAmount: Math.round(totalTax * 100) / 100,
        discountAmount: Math.round(discountAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        notes:
          options?.customNotes ||
          `Automated billing for ${subscription.subscriptionNumber} (${subscription.plan.name}). Terms: ${subscription.paymentTerms}.`,
        lines: {
          create: invoiceLinesData,
        },
      },
      include: {
        customer: true,
        lines: { include: { product: true } },
        subscription: { include: { plan: true } },
      },
    });

    // Increment discount usage if applied
    if (discountResult.discountId) {
      await tx.discountRule.update({
        where: { id: discountResult.discountId },
        data: { timesUsed: { increment: 1 } },
      });
    }

    // Update subscription's lastBilledDate
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        lastBilledDate: new Date(),
      },
    });

    return createdInvoice;
  });

  return invoice;
}

/**
 * Billing Run engine:
 * Finds all active subscriptions whose nextBillingDate is due (<= today).
 * Generates their invoices and advances nextBillingDate.
 */
export async function executeBillingRun() {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Due through end of today

  // Find due active subscriptions
  const dueSubscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      nextBillingDate: { lte: today },
    },
    include: {
      plan: true,
      customer: true,
    },
  });

  const results = {
    totalEvaluated: dueSubscriptions.length,
    invoicesCreated: 0,
    skipped: 0,
    invoices: [] as any[],
    errors: [] as { subscriptionNumber: string; error: string }[],
  };

  for (const sub of dueSubscriptions) {
    try {
      const periodStart = sub.nextBillingDate;
      const invoice = await createInvoiceFromSubscription(sub.id, periodStart);

      // Advance next billing date
      const advancedBillingDate = advanceBillingDate(sub.nextBillingDate, sub.plan.frequency);

      // Check if subscription has expired and should auto-close
      const shouldAutoClose =
        sub.plan.autoClose && sub.expiryDate && advancedBillingDate > sub.expiryDate;

      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          nextBillingDate: advancedBillingDate,
          status: shouldAutoClose ? "CLOSED" : sub.status,
        },
      });

      results.invoicesCreated += 1;
      results.invoices.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: sub.customer.name,
        amount: invoice.totalAmount,
        subscriptionNumber: sub.subscriptionNumber,
      });
    } catch (err: any) {
      // If error is unique constraint duplicate, note as skipped
      if (err.message && err.message.includes("already generated")) {
        results.skipped += 1;
      } else {
        results.errors.push({
          subscriptionNumber: sub.subscriptionNumber,
          error: err.message || "Failed to generate invoice",
        });
      }
    }
  }

  return results;
}
