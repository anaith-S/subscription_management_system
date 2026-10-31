import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, customerScopingHelper } from "@/lib/deps";
import { AppError, errorResponse } from "@/lib/errors";
import { InvoiceStatus, Prisma } from "@prisma/client";
import { parsePagination, parseSearch } from "@/lib/pagination";

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

    const search = parseSearch(searchParams);
    if (search) {
      whereFilter.OR = [
        { invoiceNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { email: { contains: search } } },
      ];
    }
    const where = whereFilter as Prisma.InvoiceWhereInput;
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    const [invoices, total] = await prisma.$transaction([
      prisma.invoice.findMany({
      where,
      skip,
      take,
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
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({ invoices, total, page, pageSize });
  } catch (error) {
    return errorResponse(error, "Failed to fetch invoices");
  }
}
