import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { require_role } from "@/lib/deps";

export const dynamic = "force-dynamic";

// GET /api/catalog/variants/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    return NextResponse.json({
      variant: {
        id: variant.id,
        productId: variant.productId,
        product_id: variant.productId,
        attribute: variant.attribute,
        value: variant.value,
        name: variant.name,
        extra_price: variant.extraPrice,
        extraPrice: variant.extraPrice,
        createdAt: variant.createdAt,
        product: variant.product,
      },
    });
  } catch (error: any) {
    console.error("Get variant error:", error);
    return NextResponse.json({ error: "Failed to fetch variant" }, { status: 500 });
  }
}

// PUT / PATCH /api/catalog/variants/[id] - Admin only: Update variant
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

    const existing = await prisma.productVariant.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (body.attribute !== undefined) dataToUpdate.attribute = body.attribute ? String(body.attribute).trim() : null;
    if (body.value !== undefined) dataToUpdate.value = body.value ? String(body.value).trim() : null;
    if (body.name !== undefined) dataToUpdate.name = body.name ? String(body.name).trim() : null;
    if (body.extra_price !== undefined || body.extraPrice !== undefined) {
      dataToUpdate.extraPrice = Number(body.extra_price ?? body.extraPrice);
    }

    // Auto-update name if attribute/value changed and no explicit name given
    if (body.name === undefined && (body.attribute !== undefined || body.value !== undefined)) {
      const attr = dataToUpdate.attribute ?? existing.attribute;
      const val = dataToUpdate.value ?? existing.value;
      if (attr && val) {
        dataToUpdate.name = `${attr} = ${val}`;
      }
    }

    const updated = await prisma.productVariant.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      message: "Variant updated successfully",
      variant: {
        id: updated.id,
        productId: updated.productId,
        product_id: updated.productId,
        attribute: updated.attribute,
        value: updated.value,
        name: updated.name,
        extra_price: updated.extraPrice,
        extraPrice: updated.extraPrice,
        createdAt: updated.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Update variant error:", error);
    return NextResponse.json({ error: "Failed to update variant" }, { status: 500 });
  }
}

// DELETE /api/catalog/variants/[id] - Admin only: Delete variant
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const checkRole = require_role("ADMIN");
    const { error } = await checkRole(req);
    if (error) return error;

    const { id } = await params;
    const existing = await prisma.productVariant.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    await prisma.productVariant.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Variant deleted successfully", id });
  } catch (error: any) {
    console.error("Delete variant error:", error);
    return NextResponse.json({ error: "Failed to delete variant" }, { status: 500 });
  }
}
