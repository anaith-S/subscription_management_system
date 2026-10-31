import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, customerScopingHelper, require_role } from "@/lib/deps";
import { createSubscription } from "@/lib/subscription-service";
import { AppError, errorResponse, parseOptionalDate } from "@/lib/errors";
import { Prisma, SubscriptionStatus } from "@prisma/client";
import { parsePagination, parseSearch } from "@/lib/pagination";

// GET /api/subscriptions - List subscriptions (filtered by status and customer)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const customerIdParam = searchParams.get("customerId");

    // Base filter
    let whereFilter: Record<string, unknown> = {};
    if (status) {
      if (!Object.values(SubscriptionStatus).includes(status as SubscriptionStatus)) {
        throw new AppError(`Invalid status filter: ${status}`);
      }
      whereFilter.status = status;
    }
    if (customerIdParam && user.role !== "CUSTOMER") {
      whereFilter.customerId = customerIdParam;
    }

    // Apply customer scoping: Customers can only ever see their own subscriptions
    whereFilter = customerScopingHelper(user, whereFilter);
    delete whereFilter.customer_id; // snake_case alias isn't a Prisma field

    const search = parseSearch(searchParams);
    if (search) {
      whereFilter.OR = [
        { subscriptionNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { email: { contains: search } } },
      ];
    }
    const where = whereFilter as Prisma.SubscriptionWhereInput;
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    const [subscriptions, total] = await prisma.$transaction([
      prisma.subscription.findMany({
      where,
      skip,
      take,
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            invoiceDate: true,
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
      }),
      prisma.subscription.count({ where }),
    ]);

    return NextResponse.json({ subscriptions, total, page, pageSize });
  } catch (error) {
    return errorResponse(error, "Failed to fetch subscriptions");
  }
}

// POST /api/subscriptions - Create new subscription manually
export async function POST(req: NextRequest) {
  try {
    const { error } = await require_role("ADMIN", "STAFF")(req);
    if (error) return error;

    const body = await req.json();

    const subscription = await createSubscription({
      customerId: body.customerId,
      planId: body.planId,
      startDate: parseOptionalDate(body.startDate, "startDate"),
      expiryDate: parseOptionalDate(body.expiryDate, "expiryDate") ?? null,
      paymentTerms: body.paymentTerms,
      discountCode: body.discountCode,
      lines: body.lines,
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create subscription");
  }
}
