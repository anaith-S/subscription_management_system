import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { require_role } from "@/lib/deps";

export const dynamic = "force-dynamic";

// GET /api/catalog/products/[id]/variants - List variants for a product
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const variants = await prisma.productVariant.findMany({
      where: { productId: id },
      orderBy: { createdAt: "asc" },
    });

    const formatted = variants.map((v) => ({
      id: v.id,
      productId: v.productId,
      product_id: v.productId,
      attribute: v.attribute,
      value: v.value,
      name: v.name || (v.attribute && v.value ? `${v.attribute}: ${v.value}` : "Standard"),
      extra_price: v.extraPrice,
      extraPrice: v.extraPrice,
      createdAt: v.createdAt,
    }));

    return NextResponse.json({ variants: formatted });
  } catch (error: any) {
    console.error("List variants error:", error);
    return NextResponse.json({ error: "Failed to fetch variants" }, { status: 500 });
  }
}

// POST /api/catalog/products/[id]/variants - Admin only: Add variant to product
// Accepts: attribute, value, extra_price (e.g. brand = Odoo, +560)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const checkRole = require_role("ADMIN");
    const { error } = await checkRole(req);
    if (error) return error;

    const { id: productId } = await params;
    const body = await req.json();

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const {
      attribute,
      value,
      name,
      extra_price,
      extraPrice,
    } = body;

    const finalExtraPrice = Number(extra_price ?? extraPrice ?? 0);
    const attr = attribute ? String(attribute).trim() : null;
    const val = value ? String(value).trim() : null;
    const variantName = name ? String(name).trim() : attr && val ? `${attr} = ${val}` : "Variant";

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        attribute: attr,
        value: val,
        name: variantName,
        extraPrice: finalExtraPrice,
      },
    });

    return NextResponse.json(
      {
        message: "Product variant created successfully",
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
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create variant error:", error);
    return NextResponse.json({ error: "Failed to create variant" }, { status: 500 });
  }
}
