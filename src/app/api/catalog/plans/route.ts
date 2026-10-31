import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { require_role } from "@/lib/deps";
import { close_expired_plans, formatPlan } from "@/lib/catalog";
import { BillingFrequency } from "@prisma/client";

export const dynamic = "force-dynamic";

function mapBillingPeriod(val: any): BillingFrequency {
  const normalized = String(val || "MONTHLY").trim().toUpperCase();
  if (normalized === "DAILY") return BillingFrequency.DAILY;
  if (normalized === "WEEKLY") return BillingFrequency.WEEKLY;
  if (normalized === "YEARLY") return BillingFrequency.YEARLY;
  return BillingFrequency.MONTHLY;
}


// GET /api/catalog/plans - List all plans
// Per requirements: Closes plans past their end date when auto_close is true automatically on list
export async function GET(req: Request) {
  try {
    // 1. Process auto-close for expired plans
    await close_expired_plans();

    // 2. Fetch all plans
    const plans = await prisma.plan.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      plans: plans.map(formatPlan),
    });
  } catch (error: any) {
    console.error("List plans error:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}

// POST /api/catalog/plans - Admin only: Create plan
export async function POST(req: Request) {
  try {
    const checkRole = require_role("ADMIN");
    const { error } = await checkRole(req);
    if (error) return error;

    const body = await req.json();
    const {
      name,
      price,
      cost,
      billing_period,
      frequency,
      min_quantity,
      minQuantity,
      start_date,
      startDate,
      end_date,
      endDate,
      auto_close,
      autoClose,
      closable,
      canCloseEarly,
      pausable,
      canPause,
      renewable,
      canRenew,
      status = "ACTIVE",
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    }

    const finalPrice = Number(price ?? cost ?? 0);
    const finalFreq = mapBillingPeriod(billing_period ?? frequency);
    const finalMinQty = Number(min_quantity ?? minQuantity ?? 1);
    const finalStartDate = start_date || startDate ? new Date(start_date || startDate) : null;
    const finalEndDate = end_date || endDate ? new Date(end_date || endDate) : null;

    const finalAutoClose = auto_close !== undefined ? Boolean(auto_close) : autoClose !== undefined ? Boolean(autoClose) : true;
    const finalClosable = closable !== undefined ? Boolean(closable) : canCloseEarly !== undefined ? Boolean(canCloseEarly) : true;
    const finalPausable = pausable !== undefined ? Boolean(pausable) : canPause !== undefined ? Boolean(canPause) : true;
    const finalRenewable = renewable !== undefined ? Boolean(renewable) : canRenew !== undefined ? Boolean(canRenew) : true;

    const plan = await prisma.plan.create({
      data: {
        name: name.trim(),
        cost: finalPrice,
        frequency: finalFreq,
        minQuantity: finalMinQty,
        startDate: finalStartDate,
        endDate: finalEndDate,
        autoClose: finalAutoClose,
        canCloseEarly: finalClosable,
        canPause: finalPausable,
        canRenew: finalRenewable,
        status: String(status).toUpperCase(),
      },
    });

    return NextResponse.json(
      { message: "Plan created successfully", plan: formatPlan(plan) },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create plan error:", error);
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }
}
