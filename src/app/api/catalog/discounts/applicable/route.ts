import { NextResponse } from "next/server";
import { get_applicable_discounts, calculate_discount_amount, formatDiscount } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// POST /api/catalog/discounts/applicable
// Evaluates which discounts apply to a given subscription & lines on a given date
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription = {}, lines = [], today } = body;

    const evaluationDate = today ? new Date(today) : new Date();

    const applicableDiscounts = await get_applicable_discounts(
      subscription,
      lines,
      evaluationDate
    );

    const formatted = applicableDiscounts.map((d) => {
      const calculatedAmt = calculate_discount_amount(d, lines, subscription.subtotal);
      return {
        ...formatDiscount(d),
        calculated_discount_amount: calculatedAmt,
      };
    });

    return NextResponse.json({
      valid_discounts: formatted,
      count: formatted.length,
      evaluated_date: evaluationDate.toISOString(),
    });
  } catch (error: any) {
    console.error("Calculate applicable discounts error:", error);
    return NextResponse.json(
      { error: "Failed to calculate applicable discounts" },
      { status: 500 }
    );
  }
}
