import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  if (method === "POST") {
    if (pathname === "/auth/login") {
      return NextResponse.rewrite(new URL("/api/auth/login", request.url));
    }
    if (pathname === "/auth/forgot-password") {
      return NextResponse.rewrite(new URL("/api/auth/forgot-password", request.url));
    }
    if (pathname === "/auth/reset-password") {
      return NextResponse.rewrite(new URL("/api/auth/reset-password", request.url));
    }
    if (pathname === "/auth/signup") {
      return NextResponse.rewrite(new URL("/api/auth/signup", request.url));
    }
    if (pathname === "/auth/staff") {
      return NextResponse.rewrite(new URL("/api/auth/staff", request.url));
    }
  }

  if (method === "GET") {
    if (pathname === "/auth/me") {
      return NextResponse.rewrite(new URL("/api/auth/me", request.url));
    }
    if (pathname === "/auth/staff") {
      return NextResponse.rewrite(new URL("/api/auth/staff", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/auth/:path*"],
};
