import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/deps";
import { errorResponse } from "@/lib/errors";

// GET /api/subscriptions/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: true,
        lines: {
          include: {
            product: { include: { variants: true } },
            variant: true,
          },
        },
        invoices: {
          include: {
            payments: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Customer scoping check
    if (user.role === "CUSTOMER" && subscription.customerId !== user.id) {
      return NextResponse.json({ error: "Forbidden: You can only view your own subscription" }, { status: 403 });
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    return errorResponse(error, "Failed to fetch subscription");
  }
}
