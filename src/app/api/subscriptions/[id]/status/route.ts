import { NextResponse } from "next/server";
import { require_role } from "@/lib/deps";
import { transitionSubscription } from "@/lib/subscription-service";
import { AppError, errorResponse } from "@/lib/errors";
import { SubscriptionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// PATCH /api/subscriptions/[id]/status - Execute state transition (Admin / Staff only).
// Same rules as POST /api/subscriptions/[id]/transition: one state machine, in
// subscription-service.ts, so the two endpoints can never disagree.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await require_role("ADMIN", "STAFF")(req);
    if (error || !user) return error;

    const { id } = await params;
    const body = await req.json();
    const targetStatus = String(body.status ?? body.targetStatus ?? "").trim().toUpperCase();

    if (!Object.values(SubscriptionStatus).includes(targetStatus as SubscriptionStatus)) {
      throw new AppError(`Invalid status: ${targetStatus || "(missing)"}`);
    }

    const previous = await transitionSubscription(id, targetStatus as SubscriptionStatus, user);

    return NextResponse.json({
      message: `Status transitioned to ${targetStatus}`,
      subscription: previous,
    });
  } catch (error) {
    return errorResponse(error, "Failed to transition status");
  }
}
