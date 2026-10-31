import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePassword, hashPassword, signToken } from "@/lib/auth";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Validate password policy
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // 2. Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // 3. Hash password and create customer
    const passwordHash = await hashPassword(password);
    const userName = name?.trim() || trimmedEmail.split("@")[0];

    const newUser = await prisma.user.create({
      data: {
        email: trimmedEmail,
        name: userName,
        passwordHash,
        role: "CUSTOMER",
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

    // 4. Generate JWT
    const token = signToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
    });

    const response = NextResponse.json(
      {
        message: "Account created successfully",
        token,
        user: newUser,
      },
      { status: 201 }
    );

    // Set httpOnly session cookie
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

    return response;
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error during registration" },
      { status: 500 }
    );
  }
}
