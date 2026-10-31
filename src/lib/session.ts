import jwt from "jsonwebtoken";

/**
 * Session primitives shared by the API routes and the proxy.
 *
 * This module deliberately has no Prisma / next/headers imports so it can be
 * bundled into the proxy without pulling in the database client.
 */

export const SESSION_COOKIE = "auth_token";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const DEV_FALLBACK_SECRET = "brightloop-insecure-development-only-secret";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret && secret.trim().length > 0) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET is not set. Refusing to sign or verify sessions in production."
    );
  }

  console.warn(
    "[auth] JWT_SECRET is not set. Using an insecure development-only secret; set JWT_SECRET in .env."
  );
  return DEV_FALLBACK_SECRET;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  name: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Cookie flags for the session. httpOnly keeps the token out of reach of
 * client-side JavaScript, so an XSS bug cannot steal the session.
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
