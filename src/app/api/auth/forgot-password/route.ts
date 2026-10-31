import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      // Return 200/ok for security enumeration or friendly hackathon testing
      return NextResponse.json({
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    // Store in password_reset_tokens table
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        used: false,
      },
    });

    // Also update User record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiresAt,
      },
    });

    // Determine host URL
    const url = new URL(req.url);
    const origin = url.origin || "http://localhost:3000";
    const resetLink = `${origin}/auth/reset-password?token=${token}`;

    // Print to console (requirement: print it to the console if SMTP is slow)
    console.log("\n=======================================================");
    console.log("✉️  PASSWORD RESET EMAIL SIMULATION");
    console.log(`To: ${user.email}`);
    console.log(`Reset Token: ${token}`);
    console.log(`Reset URL: ${resetLink}`);
    console.log("Expires in: 1 hour");
    console.log("=======================================================\n");

    return NextResponse.json({
      message: "Password reset link generated and sent to console.",
      resetToken: token,
      resetLink,
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error during password reset request" },
      { status: 500 }
    );
  }
}
