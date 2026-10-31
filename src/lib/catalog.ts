import { prisma } from "@/lib/prisma";
import { DiscountRule, Plan } from "@prisma/client";

/**
 * Price helper: final unit price = base price + variant extra price
 */
export function calculate_unit_price(basePrice: number, variantExtraPrice?: number | null): number {
  const base = typeof basePrice === "number" && !isNaN(basePrice) ? basePrice : 0;
  const extra = typeof variantExtraPrice === "number" && !isNaN(variantExtraPrice) ? variantExtraPrice : 0;
  return Number((base + extra).toFixed(2));
}

export const calculateUnitPrice = calculate_unit_price;

/**
 * Plan auto-close helper:
 * Closes plans past their end date when auto_close is true.
 * Called automatically when listing plans or via the auto-close endpoint.
 */
export async function close_expired_plans(now: Date = new Date()): Promise<Plan[]> {
  // Find all plans with autoClose true, an endDate in the past, and not yet closed
  const expiredPlans = await prisma.plan.findMany({
    where: {
      autoClose: true,
      endDate: {
        lt: now,
      },
      status: {
        not: "CLOSED",
      },
    },
  });

  if (expiredPlans.length === 0) {
    return [];
  }

  const expiredIds = expiredPlans.map((p) => p.id);

  await prisma.plan.updateMany({
    where: {
      id: { in: expiredIds },
    },
    data: {
      status: "CLOSED",
    },
  });

  return prisma.plan.findMany({
    where: { id: { in: expiredIds } },
  });
}

export const closeExpiredPlans = close_expired_plans;

export interface SubscriptionLineInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  amount?: number;
  variantId?: string | null;
  [key: string]: any;
}

export interface SubscriptionInput {
  id?: string;
  customerId?: string;
  planId?: string;
  discountCode?: string | null;
  discount_code?: string | null;
  lines?: SubscriptionLineInput[];
  [key: string]: any;
}

/**
 * Helper get_applicable_discounts(subscription, lines, today)
 * Returns valid discounts:
 *  - Dates OK: today >= start_date (if set) and today <= end_date (if set)
 *  - Usage not exhausted: timesUsed < usageLimit (if limit set)
 *  - Minimums met:
 *      * min_quantity: total quantity for the target meets or exceeds threshold
 *      * min_purchase: total purchase amount for the target meets or exceeds threshold
 *  - Scope: product (only target product lines count) or whole subscription (all lines count)
 *  - Code: if subscription has a discountCode, filters for that code, otherwise returns eligible rules
 *
 * Member 3 calls this during invoicing.
 */
export async function get_applicable_discounts(
  subscription: SubscriptionInput,
  lines: SubscriptionLineInput[],
  today: Date = new Date(),
  preloadedDiscounts?: DiscountRule[]
): Promise<DiscountRule[]> {
  const currentDate = new Date(today);
  const code = (subscription.discountCode || subscription.discount_code || "").trim();

  // Load active discounts or use preloaded
  const allDiscounts = preloadedDiscounts ?? (await prisma.discountRule.findMany());

  const applicable: DiscountRule[] = [];

  for (const discount of allDiscounts) {
    // 1. Discount Code matching:
    // If a specific code was entered by the user, only consider matching discounts.
    // If no code was entered, consider discounts that don't have a unique mandatory code or general promotions.
    if (code) {
      if (!discount.code || discount.code.toUpperCase() !== code.toUpperCase()) {
        continue;
      }
    }

    // 2. Dates OK
    if (discount.startDate && currentDate < new Date(discount.startDate)) {
      continue;
    }
    if (discount.endDate) {
      // Compare including the whole end date day
      const end = new Date(discount.endDate);
      if (currentDate > end) {
        continue;
      }
    }

    // 3. Usage not exhausted
    if (discount.usageLimit !== null && discount.usageLimit !== undefined) {
      if (discount.timesUsed >= discount.usageLimit) {
        continue;
      }
    }

    // 4. Minimums & Scope calculation
    const isProductScope =
      discount.targetType === "SPECIFIC_PRODUCT" ||
      (discount as any).appliesTo === "product" ||
      (discount as any).applies_to === "product" ||
      Boolean(discount.targetProductId);

    let targetLines: SubscriptionLineInput[] = [];

    if (isProductScope) {
      const targetProdId = discount.targetProductId;
      targetLines = (lines || []).filter((l) => l.productId === targetProdId);
      // If scoped to a product that is not in the subscription lines, it doesn't apply
      if (targetLines.length === 0) {
        continue;
      }
    } else {
      targetLines = lines || [];
    }

    const totalQty = targetLines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0);
    const totalAmount = targetLines.reduce((acc, l) => {
      const lineAmt = typeof l.amount === "number" ? l.amount : (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
      return acc + lineAmt;
    }, 0);

    // Minimum quantity check
    if (discount.minQuantity !== null && discount.minQuantity !== undefined) {
      if (totalQty < discount.minQuantity) {
        continue;
      }
    }

    // Minimum purchase amount check
    if (discount.minPurchaseAmount !== null && discount.minPurchaseAmount !== undefined) {
      if (totalAmount < discount.minPurchaseAmount) {
        continue;
      }
    }

    applicable.push(discount);
  }

  return applicable;
}

