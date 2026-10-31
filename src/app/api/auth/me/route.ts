import { NextResponse } from "next/server";
import { get_current_user } from "@/lib/deps";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await get_current_user(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching user profile" },
      { status: 500 }
    );
  }
}
