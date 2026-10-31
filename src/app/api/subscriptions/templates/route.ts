import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/subscriptions/templates - List quotation templates
export async function GET() {
  try {
    const templates = await prisma.quotationTemplate.findMany({
      include: {
        plan: true,
        lines: {
          include: { product: { include: { variants: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error("List templates error:", error);
    return NextResponse.json({ error: "Failed to fetch quotation templates" }, { status: 500 });
  }
}
