import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { require_role } from "@/lib/deps";
import { errorResponse } from "@/lib/errors";
import { SubscriptionStatus } from "@prisma/client";

/**
 * GET /api/reports/subscriptions:
 * Paginated list of active (or status-filtered) subscriptions for reports.
 * Filters: status, customerId, page, pageSize.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await require_role("ADMIN", "STAFF")(req);
    if (authError || !user) return authError;
    const { searchParams } = new URL(req.url);

    const statusParam = searchParams.get("status") || searchParams.get("subscriptionStatus");
    const customerId = searchParams.get("customerId") || searchParams.get("customer_id");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || searchParams.get("page_size") || "20", 10)));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam as SubscriptionStatus;
    } else {
      where.status = SubscriptionStatus.ACTIVE;
    }

    if (user && user.role === "CUSTOMER") {
      where.customerId = user.id;
    } else if (customerId && customerId !== "ALL") {
      where.customerId = customerId;
    }

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          plan: { select: { id: true, name: true, frequency: true, cost: true } },
          lines: { select: { id: true, quantity: true, unitPrice: true, amount: true } },
        },
      }),
    ]);

    const formatted = subscriptions.map((s) => ({
      id: s.id,
      subscriptionNumber: s.subscriptionNumber,
      status: s.status,
      startDate: s.startDate,
      nextBillingDate: s.nextBillingDate,
      paymentTerms: s.paymentTerms,
      customer: s.customer,
      plan: s.plan,
      totalRecurringAmount: s.lines.reduce((sum, l) => sum + l.amount, 0),
    }));

    return NextResponse.json({
      subscriptions: formatted,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    });
  } catch (error) {
    return errorResponse(error, "Failed to fetch subscriptions report");
  }
}