export const getApplicableDiscounts = get_applicable_discounts;

/**
 * Helper to compute the monetary discount value from a discount rule
 */
export function calculate_discount_amount(
  discount: DiscountRule,
  lines: SubscriptionLineInput[],
  subtotal?: number
): number {
  const isProductScope =
    discount.targetType === "SPECIFIC_PRODUCT" ||
    (discount as any).appliesTo === "product" ||
    (discount as any).applies_to === "product" ||
    Boolean(discount.targetProductId);

  let eligibleAmount = 0;
  if (isProductScope) {
    const targetProdId = discount.targetProductId;
    const targetLines = (lines || []).filter((l) => l.productId === targetProdId);
    eligibleAmount = targetLines.reduce((acc, l) => {
      const amt = typeof l.amount === "number" ? l.amount : (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
      return acc + amt;
    }, 0);
  } else {
    eligibleAmount =
      typeof subtotal === "number"
        ? subtotal
        : (lines || []).reduce((acc, l) => {
            const amt = typeof l.amount === "number" ? l.amount : (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
            return acc + amt;
          }, 0);
  }

  if (eligibleAmount <= 0) return 0;

  let discountVal = 0;
  if (discount.type === "PERCENTAGE") {
    discountVal = eligibleAmount * (discount.value / 100);
  } else {
    // FIXED
    discountVal = Math.min(discount.value, eligibleAmount);
  }

  return Number(discountVal.toFixed(2));
}

export const calculateDiscountAmount = calculate_discount_amount;

/**
 * Serializer helpers for API responses
 */
export function formatPlan(p: any) {
  return {
    id: p.id,
    name: p.name,
    price: p.cost,
    cost: p.cost,
    billing_period: p.frequency ? p.frequency.toLowerCase() : "monthly",
    frequency: p.frequency,
    min_quantity: p.minQuantity,
    minQuantity: p.minQuantity,
    start_date: p.startDate,
    startDate: p.startDate,
    end_date: p.endDate,
    endDate: p.endDate,
    auto_close: p.autoClose,
    autoClose: p.autoClose,
    closable: p.canCloseEarly,
    canCloseEarly: p.canCloseEarly,
    pausable: p.canPause,
    canPause: p.canPause,
    renewable: p.canRenew,
    canRenew: p.canRenew,
    status: p.status || "ACTIVE",
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function formatTax(t: any) {
  return {
    id: t.id,
    name: t.name,
    percentage: t.ratePercentage,
    ratePercentage: t.ratePercentage,
    is_default: t.isDefault,
    isDefault: t.isDefault,
    createdAt: t.createdAt,
  };
}

export function formatDiscount(d: any) {
  const isProduct = d.targetType === "SPECIFIC_PRODUCT" || Boolean(d.targetProductId);
  return {
    id: d.id,
    code: d.code,
    name: d.name,
    type: d.type === "FIXED" ? "fixed" : "percentage",
    discount_type: d.type === "FIXED" ? "fixed" : "percentage",
    value: d.value,
    min_purchase: d.minPurchaseAmount,
    minPurchaseAmount: d.minPurchaseAmount,
    min_quantity: d.minQuantity,
    minQuantity: d.minQuantity,
    start_date: d.startDate,
    startDate: d.startDate,
    end_date: d.endDate,
    endDate: d.endDate,
    usage_limit: d.usageLimit,
    usageLimit: d.usageLimit,
    used_count: d.timesUsed,
    timesUsed: d.timesUsed,
    applies_to: isProduct ? "product" : "whole_subscription",
    targetType: d.targetType,
    product_id: d.targetProductId,
    targetProductId: d.targetProductId,
    targetProduct: d.targetProduct,
    createdAt: d.createdAt,
  };
}
