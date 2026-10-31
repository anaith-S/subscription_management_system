import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/deps";
import { getReportsSummary } from "@/lib/payment-service";

/**
 * GET /reports/summary (or /api/reports/summary):
 * Returns active subscription count, revenue collected, total outstanding and overdue count.
 * Filters: date range, customer and subscription status.
 *
 * Performance requirement:
 * - Uses SQL aggregates (SUM, COUNT), zero memory loops.
 * - Sub-2-second response time.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);

    const startDate = searchParams.get("startDate") || searchParams.get("start_date") || searchParams.get("from") || undefined;
    const endDate = searchParams.get("endDate") || searchParams.get("end_date") || searchParams.get("to") || undefined;
    const customerId = searchParams.get("customerId") || searchParams.get("customer_id") || undefined;
    const subscriptionStatus = searchParams.get("subscriptionStatus") || searchParams.get("status") || undefined;

    const summary = await getReportsSummary({
      startDate,
      endDate,
      customerId,
      subscriptionStatus,
      user,
    });

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      ...summary,
      performance: {
        latency_ms: executionTimeMs,
        under_2_seconds: executionTimeMs < 2000,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate reports summary" },
      { status: 500 }
    );
  }
}
