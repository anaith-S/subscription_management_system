import { NextRequest, NextResponse } from "next/server";
import { require_role } from "@/lib/deps";
import { createInvoiceFromSubscription } from "@/lib/billing-service";
import { errorResponse, parseOptionalDate } from "@/lib/errors";

// POST /api/subscriptions/[id]/create-invoice
// Bills the subscription's next scheduled period, or `periodStart` if given.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await require_role("ADMIN", "STAFF")(req);
    if (error) return error;

    const { id } = await params;

    // Body is optional
    const raw = await req.text();
    const body = raw.trim() ? JSON.parse(raw) : {};
    const periodStart = parseOptionalDate(body?.periodStart, "periodStart");

    const invoice = await createInvoiceFromSubscription(id, periodStart);

    return NextResponse.json(
      { message: "Invoice generated successfully from subscription", invoice },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error, "Failed to generate invoice from subscription");
  }
}
