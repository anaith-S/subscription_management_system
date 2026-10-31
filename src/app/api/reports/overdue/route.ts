import { NextRequest, NextResponse } from "next/server";
import { require_role } from "@/lib/deps";
import { errorResponse } from "@/lib/errors";
import { getOverdueInvoices } from "@/lib/payment-service";

/**
 * GET /api/reports/overdue:
 * Paginated list of overdue invoices for reports with days overdue, balances, and customer info.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await require_role("ADMIN", "STAFF")(req);
    if (authError || !user) return authError;
    const { searchParams } = new URL(req.url);

    const today = searchParams.get("today") || undefined;
    const customerId = searchParams.get("customerId") || searchParams.get("customer_id") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || searchParams.get("page_size") || "20", 10);

    const result = await getOverdueInvoices({
      today,
      customerId,
      user,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Failed to fetch overdue report");
  }
}
