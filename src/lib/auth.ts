import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const JWT_SECRET = process.env.JWT_SECRET || "brightloop-super-secret-jwt-key-2026-hackathon";

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  name: string;
}

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

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
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
    const cookieToken = cookieStore.get("auth_token")?.value;
    if (cookieToken) return cookieToken;
  } catch {
    // If running outside request context or cookies() fails
  }

  return null;
}
