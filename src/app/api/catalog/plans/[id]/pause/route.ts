import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatPlan } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// POST /catalog/plans/{id}/pause (and /api/catalog/plans/{id}/pause)
// Only allowed if the plan's pausable (canPause) flag permits it.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const plan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Check pausable flag permission
    if (!plan.canPause) {
      return NextResponse.json(
        {
          error: "Plan action not permitted: pausable flag is disabled for this plan",
          allowed: false,
          flag: "pausable",
          plan: formatPlan(plan),
        },
        { status: 400 }
      );
    }

    // Permitted: pause the plan
    const updated = await prisma.plan.update({
      where: { id },
      data: { status: "PAUSED" },
    });

    return NextResponse.json({
      message: "Plan paused successfully",
      action: "pause",
      success: true,
      plan: formatPlan(updated),
    });
  } catch (error: any) {
    console.error("Pause plan error:", error);
    return NextResponse.json({ error: "Failed to pause plan" }, { status: 500 });
  }
}
