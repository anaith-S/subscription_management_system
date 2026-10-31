import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/deps";

// GET /api/quotation-templates/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const template = await prisma.quotationTemplate.findUnique({
      where: { id },
      include: {
        plan: true,
        lines: {
          include: {
            product: { include: { variants: true } },
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Quotation template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch template" }, { status: 500 });
  }
}

// PUT /api/quotation-templates/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
      return NextResponse.json({ error: "Forbidden: Admin or Staff required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, validityDays, planId, lines } = body;

    // Delete old lines and re-create with transaction
    const updated = await prisma.$transaction(async (tx) => {
      await tx.quotationTemplateLine.deleteMany({
        where: { templateId: id },
      });

      return await tx.quotationTemplate.update({
        where: { id },
        data: {
          name: name?.trim(),
          validityDays: validityDays ? Number(validityDays) : undefined,
          planId: planId || undefined,
          lines: Array.isArray(lines)
            ? {
                create: lines.map((l: any) => ({
                  productId: l.productId,
                  quantity: Number(l.quantity) || 1,
                  unitPrice: Number(l.unitPrice) || 0.0,
                })),
              }
            : undefined,
        },
        include: {
          plan: true,
          lines: { include: { product: true } },
        },
      });
    });

    return NextResponse.json({ template: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update template" }, { status: 500 });
  }
}

// DELETE /api/quotation-templates/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Admin can delete templates" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.quotationTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Template deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete template" }, { status: 500 });
  }
}
