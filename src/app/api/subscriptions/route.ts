import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, customerScopingHelper } from "@/lib/deps";
import { generateSubscriptionNumber } from "@/lib/subscription-service";
import { SubscriptionStatus } from "@prisma/client";

// GET /api/subscriptions - List subscriptions (filtered by status and customer)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as SubscriptionStatus | null;
    const customerIdParam = searchParams.get("customerId");

    // Base filter
    let whereFilter: any = {};
    if (status) {
      whereFilter.status = status;
    }
    if (customerIdParam && user.role !== "CUSTOMER") {
      whereFilter.customerId = customerIdParam;
    }

    // Apply customer scoping: Customers can only ever see their own subscriptions
    whereFilter = customerScopingHelper(user, whereFilter);

    const subscriptions = await prisma.subscription.findMany({
      where: whereFilter,
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
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ subscriptions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch subscriptions" }, { status: 500 });
  }
}

// POST /api/subscriptions - Create new subscription manually
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
      return NextResponse.json({ error: "Forbidden: Admin or Staff required" }, { status: 403 });
    }

    const body = await req.json();
    const { customerId, planId, startDate, expiryDate, paymentTerms, discountCode, lines } = body;

    if (!customerId || !planId) {
      return NextResponse.json({ error: "Customer and Plan are required" }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const subscriptionNumber = await generateSubscriptionNumber();
    const start = startDate ? new Date(startDate) : new Date();
    const expiry = expiryDate ? new Date(expiryDate) : null;

    // Default tax rate
    const defaultTax = await prisma.taxRule.findFirst({ where: { isDefault: true } });
    const taxRate = defaultTax ? defaultTax.ratePercentage : 10.0;

    const subscription = await prisma.subscription.create({
      data: {
        subscriptionNumber,
        customerId,
        planId,
        status: SubscriptionStatus.DRAFT,
        startDate: start,
        expiryDate: expiry,
        nextBillingDate: start,
        paymentTerms: paymentTerms || "Net 15",
        discountCode: discountCode || null,
        lines: {
          create: Array.isArray(lines)
            ? lines.map((l: any) => {
                const qty = Number(l.quantity) || 1;
                const price = Number(l.unitPrice) || 0.0;
                return {
                  productId: l.productId,
                  variantId: l.variantId || null,
                  quantity: qty,
                  unitPrice: price,
                  taxRate: Number(l.taxRate ?? taxRate),
                  amount: qty * price,
                };
              })
            : [],
        },
      },
      include: {
        customer: true,
        plan: true,
        lines: { include: { product: true, variant: true } },
      },
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create subscription" }, { status: 500 });
  }
}
