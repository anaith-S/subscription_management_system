import { NextRequest, NextResponse } from "next/server";
import { require_role } from "@/lib/deps";
import { INVOICE_ACTIONS, isInvoiceAction, transitionInvoice } from "@/lib/invoice-service";
import { AppError, errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await require_role("ADMIN", "STAFF")(req);
    if (error) return error;

    const { id } = await params;
    const { action, paymentMethod, paymentAmount, paymentNote } = await req.json();

    if (!isInvoiceAction(action)) {
      throw new AppError(`Invalid action. Supported actions: ${INVOICE_ACTIONS.join(", ")}`);
    }

    let amount: number | undefined;
    if (paymentAmount !== undefined && paymentAmount !== null && paymentAmount !== "") {
      amount = Number(paymentAmount);
      if (!Number.isFinite(amount)) throw new AppError("paymentAmount must be a number");
    }

    const updatedInvoice = await transitionInvoice(id, action, {
      paymentMethod,
      paymentAmount: amount,
      paymentNote,
    });

    return NextResponse.json({
      message: `Invoice action '${action}' completed successfully`,
      invoice: updatedInvoice,
    });
  } catch (error) {
    return errorResponse(error, "Failed to perform invoice action");
  }
}
