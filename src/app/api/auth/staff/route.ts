import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { require_role } from "@/lib/deps";
import { validatePassword, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1. Verify caller is an admin
    const checkRole = require_role("ADMIN");
    const { error } = await checkRole(req);

    if (error) {
      return error;
    }

    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Name, email and password are required for staff accounts" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 2. Validate password policy
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // 3. Ensure email is unique
    const existing = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // 4. Create internal staff member
    const passwordHash = await hashPassword(password);
    const staff = await prisma.user.create({
      data: {
        email: trimmedEmail,
        name: name.trim(),
        passwordHash,
        role: "STAFF",
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Internal staff member created successfully",
        staff,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Staff creation error:", error);
    return NextResponse.json(
      { error: "Internal server error creating staff member" },
      { status: 500 }
    );
  }
}

// Also support GET /api/auth/staff (admin only) to list staff members
export async function GET(req: Request) {
  try {
    const checkRole = require_role("ADMIN");
    const { error } = await checkRole(req);
    if (error) return error;

    const staffMembers = await prisma.user.findMany({
      where: { role: { in: ["STAFF", "ADMIN"] } },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ staff: staffMembers });
  } catch (error: unknown) {
    console.error("List staff error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching staff list" },
      { status: 500 }
    );
  }
}
