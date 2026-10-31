import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { close_expired_plans } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/**
 * GET /api/catalog/plans/dropdown
 * Read-only plan dropdown data endpoint for Member 3's forms
 * (Quotation templates, Subscriptions creation/editing).
 */
export async function GET() {
  try {
    // Ensure expired auto-close plans are updated
    await close_expired_plans();

    const plans = await prisma.plan.findMany({
      where: {
        status: { in: ["ACTIVE", "active"] },
      },
      orderBy: { name: "asc" },
    });

    const dropdownOptions = plans.map((pl) => ({
      id: pl.id,
      name: pl.name,
      price: pl.cost,
      cost: pl.cost,
      billing_period: pl.frequency,
      frequency: pl.frequency,
      min_quantity: pl.minQuantity,
      minQuantity: pl.minQuantity,
      label: `${pl.name} - $${pl.cost} / ${pl.frequency.toLowerCase()} (Min: ${pl.minQuantity})`,
      auto_close: pl.autoClose,
      closable: pl.canCloseEarly,
      pausable: pl.canPause,
      renewable: pl.canRenew,
      status: pl.status,
    }));

    return NextResponse.json({ plans: dropdownOptions });
  } catch (error: any) {
    console.error("Plans dropdown error:", error);
    return NextResponse.json({ error: "Failed to fetch plan dropdown options" }, { status: 500 });
  }
}
