import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatPlan } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// POST /catalog/plans/{id}/renew (and /api/catalog/plans/{id}/renew)
// Only allowed if the plan's renewable (canRenew) flag permits it.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const plan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Check renewable flag permission
    if (!plan.canRenew) {
      return NextResponse.json(
        {
          error: "Plan action not permitted: renewable flag is disabled for this plan",
          allowed: false,
          flag: "renewable",
          plan: formatPlan(plan),
        },
        { status: 400 }
      );
    }

    // Permitted: renew the plan back to ACTIVE
    const updated = await prisma.plan.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    return NextResponse.json({
      message: "Plan renewed successfully",
      action: "renew",
      success: true,
      plan: formatPlan(updated),
    });
  } catch (error: any) {
    console.error("Renew plan error:", error);
    return NextResponse.json({ error: "Failed to renew plan" }, { status: 500 });
  }
}
