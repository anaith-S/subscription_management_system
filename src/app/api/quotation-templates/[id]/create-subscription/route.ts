import { NextRequest, NextResponse } from "next/server";
import { require_role } from "@/lib/deps";
import { createSubscriptionFromTemplate } from "@/lib/subscription-service";
import { errorResponse, parseOptionalDate } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await require_role("ADMIN", "STAFF")(req);
    if (error) return error;

    const { id } = await params;
    const { customerId, paymentTerms, discountCode, startDate } = await req.json();

    const subscription = await createSubscriptionFromTemplate(id, customerId, {
      paymentTerms,
      discountCode,
      startDate: parseOptionalDate(startDate, "startDate"),
    });

    return NextResponse.json(
      { message: "Subscription successfully created from template", subscription },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error, "Failed to create subscription from template");
  }
}
