import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/deps";

// GET /api/quotation-templates - List templates with lines and plan
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.quotationTemplate.findMany({
      include: {
        plan: true,
        lines: {
          include: {
            product: {
              include: { variants: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch templates" }, { status: 500 });
  }
}

// POST /api/quotation-templates - Create quotation template
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
      return NextResponse.json({ error: "Forbidden: Admin or Staff required" }, { status: 403 });
    }

    const body = await req.json();
    const { name, validityDays, planId, lines } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    }

    const template = await prisma.quotationTemplate.create({
      data: {
        name: name.trim(),
        validityDays: Number(validityDays) || 30,
        planId: planId || null,
        lines: {
          create: Array.isArray(lines)
            ? lines.map((l: any) => ({
                productId: l.productId,
                quantity: Number(l.quantity) || 1,
                unitPrice: Number(l.unitPrice) || 0.0,
              }))
            : [],
        },
      },
      include: {
        plan: true,
        lines: { include: { product: true } },
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create template" }, { status: 500 });
  }
}
