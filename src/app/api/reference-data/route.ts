import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/deps";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [products, plans, customers, taxes, discounts] = await Promise.all([
      prisma.product.findMany({
        include: { variants: true },
        orderBy: { name: "asc" },
      }),
      prisma.plan.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: { role: "CUSTOMER" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
      prisma.taxRule.findMany({
        orderBy: { ratePercentage: "asc" },
      }),
      prisma.discountRule.findMany({
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      products,
      plans,
      customers,
      taxes,
      discounts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch reference data" }, { status: 500 });
  }
}
