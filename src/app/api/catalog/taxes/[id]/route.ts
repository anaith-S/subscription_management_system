import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { require_role } from "@/lib/deps";
import { formatTax } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// GET /api/catalog/taxes/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tax = await prisma.taxRule.findUnique({
      where: { id },
    });

    if (!tax) {
      return NextResponse.json({ error: "Tax not found" }, { status: 404 });
    }

    return NextResponse.json({ tax: formatTax(tax) });
  } catch (error: any) {
    console.error("Get tax error:", error);
    return NextResponse.json({ error: "Failed to fetch tax" }, { status: 500 });
  }
}

// PUT / PATCH /api/catalog/taxes/[id] - Admin only: Update tax
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

    const existing = await prisma.taxRule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tax not found" }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = String(body.name).trim();
    if (body.percentage !== undefined || body.ratePercentage !== undefined) {
      dataToUpdate.ratePercentage = Number(body.percentage ?? body.ratePercentage);
    }
    if (body.is_default !== undefined || body.isDefault !== undefined) {
      const def = Boolean(body.is_default ?? body.isDefault);
      dataToUpdate.isDefault = def;
      if (def) {
        await prisma.taxRule.updateMany({
          where: { id: { not: id }, isDefault: true },
          data: { isDefault: false },
        });
      }
    }

    const updated = await prisma.taxRule.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      message: "Tax updated successfully",
      tax: formatTax(updated),
    });
  } catch (error: any) {
    console.error("Update tax error:", error);
    return NextResponse.json({ error: "Failed to update tax" }, { status: 500 });
  }
}

// DELETE /api/catalog/taxes/[id] - Admin only: Delete tax
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const checkRole = require_role("ADMIN");
    const { error } = await checkRole(req);
    if (error) return error;

    const { id } = await params;
    const existing = await prisma.taxRule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tax not found" }, { status: 404 });
    }

    await prisma.taxRule.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Tax deleted successfully", id });
  } catch (error: any) {
    console.error("Delete tax error:", error);
    return NextResponse.json({ error: "Failed to delete tax" }, { status: 500 });
  }
}
