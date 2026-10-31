import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculate_unit_price, close_expired_plans } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/**
 * GET /api/catalog/dropdowns
 * Combined read-only products + variants and active plans endpoint for Member 3's forms.
 */
export async function GET() {
  try {
    await close_expired_plans();

    const [products, plans] = await Promise.all([
      prisma.product.findMany({
        include: {
          variants: {
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.plan.findMany({
        where: {
          status: { in: ["ACTIVE", "active"] },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const formattedProducts = products.map((p) => {
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

    const formattedPlans = plans.map((pl) => ({
      id: pl.id,
      name: pl.name,
      price: pl.cost,
      cost: pl.cost,
      billing_period: pl.frequency,
      frequency: pl.frequency,
      min_quantity: pl.minQuantity,
      minQuantity: pl.minQuantity,
      label: `${pl.name} - $${pl.cost} / ${pl.frequency.toLowerCase()}`,
      auto_close: pl.autoClose,
      closable: pl.canCloseEarly,
      pausable: pl.canPause,
      renewable: pl.canRenew,
      status: pl.status,
    }));

    return NextResponse.json({
      products: formattedProducts,
      plans: formattedPlans,
    });
  } catch (error: any) {
    console.error("Combined dropdown error:", error);
    return NextResponse.json({ error: "Failed to fetch catalog dropdown data" }, { status: 500 });
  }
}
