import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/deps";
import { transitionInvoice } from "@/lib/invoice-service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
      return NextResponse.json({ error: "Forbidden: Admin or Staff required for invoice actions" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, paymentMethod, paymentAmount, paymentNote } = body;

    if (!action || !["confirm", "cancel", "send", "pay"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Supported actions: 'confirm', 'cancel', 'send', 'pay'" },
        { status: 400 }
      );
    }

    const updatedInvoice = await transitionInvoice(id, action, {
      paymentMethod,
      paymentAmount: paymentAmount ? Number(paymentAmount) : undefined,
      paymentNote,
    });

    return NextResponse.json({
      message: `Invoice action '${action}' completed successfully`,
      invoice: updatedInvoice,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to perform invoice action" },
      { status: 400 }
    );
  }
}
