import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

/**
 * Clears the httpOnly session cookie. The browser cannot clear it from
 * JavaScript, so logout has to happen on the server.
 */
export async function POST() {
  const response = NextResponse.json({ message: "Logged out successfully" });
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
