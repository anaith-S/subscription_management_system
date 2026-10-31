import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { get_current_user } from "@/lib/deps";
import { SubscriptionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["QUOTATION", "CONFIRMED"],
  QUOTATION: ["CONFIRMED", "CLOSED"],
  CONFIRMED: ["ACTIVE", "CLOSED"],
  ACTIVE: ["PAUSED", "CLOSED"],
  PAUSED: ["ACTIVE", "CLOSED"],
  CLOSED: ["DRAFT", "QUOTATION"], // Re-open as new quote
};

// PATCH /api/subscriptions/[id]/status - Execute state transition
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await get_current_user(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const targetStatus = String(body.status || "").trim().toUpperCase();

    const subscription = await prisma.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const currentStatus = subscription.status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(targetStatus)) {
      return NextResponse.json(
        {
          error: `Invalid state transition from ${currentStatus} to ${targetStatus}. Allowed: [${allowed.join(", ")}]`,
          currentStatus,
          targetStatus,
          allowed,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: targetStatus as SubscriptionStatus },
      include: {
        customer: true,
        plan: true,
        lines: { include: { product: true, variant: true } },
      },
    });

    return NextResponse.json({
      message: `Status transitioned: ${currentStatus} ➔ ${targetStatus}`,
      subscription: updated,
    });
  } catch (error: any) {
    console.error("Subscription status transition error:", error);
    return NextResponse.json({ error: "Failed to transition status" }, { status: 500 });
  }
}
