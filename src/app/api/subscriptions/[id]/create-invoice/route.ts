import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/deps";
import { createInvoiceFromSubscription } from "@/lib/billing-service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
      return NextResponse.json({ error: "Forbidden: Admin or Staff required" }, { status: 403 });
    }

    const { id } = await params;
    let periodStart = new Date();

    try {
      const body = await req.json();
      if (body?.periodStart) {
        periodStart = new Date(body.periodStart);
      }
    } catch {
      // Body is optional
    }

    const invoice = await createInvoiceFromSubscription(id, periodStart);

    return NextResponse.json({
      message: "Invoice generated successfully from subscription",
      invoice,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate invoice from subscription" },
      { status: 400 }
    );
  }
}
