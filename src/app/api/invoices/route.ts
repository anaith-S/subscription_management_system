import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, customerScopingHelper } from "@/lib/deps";
import { AppError, errorResponse } from "@/lib/errors";
import { InvoiceStatus } from "@prisma/client";

// GET /api/invoices - List invoices filterable by status and customer
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const customerIdParam = searchParams.get("customerId");

    let whereFilter: Record<string, unknown> = {};
    if (statusParam) {
      if (!Object.values(InvoiceStatus).includes(statusParam as InvoiceStatus)) {
        throw new AppError(`Invalid status filter: ${statusParam}`);
      }
      whereFilter.status = statusParam;
    }
    if (customerIdParam && user.role !== "CUSTOMER") {
      whereFilter.customerId = customerIdParam;
    }

    // Apply customer scoping: Customers can only view their own invoices
    whereFilter = customerScopingHelper(user, whereFilter);
    delete whereFilter.customer_id; // snake_case alias isn't a Prisma field

    const invoices = await prisma.invoice.findMany({
      where: whereFilter,
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        subscription: {
          select: { id: true, subscriptionNumber: true, plan: { select: { name: true } } },
        },
        lines: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    return errorResponse(error, "Failed to fetch invoices");
  }
}
