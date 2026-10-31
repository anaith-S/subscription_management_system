import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/deps";
import { transitionSubscription } from "@/lib/subscription-service";
import { SubscriptionStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { targetStatus } = body;

    if (!targetStatus) {
      return NextResponse.json({ error: "targetStatus is required" }, { status: 400 });
    }

    const normalizedStatus = targetStatus.toUpperCase() as SubscriptionStatus;
    if (!Object.values(SubscriptionStatus).includes(normalizedStatus)) {
      return NextResponse.json({ error: `Invalid status: ${targetStatus}` }, { status: 400 });
    }

    const updated = await transitionSubscription(id, normalizedStatus, user);

    return NextResponse.json({
      message: `Subscription transitioned to ${normalizedStatus} successfully`,
      subscription: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to transition subscription status" },
      { status: 400 }
    );
  }
}
