import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { require_role } from "@/lib/deps";
import { formatPlan } from "@/lib/catalog";
import { BillingFrequency } from "@prisma/client";

export const dynamic = "force-dynamic";

function mapBillingPeriod(val: any): BillingFrequency {
  const normalized = String(val || "MONTHLY").trim().toUpperCase();
  if (normalized === "DAILY") return BillingFrequency.DAILY;
  if (normalized === "WEEKLY") return BillingFrequency.WEEKLY;
  if (normalized === "YEARLY") return BillingFrequency.YEARLY;
  return BillingFrequency.MONTHLY;
}

// GET /api/catalog/plans/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const plan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ plan: formatPlan(plan) });
  } catch (error: any) {
    console.error("Get plan error:", error);
    return NextResponse.json({ error: "Failed to fetch plan" }, { status: 500 });
  }
}

// PUT / PATCH /api/catalog/plans/[id] - Admin only: Update plan
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleUpdate(req, params);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleUpdate(req, params);
}

async function handleUpdate(req: Request, paramsPromise: Promise<{ id: string }>) {
  try {
    const checkRole = require_role("ADMIN");
    const { error } = await checkRole(req);
    if (error) return error;

    const { id } = await paramsPromise;
    const body = await req.json();

    const existing = await prisma.plan.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = String(body.name).trim();
    if (body.price !== undefined || body.cost !== undefined) {
      dataToUpdate.cost = Number(body.price ?? body.cost);
    }
    if (body.billing_period !== undefined || body.frequency !== undefined) {
      dataToUpdate.frequency = mapBillingPeriod(body.billing_period ?? body.frequency);
    }
    if (body.min_quantity !== undefined || body.minQuantity !== undefined) {
      dataToUpdate.minQuantity = Number(body.min_quantity ?? body.minQuantity);
    }
    if (body.start_date !== undefined || body.startDate !== undefined) {
      const s = body.start_date ?? body.startDate;
      dataToUpdate.startDate = s ? new Date(s) : null;
    }
    if (body.end_date !== undefined || body.endDate !== undefined) {
      const e = body.end_date ?? body.endDate;
      dataToUpdate.endDate = e ? new Date(e) : null;
    }
    if (body.auto_close !== undefined || body.autoClose !== undefined) {
      dataToUpdate.autoClose = Boolean(body.auto_close ?? body.autoClose);
    }
    if (body.closable !== undefined || body.canCloseEarly !== undefined) {
      dataToUpdate.canCloseEarly = Boolean(body.closable ?? body.canCloseEarly);
    }
    if (body.pausable !== undefined || body.canPause !== undefined) {
      dataToUpdate.canPause = Boolean(body.pausable ?? body.canPause);
    }
    if (body.renewable !== undefined || body.canRenew !== undefined) {
      dataToUpdate.canRenew = Boolean(body.renewable ?? body.canRenew);
    }
    if (body.status !== undefined) {
      dataToUpdate.status = String(body.status).toUpperCase();
    }

    const updated = await prisma.plan.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      message: "Plan updated successfully",
      plan: formatPlan(updated),
    });
  } catch (error: any) {
    console.error("Update plan error:", error);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}

// DELETE /api/catalog/plans/[id] - Admin only: Delete plan
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const checkRole = require_role("ADMIN");
    const { error } = await checkRole(req);
    if (error) return error;

    const { id } = await params;
    const existing = await prisma.plan.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    await prisma.plan.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Plan deleted successfully", id });
  } catch (error: any) {
    console.error("Delete plan error:", error);
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }
}
