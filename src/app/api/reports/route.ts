import { NextRequest, NextResponse } from "next/server";
import { require_role } from "@/lib/deps";
import { errorResponse } from "@/lib/errors";
import { getReportsSummary, getOverdueInvoices, getPayments } from "@/lib/payment-service";

/**
 * GET /api/reports (or /reports):
 * Omnibus reports endpoint returning executive summary + preview lists.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { user, error: authError } = await require_role("ADMIN", "STAFF")(req);
    if (authError || !user) return authError;
    const { searchParams } = new URL(req.url);

    const startDate = searchParams.get("startDate") || searchParams.get("start_date") || undefined;
    const endDate = searchParams.get("endDate") || searchParams.get("end_date") || undefined;
    const customerId = searchParams.get("customerId") || searchParams.get("customer_id") || undefined;
    const subscriptionStatus = searchParams.get("subscriptionStatus") || searchParams.get("status") || undefined;

    const [summary, recentPayments, overdueList] = await Promise.all([
      getReportsSummary({ startDate, endDate, customerId, subscriptionStatus, user }),
      getPayments({ customerId, user, page: 1, pageSize: 5 }),
      getOverdueInvoices({ customerId, user, page: 1, pageSize: 5 }),
    ]);

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      summary,
      recentPayments: recentPayments.payments,
      topOverdue: overdueList.overdueInvoices,
      performance: {
        latency_ms: latencyMs,
        under_2_seconds: latencyMs < 2000,
      },
    });
  } catch (error) {
    return errorResponse(error, "Failed to generate report");
  }
}
