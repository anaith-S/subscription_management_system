import { NextRequest, NextResponse } from "next/server";
import { require_role } from "@/lib/deps";
import { errorResponse } from "@/lib/errors";
import { getOverdueInvoices } from "@/lib/payment-service";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/invoices/overdue:
 * Overdue query: invoices where due_date is before today and the status is not Paid or Cancelled.
 * Filters:
 *   - today: custom reference date (defaults to current server date)
 *   - customerId / customer_id
 *   - page, pageSize / page_size
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await require_role("ADMIN", "STAFF")(req);
    if (authError || !user) return authError;
    const { searchParams } = new URL(req.url);

    const todayParam = searchParams.get("today") || undefined;
    const customerId = searchParams.get("customerId") || searchParams.get("customer_id") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || searchParams.get("page_size") || "20", 10);

    const result = await getOverdueInvoices({
      today: todayParam,
      customerId,
      user,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Failed to fetch overdue invoices");
  }
}

/**
 * POST /api/invoices/overdue:
 * Bulk or single overdue reminder dispatch.
 * Body: { invoiceId?: string, invoiceIds?: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await require_role("ADMIN", "STAFF")(req);
    if (authError || !user) return authError;
    if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
      return NextResponse.json(
        { error: "Forbidden: Only Admin and Staff can dispatch overdue invoice reminders." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { invoiceId, invoiceIds } = body;

    const idsToRemind: string[] = [];
    if (invoiceId) idsToRemind.push(invoiceId);
    if (Array.isArray(invoiceIds)) idsToRemind.push(...invoiceIds);

    if (idsToRemind.length === 0) {
      return NextResponse.json(
        { error: "Provide invoiceId or invoiceIds array to send reminder." },
        { status: 400 }
      );
    }

    const invoices = await prisma.invoice.findMany({
      where: { id: { in: idsToRemind } },
      include: { customer: true },
    });

    // Update sentAt timestamp & log reminders
    const updated = await prisma.invoice.updateMany({
      where: { id: { in: idsToRemind } },
      data: { sentAt: new Date() },
    });

    const dispatched = invoices.map((inv) => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerEmail: inv.customer.email,
      remindedAt: new Date().toISOString(),
    }));

    return NextResponse.json({
      message: `Overdue reminder dispatched to ${updated.count} customer(s).`,
      count: updated.count,
      reminders: dispatched,
    });
  } catch (error) {
    return errorResponse(error, "Failed to send overdue reminders");
  }
}
