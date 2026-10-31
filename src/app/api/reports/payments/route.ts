import { NextRequest, NextResponse } from "next/server";
import { require_role } from "@/lib/deps";
import { errorResponse } from "@/lib/errors";
import { getPayments } from "@/lib/payment-service";

/**
 * GET /api/reports/payments:
 * Paginated list of payments for reports with date, customer, method filters.
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
    return errorResponse(error, "Failed to fetch payments report");
  }
}
