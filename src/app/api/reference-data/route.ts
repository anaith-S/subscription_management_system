import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { require_role } from "@/lib/deps";
import { errorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    // Lists every customer and discount code, so internal users only.
    const { error } = await require_role("ADMIN", "STAFF")(req);
    if (error) return error;

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
  } catch (error) {
    return errorResponse(error, "Failed to fetch reference data");
  }
}
