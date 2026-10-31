import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { require_role } from "@/lib/deps";

export const dynamic = "force-dynamic";

// GET /api/catalog/products/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const formatted = {
      id: product.id,
      name: product.name,
      type: product.type,
      sales_price: product.salesPrice,
      salesPrice: product.salesPrice,
      cost_price: product.costPrice,
      costPrice: product.costPrice,
      notes: product.notes,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      variants: product.variants.map((v) => ({
        id: v.id,
        productId: v.productId,
        product_id: v.productId,
        attribute: v.attribute,
        value: v.value,
        name: v.name || (v.attribute && v.value ? `${v.attribute}: ${v.value}` : "Standard"),
        extra_price: v.extraPrice,
        extraPrice: v.extraPrice,
        createdAt: v.createdAt,
      })),
    };

    return NextResponse.json({ product: formatted });
  } catch (error: any) {
    console.error("Get product error:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

// PUT / PATCH /api/catalog/products/[id] - Admin only: Update product
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

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = String(body.name).trim();
    if (body.type !== undefined) dataToUpdate.type = String(body.type).trim();
    if (body.sales_price !== undefined || body.salesPrice !== undefined) {
      dataToUpdate.salesPrice = Number(body.sales_price ?? body.salesPrice);
    }
    if (body.cost_price !== undefined || body.costPrice !== undefined) {
      dataToUpdate.costPrice = Number(body.cost_price ?? body.costPrice);
    }
    if (body.notes !== undefined) dataToUpdate.notes = body.notes ? String(body.notes).trim() : null;

    const updated = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
      include: { variants: true },
    });

    return NextResponse.json({
      message: "Product updated successfully",
      product: {
        id: updated.id,
        name: updated.name,
        type: updated.type,
        sales_price: updated.salesPrice,
        salesPrice: updated.salesPrice,
        cost_price: updated.costPrice,
        costPrice: updated.costPrice,
        notes: updated.notes,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        variants: updated.variants,
      },
    });
  } catch (error: any) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/catalog/products/[id] - Admin only: Delete product
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const checkRole = require_role("ADMIN");
    const { error } = await checkRole(req);
    if (error) return error;

    const { id } = await params;
    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Product deleted successfully", id });
  } catch (error: any) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
