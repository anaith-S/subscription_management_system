import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/session";

/**
 * Route protection for the private pages.
 *
 * This is an optimistic check: it reads the session cookie and the role from
 * the signed JWT so it can redirect before a page renders. It is not the only
 * line of defence - every private API route still calls get_current_user /
 * require_role and re-reads the role from the database, so a stale or forged
 * payload cannot grant access to data.
 */

const ADMIN_AREA = /^\/admin(\/|$)/;
const STAFF_AREA = [
  /^\/dashboard(\/|$)/,
  /^\/subscriptions(\/|$)/,
  /^\/quotation-templates(\/|$)/,
  /^\/invoices(\/|$)/,
  /^\/products(\/|$)/,
  /^\/plans(\/|$)/,
  /^\/discounts(\/|$)/,
];
const CUSTOMER_AREA = /^\/portal(\/|$)/;

function homeFor(role: string | undefined) {
  return role === "CUSTOMER" ? "/portal" : "/dashboard";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifyToken(token) : null;

  if (!session) {
    const response = NextResponse.redirect(
      new URL("/auth/login", request.url)
    );
    // Clear a cookie that is expired or no longer verifiable.
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const role = session.role?.toUpperCase();
  const home = homeFor(role);

  if (ADMIN_AREA.test(pathname) && role !== "ADMIN") {
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (
    STAFF_AREA.some((pattern) => pattern.test(pathname)) &&
    role === "CUSTOMER"
  ) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (CUSTOMER_AREA.test(pathname) && role !== "CUSTOMER") {
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/subscriptions/:path*",
    "/quotation-templates/:path*",
    "/invoices/:path*",
    "/products/:path*",
    "/plans/:path*",
    "/discounts/:path*",
    "/admin/:path*",
    "/portal/:path*",
  ],
};
