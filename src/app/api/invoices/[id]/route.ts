import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/deps";
import { errorResponse } from "@/lib/errors";

// GET /api/invoices/[id] - Detail endpoint
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: {
          include: { plan: true },
        },
        lines: {
          include: { product: true },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Customer scoping
    if (user.role === "CUSTOMER" && invoice.customerId !== user.id) {
      return NextResponse.json({ error: "Forbidden: You can only view your own invoices" }, { status: 403 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    return errorResponse(error, "Failed to fetch invoice");
  }
}
