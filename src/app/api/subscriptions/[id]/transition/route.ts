import { NextRequest, NextResponse } from "next/server";
import { require_role } from "@/lib/deps";
import { transitionSubscription } from "@/lib/subscription-service";
import { AppError, errorResponse } from "@/lib/errors";
import { SubscriptionStatus } from "@prisma/client";

// POST /api/subscriptions/[id]/transition - Admin / Staff only
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await require_role("ADMIN", "STAFF")(req);
    if (error || !user) return error;

    const { id } = await params;
    const { targetStatus } = await req.json();

    if (typeof targetStatus !== "string" || !targetStatus) {
      throw new AppError("targetStatus is required");
    }

    const normalizedStatus = targetStatus.toUpperCase() as SubscriptionStatus;
    if (!Object.values(SubscriptionStatus).includes(normalizedStatus)) {
      throw new AppError(`Invalid status: ${targetStatus}`);
    }

    const updated = await transitionSubscription(id, normalizedStatus, user);

    return NextResponse.json({
      message: `Subscription transitioned to ${normalizedStatus} successfully`,
      subscription: updated,
    });
  } catch (error) {
    return errorResponse(error, "Failed to transition subscription status");
  }
}
