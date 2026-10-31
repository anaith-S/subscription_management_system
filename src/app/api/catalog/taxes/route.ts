import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { require_role } from "@/lib/deps";
import { formatTax } from "@/lib/catalog";

export const dynamic = "force-dynamic";


// GET /api/catalog/taxes - List all taxes
export async function GET(req: Request) {
  try {
    const taxes = await prisma.taxRule.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      taxes: taxes.map(formatTax),
    });
  } catch (error: any) {
    console.error("List taxes error:", error);
    return NextResponse.json({ error: "Failed to fetch taxes" }, { status: 500 });
  }
}

// POST /api/catalog/taxes - Admin only: Create tax
export async function POST(req: Request) {
  try {
    const checkRole = require_role("ADMIN");
    const { error } = await checkRole(req);
    if (error) return error;

    const body = await req.json();
    const { name, percentage, ratePercentage, is_default, isDefault } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Tax name is required" }, { status: 400 });
    }

    const pct = Number(percentage ?? ratePercentage ?? 0);
    const def = is_default !== undefined ? Boolean(is_default) : isDefault !== undefined ? Boolean(isDefault) : false;

    // If setting as default, optionally unset other defaults
    if (def) {
      await prisma.taxRule.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const tax = await prisma.taxRule.create({
      data: {
        name: name.trim(),
        ratePercentage: pct,
        isDefault: def,
      },
    });

    return NextResponse.json(
      { message: "Tax created successfully", tax: formatTax(tax) },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create tax error:", error);
    return NextResponse.json({ error: "Failed to create tax" }, { status: 500 });
  }
}
