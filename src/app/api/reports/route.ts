import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/deps";
import { getReportsSummary, getOverdueInvoices, getPayments } from "@/lib/payment-service";

/**
 * GET /api/reports (or /reports):
 * Omnibus reports endpoint returning executive summary + preview lists.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const user = await getCurrentUser(req);
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate report" },
      { status: 500 }
    );
  }
}
