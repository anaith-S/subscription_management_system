import { NextRequest, NextResponse } from "next/server";
import { require_role } from "@/lib/deps";
import { errorResponse } from "@/lib/errors";
import { recordPayment, getPayments } from "@/lib/payment-service";

/**
 * POST /api/payments (or /payments):
 * Records a payment against an invoice.
 * - Rejects payments on cancelled invoices.
 * - After saving, if the sum of payments is at least the invoice total, sets the invoice to Paid.
 * - Partial payments keep the invoice Confirmed, showing the outstanding balance.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await require_role("ADMIN", "STAFF")(req);
    if (authError || !user) return authError;
    // Only Admin / Staff record payments; created_by is always the logged-in user.

    const body = await req.json();
    const {
      invoiceId,
      invoice_id,
      method,
      amount,
      paymentDate,
      payment_date,
      note,
    } = body;

    const targetInvoiceId = invoiceId || invoice_id;
    const targetPaymentDate = paymentDate || payment_date;
    const targetCreatedBy = user.id;

    if (!targetInvoiceId) {
      return NextResponse.json(
        { error: "Validation Error: 'invoiceId' (or 'invoice_id') is required." },
        { status: 400 }
      );
    }

    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Validation Error: 'amount' must be a positive number greater than 0." },
        { status: 400 }
      );
    }

    const result = await recordPayment({
      invoiceId: targetInvoiceId,
      method,
      amount: Number(amount),
      paymentDate: targetPaymentDate,
      note,
      createdBy: targetCreatedBy,
      user,
    });

    return NextResponse.json(
      {
        message:
          result.invoice.status === "PAID"
            ? "Payment recorded successfully. Invoice is now fully PAID!"
            : "Partial payment recorded. Invoice remains CONFIRMED with remaining balance.",
        payment: result.payment,
        invoice: result.invoice,
        amount_paid: result.invoice.amountPaid,
        balance_due: result.invoice.balanceDue,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error, "Failed to record payment");
  }
}

/**
 * GET /api/payments (or /payments):
 * List with filters (invoice, method, date range) and pagination.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await require_role("ADMIN", "STAFF")(req);
    if (authError || !user) return authError;
    const { searchParams } = new URL(req.url);

    const invoiceId = searchParams.get("invoiceId") || searchParams.get("invoice_id") || undefined;
    const method = searchParams.get("method") || undefined;
    const startDate = searchParams.get("startDate") || searchParams.get("start_date") || searchParams.get("from") || undefined;
    const endDate = searchParams.get("endDate") || searchParams.get("end_date") || searchParams.get("to") || undefined;
    const customerId = searchParams.get("customerId") || searchParams.get("customer_id") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || searchParams.get("page_size") || "20", 10);

    const result = await getPayments({
      invoiceId,
      method,
      startDate,
      endDate,
      customerId,
      user,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Failed to fetch payments");
  }
}
