import { prisma } from "@/lib/prisma";
import { extractTokenFromRequest, verifyToken } from "@/lib/auth";
import { NextResponse, NextRequest } from "next/server";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Shared dependency: get_current_user
 * Validates JWT token from Bearer header or cookie and fetches user from DB.
 */
export async function get_current_user(
  req?: Request | NextRequest
): Promise<AuthenticatedUser | null> {
  const token = await extractTokenFromRequest(req);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user || !user.isActive) return null;

  return user;
}

// CamelCase alias for TS conventions
export const getCurrentUser = get_current_user;

/**
 * Shared dependency: require_role("admin", "staff")
 * Returns a helper that validates the user has one of the allowed roles.
 * Case-insensitive: supports "admin", "ADMIN", "staff", "STAFF", etc.
 */
export function require_role(...allowedRoles: string[]) {
  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

  return async (req?: Request | NextRequest): Promise<{ user: AuthenticatedUser | null; error?: NextResponse }> => {
    const user = await get_current_user(req);

    if (!user) {
      return {
        user: null,
        error: NextResponse.json(
          { error: "Unauthorized: Missing or invalid authentication token" },
          { status: 401 }
        ),
      };
    }

    if (!normalizedAllowed.includes(user.role.toUpperCase())) {
      return {
        user,
        error: NextResponse.json(
          { error: `Forbidden: Requires one of roles: [${allowedRoles.join(", ")}]` },
          { status: 403 }
        ),
      };
    }

    return { user };
  };
}

// CamelCase alias for TS conventions
export const requireRole = require_role;

/**
 * Customer scoping helper:
 * Filters queries by customer_id (or customerId) when the role is customer.
 * Members 3 and 4 will use it.
 *
 * Usage with Prisma:
 *   const whereClause = customer_scoping_helper(user, { status: "ACTIVE" });
 *   prisma.subscription.findMany({ where: whereClause });
 */
export function customer_scoping_helper<T extends Record<string, any>>(
  user: { id: string; role: string },
  baseQuery: T = {} as T
): T & { customerId?: string; customer_id?: string } {
  const isCustomer = user.role.toUpperCase() === "CUSTOMER";

  if (isCustomer) {
    return {
      ...baseQuery,
      customerId: user.id,
      customer_id: user.id,
    };
  }

  return baseQuery;
}

// Aliases
export const customerScopingHelper = customer_scoping_helper;
export const scopeCustomerQuery = customer_scoping_helper;

// Member 2 Catalog & Pricing Shared Helpers
export {
  calculate_unit_price,
  calculateUnitPrice,
  close_expired_plans,
  closeExpiredPlans,
  get_applicable_discounts,
  getApplicableDiscounts,
  calculate_discount_amount,
  calculateDiscountAmount,
} from "./catalog";
