import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { SESSION_COOKIE, signToken, verifyToken } from "@/lib/session";

// Re-exported so existing imports from "@/lib/auth" keep working.
export { signToken, verifyToken };
export type { JWTPayload } from "@/lib/session";

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length <= 8) {
    return { valid: false, error: "Password must be more than 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter." };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character." };
  }
  return { valid: true };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function extractTokenFromRequest(req?: Request | NextRequest): Promise<string | null> {
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7).trim();
    }
  }

  // Check cookies via next/headers
  try {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (cookieToken) return cookieToken;
  } catch {
    // If running outside request context or cookies() fails
  }

  return null;
}
