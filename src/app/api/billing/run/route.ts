import { NextRequest, NextResponse } from "next/server";
import { require_role } from "@/lib/deps";
import { executeBillingRun } from "@/lib/billing-service";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const { error } = await require_role("ADMIN", "STAFF")(req);
    if (error) return error;

    const runResult = await executeBillingRun();

    return NextResponse.json({
      message: `Billing run completed. Evaluated: ${runResult.totalEvaluated}, Generated: ${runResult.invoicesCreated}, Skipped: ${runResult.skipped}, Errors: ${runResult.errors.length}`,
      ...runResult,
    });
  } catch (error) {
    return errorResponse(error, "Failed to execute billing run");
  }
}
