import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { require_role } from "@/lib/deps";
import { formatPlan } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// POST /catalog/plans/{id}/close (and /api/catalog/plans/{id}/close)
// Only allowed if the plan's closable (canCloseEarly) flag permits it.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const plan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Check closable flag permission
    if (!plan.canCloseEarly) {
      return NextResponse.json(
        {
          error: "Plan action not permitted: closable flag is disabled for this plan",
          allowed: false,
          flag: "closable",
          plan: formatPlan(plan),
        },
        { status: 400 }
      );
    }

    // Permitted: close the plan
    const updated = await prisma.plan.update({
      where: { id },
      data: { status: "CLOSED" },
    });

    return NextResponse.json({
      message: "Plan closed successfully",
      action: "close",
      success: true,
      plan: formatPlan(updated),
    });
  } catch (error: any) {
    console.error("Close plan error:", error);
    return NextResponse.json({ error: "Failed to close plan" }, { status: 500 });
  }
}
