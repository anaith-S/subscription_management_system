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

// GET /api/catalog/discounts/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const discount = await prisma.discountRule.findUnique({
      where: { id },
      include: { targetProduct: true },
    });

    if (!discount) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 });
    }

    return NextResponse.json({ discount: formatDiscount(discount) });
  } catch (error: any) {
    console.error("Get discount error:", error);
    return NextResponse.json({ error: "Failed to fetch discount" }, { status: 500 });
  }
}

// PUT / PATCH /api/catalog/discounts/[id] - Admin only: Update discount
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleUpdate(req, params);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleUpdate(req, params);
}

async function handleUpdate(req: Request, paramsPromise: Promise<{ id: string }>) {
  try {
    const checkRole = require_role("ADMIN");
    const { error } = await checkRole(req);
    if (error) return error;

    const { id } = await paramsPromise;
    const body = await req.json();

    const existing = await prisma.discountRule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = String(body.name).trim();
    if (body.code !== undefined) dataToUpdate.code = String(body.code).trim().toUpperCase();
    if (body.type !== undefined || body.discount_type !== undefined) {
      dataToUpdate.type = mapDiscountType(body.type ?? body.discount_type);
    }
    if (body.value !== undefined) {
      dataToUpdate.value = Number(body.value);
    }
    if (body.min_purchase !== undefined || body.minPurchaseAmount !== undefined) {
      const v = body.min_purchase ?? body.minPurchaseAmount;
      dataToUpdate.minPurchaseAmount = v !== null ? Number(v) : null;
    }
    if (body.min_quantity !== undefined || body.minQuantity !== undefined) {
      const v = body.min_quantity ?? body.minQuantity;
      dataToUpdate.minQuantity = v !== null ? Number(v) : null;
    }
    if (body.start_date !== undefined || body.startDate !== undefined) {
      const s = body.start_date ?? body.startDate;
      dataToUpdate.startDate = s ? new Date(s) : null;
    }
    if (body.end_date !== undefined || body.endDate !== undefined) {
      const e = body.end_date ?? body.endDate;
      dataToUpdate.endDate = e ? new Date(e) : null;
    }
    if (body.usage_limit !== undefined || body.usageLimit !== undefined) {
      const u = body.usage_limit ?? body.usageLimit;
      dataToUpdate.usageLimit = u !== null ? Number(u) : null;
    }
    if (body.used_count !== undefined || body.timesUsed !== undefined) {
      dataToUpdate.timesUsed = Number(body.used_count ?? body.timesUsed);
    }
    if (body.applies_to !== undefined || body.scope !== undefined || body.targetType !== undefined) {
      dataToUpdate.targetType = mapDiscountScope(body.applies_to ?? body.scope ?? body.targetType);
    }
    if (body.product_id !== undefined || body.productId !== undefined || body.targetProductId !== undefined) {
      const pId = body.product_id ?? body.productId ?? body.targetProductId;
      dataToUpdate.targetProductId = pId || null;
    }

    const updated = await prisma.discountRule.update({
      where: { id },
      data: dataToUpdate,
      include: { targetProduct: true },
    });

    return NextResponse.json({
      message: "Discount updated successfully",
      discount: formatDiscount(updated),
    });
  } catch (error: any) {
    console.error("Update discount error:", error);
    return NextResponse.json({ error: "Failed to update discount" }, { status: 500 });
  }
}

// DELETE /api/catalog/discounts/[id] - Admin only: Delete discount
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const checkRole = require_role("ADMIN");
    const { error } = await checkRole(req);
    if (error) return error;

    const { id } = await params;
    const existing = await prisma.discountRule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 });
    }

    await prisma.discountRule.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Discount deleted successfully", id });
  } catch (error: any) {
    console.error("Delete discount error:", error);
    return NextResponse.json({ error: "Failed to delete discount" }, { status: 500 });
  }
}
