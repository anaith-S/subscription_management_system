import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/deps";
import { createSubscriptionFromTemplate } from "@/lib/subscription-service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
      return NextResponse.json({ error: "Forbidden: Admin or Staff required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { customerId, paymentTerms, discountCode, startDate } = body;

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    const subscription = await createSubscriptionFromTemplate(id, customerId, {
      paymentTerms: paymentTerms || "Net 15",
      discountCode: discountCode || null,
      startDate: startDate ? new Date(startDate) : new Date(),
    });

    return NextResponse.json(
      {
        message: "Subscription successfully created from template",
        subscription,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create subscription from template" }, { status: 500 });
  }
}
