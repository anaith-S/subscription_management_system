import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/deps";
import { executeBillingRun } from "@/lib/billing-service";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
      return NextResponse.json({ error: "Forbidden: Admin or Staff required to execute billing run" }, { status: 403 });
    }

    const runResult = await executeBillingRun();

    return NextResponse.json({
      message: `Billing run completed. Evaluated: ${runResult.totalEvaluated}, Generated: ${runResult.invoicesCreated}, Skipped: ${runResult.skipped}`,
      ...runResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute billing run" },
      { status: 500 }
    );
  }
}
