import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { get_current_user, customer_scoping_helper } from "@/lib/deps";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await get_current_user(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Apply customer scoping helper:
    // If user is a customer, only returns their own records
    const subFilter = customer_scoping_helper(user, {});
    const invFilter = customer_scoping_helper(user, {});

    // Ensure we filter by customerId for Prisma
    const whereSub: Prisma.SubscriptionWhereInput = {};
    if (subFilter.customerId) {
      whereSub.customerId = subFilter.customerId;
    }

    const whereInv: Prisma.InvoiceWhereInput = {};
    if (invFilter.customerId) {
      whereInv.customerId = invFilter.customerId;
    }

    const [subscriptions, invoices] = await Promise.all([
      prisma.subscription.findMany({
        where: whereSub,
        include: {
          plan: true,
          lines: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoice.findMany({
        where: whereInv,
        include: {
          lines: true,
          payments: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      subscriptions,
      invoices,
    });
  } catch (error: unknown) {
    console.error("Portal data error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching portal data" },
      { status: 500 }
    );
  }
}
