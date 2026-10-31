import { NextRequest, NextResponse } from "next/server";
import { require_role } from "@/lib/deps";
import { errorResponse } from "@/lib/errors";
import { getInvoicePaymentViews } from "@/lib/payment-service";

/**
 * GET /api/invoices/payments:
 * Invoice payment views: paid versus outstanding lists, with amount_paid and balance_due per invoice.
 * Query params:
 *   - type: "paid" | "outstanding" | "all"
 *   - customerId (or customer_id)
 *   - page, pageSize (or page_size)
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await require_role("ADMIN", "STAFF")(req);
    if (authError || !user) return authError;
    const { searchParams } = new URL(req.url);

    const type = (searchParams.get("type") as "paid" | "outstanding" | "all") || "all";
    const customerId = searchParams.get("customerId") || searchParams.get("customer_id") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || searchParams.get("page_size") || "20", 10);

    const result = await getInvoicePaymentViews({
      type,
      customerId,
      user,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Failed to fetch invoice payment views");
  }
}
