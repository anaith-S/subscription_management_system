import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { require_role, get_current_user } from "@/lib/deps";

export const dynamic = "force-dynamic";

// GET /api/catalog/products - List all products with their variants
export async function GET(req: Request) {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      sales_price: p.salesPrice,
      salesPrice: p.salesPrice,
      cost_price: p.costPrice,
      costPrice: p.costPrice,
      notes: p.notes,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      variants: p.variants.map((v) => ({
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
    }));

    return NextResponse.json({ products: formatted });
  } catch (error: any) {
    console.error("List products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST /api/catalog/products - Admin only: Create a product
export async function POST(req: Request) {
  try {
    const checkRole = require_role("ADMIN");
    const { error } = await checkRole(req);
    if (error) return error;

    const body = await req.json();
    const {
      name,
      type = "Software",
      sales_price,
      salesPrice,
      cost_price,
      costPrice,
      notes,
      variants,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const finalSalesPrice = Number(sales_price ?? salesPrice ?? 0);
    const finalCostPrice = Number(cost_price ?? costPrice ?? 0);

    const initialVariants = Array.isArray(variants)
      ? variants.map((v: any) => ({
          attribute: v.attribute || null,
          value: v.value || null,
          name: v.name || (v.attribute && v.value ? `${v.attribute}: ${v.value}` : "Default Variant"),
          extraPrice: Number(v.extra_price ?? v.extraPrice ?? 0),
        }))
      : [];

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        type: (type || "Software").trim(),
        salesPrice: finalSalesPrice,
        costPrice: finalCostPrice,
        notes: notes ? String(notes).trim() : null,
        variants: initialVariants.length > 0 ? { create: initialVariants } : undefined,
      },
      include: {
        variants: true,
      },
    });

    const responseData = {
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
        name: v.name,
        extra_price: v.extraPrice,
        extraPrice: v.extraPrice,
        createdAt: v.createdAt,
      })),
    };

    return NextResponse.json(
      { message: "Product created successfully", product: responseData },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create product error:", error);
    return NextResponse.json({ error: "Internal server error creating product" }, { status: 500 });
  }
}
