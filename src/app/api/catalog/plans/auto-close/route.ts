import { NextResponse } from "next/server";
import { close_expired_plans, formatPlan } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// POST /api/catalog/plans/auto-close (also supports GET)
// Closes all plans past their end date where auto_close is true
export async function POST(req: Request) {
  try {
    let now = new Date();
    try {
      const body = await req.json();
      if (body?.date) {
        now = new Date(body.date);
      }
    } catch {
      // Body may be empty, defaults to current time
    }

    const closedPlans = await close_expired_plans(now);

    return NextResponse.json({
      message: `Successfully processed auto-close: ${closedPlans.length} plan(s) closed`,
      closed_count: closedPlans.length,
      closed_plans: closedPlans.map(formatPlan),
    });
  } catch (error: any) {
    console.error("Auto-close plans error:", error);
    return NextResponse.json({ error: "Failed to process auto-close" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
