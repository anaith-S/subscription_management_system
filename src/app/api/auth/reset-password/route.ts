import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePassword, hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, password, newPassword } = body;
    const finalPassword = password || newPassword;

    if (!token || !finalPassword) {
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 }
      );
    }

    // 1. Validate password policy
    const passwordValidation = validatePassword(finalPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // 2. Validate token from password_reset_tokens table
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.used) {
      return NextResponse.json(
        { error: "Invalid or already used password reset token" },
        { status: 400 }
      );
    }

    if (new Date() > new Date(tokenRecord.expiresAt)) {
      return NextResponse.json(
        { error: "Password reset token has expired" },
        { status: 400 }
      );
    }

    // 3. Hash new password and update user
    const newPasswordHash = await hashPassword(finalPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: {
          passwordHash: newPasswordHash,
          resetToken: null,
          resetTokenExpiry: null,
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { used: true },
      }),
    ]);

    console.log(`✅ Password successfully reset for user: ${tokenRecord.user.email}`);

    return NextResponse.json({
      message: "Password has been successfully updated. You may now log in.",
    });
  } catch (error: unknown) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error during password reset" },
      { status: 500 }
    );
  }
}
