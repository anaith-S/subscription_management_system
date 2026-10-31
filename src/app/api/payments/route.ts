import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/deps";
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
    const user = await getCurrentUser(req);
    // Any authenticated user or guest/webhook recording payment:
    // If user is logged in, their ID is captured as created_by

    const body = await req.json();
    const {
      invoiceId,
      invoice_id,
      method,
      amount,
      paymentDate,
      payment_date,
      note,
      createdBy,
      created_by,
    } = body;

    const targetInvoiceId = invoiceId || invoice_id;
    const targetPaymentDate = paymentDate || payment_date;
    const targetCreatedBy = createdBy || created_by || user?.id || null;

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
  } catch (error: any) {
    const status = error.message?.includes("not found")
      ? 404
      : error.message?.includes("Forbidden")
      ? 403
      : error.message?.includes("CANCELLED")
      ? 400
      : 400;

    return NextResponse.json(
      { error: error.message || "Failed to record payment" },
      { status }
    );
  }
}

/**
 * GET /api/payments (or /payments):
 * List with filters (invoice, method, date range) and pagination.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
