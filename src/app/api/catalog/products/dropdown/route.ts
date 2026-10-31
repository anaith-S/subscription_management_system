import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculate_unit_price } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/**
 * GET /api/catalog/products/dropdown
 * Read-only product and variant dropdown data endpoint for Member 3's forms
 * (Quotation templates, Subscriptions, Invoicing line item selection).
 */
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const dropdownOptions = products.map((p) => {
      const basePrice = p.salesPrice;
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        sales_price: basePrice,
        salesPrice: basePrice,
        cost_price: p.costPrice,
        costPrice: p.costPrice,
        variants: p.variants.map((v) => {
          const extraPrice = v.extraPrice;
          const finalPrice = calculate_unit_price(basePrice, extraPrice);
          const label = v.attribute && v.value 
            ? `${v.attribute}: ${v.value}` 
            : v.name || "Default Variant";
          return {
            id: v.id,
            productId: v.productId,
            product_id: v.productId,
            attribute: v.attribute,
            value: v.value,
            name: label,
            label: `${label} (+$${extraPrice}) - Final: $${finalPrice}`,
            extra_price: extraPrice,
            extraPrice: extraPrice,
            unit_price: finalPrice,
            unitPrice: finalPrice,
          };
        }),
      };
    });

    return NextResponse.json({ products: dropdownOptions });
  } catch (error: any) {
    console.error("Products dropdown error:", error);
    return NextResponse.json({ error: "Failed to fetch product dropdown options" }, { status: 500 });
  }
}
