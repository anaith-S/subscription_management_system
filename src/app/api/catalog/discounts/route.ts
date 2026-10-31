import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { require_role } from "@/lib/deps";
import { formatDiscount } from "@/lib/catalog";
import { DiscountType, DiscountTarget } from "@prisma/client";

export const dynamic = "force-dynamic";

function mapDiscountType(typeStr?: string): DiscountType {
  const norm = String(typeStr || "PERCENTAGE").trim().toUpperCase();
  if (norm === "FIXED") return DiscountType.FIXED;
  return DiscountType.PERCENTAGE;
}

function mapDiscountScope(scopeStr?: string): DiscountTarget {
  const norm = String(scopeStr || "WHOLE_SUBSCRIPTION").trim().toUpperCase();
  if (norm === "PRODUCT" || norm === "SPECIFIC_PRODUCT") {
    return DiscountTarget.SPECIFIC_PRODUCT;
  }
  return DiscountTarget.WHOLE_SUBSCRIPTION;
}


// GET /api/catalog/discounts - Admin only (or Staff for quote creation)
export async function GET(req: Request) {
  try {
    const checkRole = require_role("ADMIN", "STAFF");
    const { error } = await checkRole(req);
    if (error) return error;

    const discounts = await prisma.discountRule.findMany({
      include: {
        targetProduct: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      discounts: discounts.map(formatDiscount),
    });
  } catch (error: any) {
    console.error("List discounts error:", error);
    return NextResponse.json({ error: "Failed to fetch discounts" }, { status: 500 });
  }
}

// POST /api/catalog/discounts - Admin only
export async function POST(req: Request) {
  try {
    const checkRole = require_role("ADMIN");
    const { error } = await checkRole(req);
    if (error) return error;

    const body = await req.json();
    const {
      type,
      discount_type,
      value,
      min_purchase,
      minPurchaseAmount,
      min_quantity,
      minQuantity,
      start_date,
      startDate,
      end_date,
      endDate,
      usage_limit,
      usageLimit,
      used_count,
      timesUsed,
      applies_to,
      scope,
      targetType,
      product_id,
      productId,
      targetProductId,
      code,
      name,
    } = body;

    const finalType = mapDiscountType(type ?? discount_type);
    const finalValue = Number(value ?? 0);

    if (isNaN(finalValue) || finalValue < 0) {
      return NextResponse.json({ error: "Valid discount value is required" }, { status: 400 });
    }

    const finalScope = mapDiscountScope(applies_to ?? scope ?? targetType);
    const targetProdId = product_id ?? productId ?? targetProductId ?? null;

    if (finalScope === DiscountTarget.SPECIFIC_PRODUCT && !targetProdId) {
      return NextResponse.json(
        { error: "product_id is required when scope is set to 'product'" },
        { status: 400 }
      );
    }

    // Verify product exists if product_id passed
    if (targetProdId) {
      const prodExists = await prisma.product.findUnique({
        where: { id: targetProdId },
      });
      if (!prodExists) {
        return NextResponse.json({ error: "Target product does not exist" }, { status: 404 });
      }
    }

    const finalCode = code ? String(code).trim().toUpperCase() : `DISCOUNT_${Date.now().toString(36).toUpperCase()}`;
    const finalName = name ? String(name).trim() : `${finalType === DiscountType.PERCENTAGE ? `${finalValue}% Off` : `$${finalValue} Off`} Discount`;

    const discount = await prisma.discountRule.create({
      data: {
        code: finalCode,
        name: finalName,
        type: finalType,
        value: finalValue,
        minPurchaseAmount: min_purchase !== undefined || minPurchaseAmount !== undefined ? Number(min_purchase ?? minPurchaseAmount) : null,
        minQuantity: min_quantity !== undefined || minQuantity !== undefined ? Number(min_quantity ?? minQuantity) : null,
        startDate: start_date || startDate ? new Date(start_date || startDate) : null,
        endDate: end_date || endDate ? new Date(end_date || endDate) : null,
        usageLimit: usage_limit !== undefined || usageLimit !== undefined ? Number(usage_limit ?? usageLimit) : null,
        timesUsed: Number(used_count ?? timesUsed ?? 0),
        targetType: finalScope,
        targetProductId: finalScope === DiscountTarget.SPECIFIC_PRODUCT ? targetProdId : null,
      },
      include: {
        targetProduct: true,
      },
    });

    return NextResponse.json(
      { message: "Discount created successfully", discount: formatDiscount(discount) },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create discount error:", error);
    return NextResponse.json({ error: "Failed to create discount" }, { status: 500 });
  }
}
