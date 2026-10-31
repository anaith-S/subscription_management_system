"""
Shared authentication and authorization dependencies for Brightloop Subscription Management System.
Members 1, 2, 3, and 4 shared contract.

Usage in FastAPI / Python routes:
    from deps import get_current_user, require_role, customer_scoping_helper

    @app.get("/some/protected/endpoint")
    def my_endpoint(user = Depends(get_current_user)):
        ...

    @app.post("/admin/only")
    def admin_endpoint(user = Depends(require_role("admin"))):
        ...

    @app.get("/subscriptions")
    def list_subs(user = Depends(require_role("admin", "staff", "customer"))):
        filters = customer_scoping_helper(user, {"status": "ACTIVE"})
        # filters will contain {"status": "ACTIVE", "customer_id": user["id"]} if role is CUSTOMER
"""

import os
from typing import List, Optional, Dict, Any, Callable

try:
    import jwt
except ImportError:
    jwt = None

try:
    from fastapi import HTTPException, Header, Depends, status
except ImportError:
    # Minimal fallback mock for FastAPI exceptions and dependencies if not installed
    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str):
            self.status_code = status_code
            self.detail = detail
            super().__init__(detail)

    def Depends(f):
        return f

    def Header(default=None):
        return default

    class status:
        HTTP_401_UNAUTHORIZED = 401
        HTTP_403_FORBIDDEN = 403

JWT_SECRET = os.environ.get("JWT_SECRET", "brightloop-super-secret-jwt-key-2026-hackathon")
ALGORITHM = "HS256"


def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Extracts and validates the JWT Bearer token from the Authorization header.
    Returns the decoded user dictionary: { "id", "email", "role", "name" }.
    Raises HTTPException(401) if invalid or expired.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header"
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Must be 'Bearer <token>'"
        )

    token = parts[1]

    if jwt is None:
        # Fallback if PyJWT not installed in environment
        import base64
        import json
        try:
            payload_segment = token.split(".")[1]
            padded = payload_segment + "=" * (-len(payload_segment) % 4)
            decoded = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
            return decoded
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token structure"
            )

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}"
        )


def require_role(*allowed_roles: str) -> Callable:
    """
    Dependency factory to enforce role-based access control (RBAC).
    Case-insensitive: accepts 'admin', 'staff', 'customer', etc.

    Usage:
        @app.get("/staff-only", dependencies=[Depends(require_role("admin", "staff"))])
        def staff_action(user = Depends(get_current_user)):
            ...
    """
    normalized_allowed = [r.strip().upper() for r in allowed_roles]

    def role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = str(user.get("role", "")).strip().upper()
        if user_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Action requires one of roles {list(allowed_roles)}"
            )
        return user

    return role_checker


def customer_scoping_helper(user: Dict[str, Any], query_filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Customer scoping helper:
    Filters queries by customer_id when the role is customer.
    Members 3 and 4 will use this for subscription and invoice endpoints.

    If role is 'CUSTOMER', injects 'customer_id' = user['id'].
    If role is 'ADMIN' or 'STAFF', returns the unmodified query filters.
    """
    filters = dict(query_filters) if query_filters else {}
    user_role = str(user.get("role", "")).strip().upper()
    user_id = user.get("id")

    if user_role == "CUSTOMER":
        filters["customer_id"] = user_id
        filters["customerId"] = user_id

    return filters


# Aliases for different naming conventions
scope_customer_query = customer_scoping_helper


def calculate_unit_price(base_price: float, variant_extra_price: Optional[float] = 0.0) -> float:
    """
    Price helper: final unit price = base price + variant extra price
    """
    base = float(base_price or 0.0)
    extra = float(variant_extra_price or 0.0)
    return round(base + extra, 2)


calculateUnitPrice = calculate_unit_price


def get_applicable_discounts(subscription: Dict[str, Any], lines: List[Dict[str, Any]], today: Any = None, discounts: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """
    Helper get_applicable_discounts(subscription, lines, today) that returns valid discounts
    (dates ok, usage not exhausted, minimums met). Member 3 calls this during invoicing.
    """
    from datetime import datetime
    if today is None:
        today = datetime.now()
    elif isinstance(today, str):
        today = datetime.fromisoformat(today)

    code = str(subscription.get("discountCode") or subscription.get("discount_code") or "").strip().upper()
    discounts_list = discounts or []
    applicable = []

    for d in discounts_list:
        d_code = str(d.get("code") or "").strip().upper()
        if code and d_code != code:
            continue

        start_date = d.get("startDate") or d.get("start_date")
        if start_date:
            s_date = datetime.fromisoformat(str(start_date)) if isinstance(start_date, str) else start_date
            if today < s_date:
                continue

        end_date = d.get("endDate") or d.get("end_date")
        if end_date:
            e_date = datetime.fromisoformat(str(end_date)) if isinstance(end_date, str) else end_date
            if today > e_date:
                continue

        usage_limit = d.get("usageLimit") or d.get("usage_limit")
        used_count = d.get("timesUsed") if d.get("timesUsed") is not None else d.get("used_count", 0)
        if usage_limit is not None and used_count >= usage_limit:
            continue

        target_type = str(d.get("targetType") or d.get("applies_to") or "WHOLE_SUBSCRIPTION").upper()
        target_product_id = d.get("targetProductId") or d.get("product_id")

        if target_type in ("SPECIFIC_PRODUCT", "PRODUCT") or target_product_id:
            target_lines = [l for l in (lines or []) if str(l.get("productId") or l.get("product_id")) == str(target_product_id)]
            if not target_lines:
                continue
        else:
            target_lines = lines or []

        total_qty = sum(float(l.get("quantity", 0)) for l in target_lines)
        total_amt = sum(float(l.get("amount") if l.get("amount") is not None else float(l.get("quantity", 0)) * float(l.get("unitPrice", 0))) for l in target_lines)

        min_qty = d.get("minQuantity") or d.get("min_quantity")
        if min_qty is not None and total_qty < float(min_qty):
            continue

        min_purchase = d.get("minPurchaseAmount") or d.get("min_purchase")
        if min_purchase is not None and total_amt < float(min_purchase):
            continue

        applicable.append(d)

    return applicable


getApplicableDiscounts = get_applicable_discounts
