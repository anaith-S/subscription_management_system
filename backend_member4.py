"""
Brightloop Member 4: Payments, Reports, Performance and Seed Data (Python Backend)

Table: payments (id, invoice_id, method, amount, payment_date, note, created_by)

Features:
- POST /payments: Records payment against invoice, rejects CANCELLED, sets to PAID if settled, keeps CONFIRMED with balance_due if partial.
- GET /payments: List with filters (invoice, method, date range) & pagination.
- Invoice payment views: Paid vs outstanding lists with amount_paid and balance_due per invoice.
- Overdue query: Invoices where due_date < today and status not in ('PAID', 'CANCELLED').
- GET /reports/summary: active_subscriptions_count, revenue_collected, total_outstanding, overdue_count.
- Performance: SQL aggregates (SUM, COUNT), no loops in Python, sub-2-second response.
- Uses deps.py for auth, RBAC, and customer scoping helper.
"""

import sqlite3
import uuid
import datetime
import math
import os
import time
from typing import Optional, Dict, Any, List

from deps import customer_scoping_helper, HTTPException

DB_PATH = os.path.join(os.path.dirname(__file__), "dev.db")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def record_payment(
    invoice_id: str,
    amount: float,
    method: str = "BANK_TRANSFER",
    payment_date: Optional[str] = None,
    note: Optional[str] = None,
    created_by: Optional[str] = None,
    user: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    POST /payments:
    Records a payment against an invoice.
    Reject payments on cancelled invoices.
    After saving, if the sum of payments is at least the invoice total, set the invoice to Paid.
    Partial payments keep the invoice Confirmed, showing the outstanding balance.
    """
    if not invoice_id:
        raise HTTPException(status_code=400, detail="invoice_id is required")

    try:
        numeric_amount = float(amount)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="amount must be a valid number")

    if numeric_amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # 1. Fetch invoice
        cursor.execute(
            "SELECT id, invoiceNumber, customer_id, status, total_amount FROM invoices WHERE id = ?",
            (invoice_id,)
        )
        invoice = cursor.fetchone()
        if not invoice:
            raise HTTPException(status_code=404, detail=f"Invoice '{invoice_id}' not found")

        # Customer scoping check: customers can only pay their own invoices
        if user and str(user.get("role", "")).upper() == "CUSTOMER":
            if invoice["customer_id"] != user.get("id"):
                raise HTTPException(status_code=403, detail="Forbidden: You cannot pay another customer's invoice")

        # Reject payments on cancelled invoices
        if invoice["status"].upper() == "CANCELLED":
            raise HTTPException(status_code=400, detail="Cannot record payment on a CANCELLED invoice.")

        # 2. Insert payment
        payment_id = str(uuid.uuid4())
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        effective_date = payment_date if payment_date else now_dt.strftime("%Y-%m-%d %H:%M:%S")
        effective_creator = created_by or (user.get("id") if user else None)
        norm_method = method.upper().strip() if method else "BANK_TRANSFER"

        cursor.execute(
            """INSERT INTO payments (id, invoice_id, method, amount, payment_date, note, created_by, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (payment_id, invoice_id, norm_method, numeric_amount, effective_date, note, effective_creator, now_dt.strftime("%Y-%m-%d %H:%M:%S"))
        )

        # 3. Calculate sum of payments using SQL aggregate (SUM) - no Python loops
        cursor.execute("SELECT COALESCE(SUM(amount), 0.0) FROM payments WHERE invoice_id = ?", (invoice_id,))
        total_paid = round(float(cursor.fetchone()[0]), 2)
        invoice_total = round(float(invoice["total_amount"]), 2)
        balance_due = max(0.0, round(invoice_total - total_paid, 2))

        # 4. Status transition
        if total_paid >= invoice_total:
            new_status = "PAID"
        else:
            new_status = "CONFIRMED"

        cursor.execute(
            "UPDATE invoices SET status = ?, updated_at = ? WHERE id = ?",
            (new_status, now_dt.strftime("%Y-%m-%d %H:%M:%S"), invoice_id)
        )

        conn.commit()

        return {
            "message": "Payment recorded successfully",
            "payment": {
                "id": payment_id,
                "invoice_id": invoice_id,
                "method": norm_method,
                "amount": numeric_amount,
                "payment_date": effective_date,
                "note": note,
                "created_by": effective_creator,
            },
            "invoice": {
                "id": invoice["id"],
                "invoice_number": invoice["invoiceNumber"],
                "status": new_status,
                "total_amount": invoice_total,
                "amount_paid": total_paid,
                "balance_due": balance_due,
            },
            "amount_paid": total_paid,
            "balance_due": balance_due,
        }
    finally:
        conn.close()


def get_payments(
    invoice_id: Optional[str] = None,
    method: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    customer_id: Optional[str] = None,
    user: Optional[Dict[str, Any]] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    """
    GET /payments: List with filters (invoice, method, date range) and pagination.
    Uses customer_scoping_helper from deps.py.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # Customer Scoping
        scoped_filters = customer_scoping_helper(user or {}, {"customer_id": customer_id} if customer_id else {})
        effective_cust_id = scoped_filters.get("customer_id")

        conditions = []
        params = []

        if invoice_id:
            conditions.append("p.invoice_id = ?")
            params.append(invoice_id)

        if method and method.upper() != "ALL":
            conditions.append("p.method = ?")
            params.append(method.upper())

        if start_date:
            conditions.append("p.payment_date >= ?")
            params.append(start_date)

        if end_date:
            conditions.append("p.payment_date <= ?")
            params.append(end_date if " " in end_date else f"{end_date} 23:59:59")

        if effective_cust_id:
            conditions.append("inv.customer_id = ?")
            params.append(effective_cust_id)

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        # SQL Aggregate for total count & total amount
        count_sql = f"""
            SELECT COUNT(*), COALESCE(SUM(p.amount), 0.0)
            FROM payments p
            JOIN invoices inv ON p.invoice_id = inv.id
            WHERE {where_clause}
        """
        cursor.execute(count_sql, params)
        row = cursor.fetchone()
        total_records = row[0]
        total_amount = round(float(row[1]), 2)

        # Pagination
        limit = max(1, min(100, int(page_size)))
        offset = max(0, (max(1, int(page)) - 1) * limit)

        # Data query
        data_sql = f"""
            SELECT p.id, p.invoice_id, p.method, p.amount, p.payment_date, p.note, p.created_by,
                   inv.invoiceNumber, inv.status as invoice_status, inv.total_amount,
                   u.name as customer_name, u.email as customer_email
            FROM payments p
            JOIN invoices inv ON p.invoice_id = inv.id
            JOIN users u ON inv.customer_id = u.id
            WHERE {where_clause}
            ORDER BY p.payment_date DESC
            LIMIT ? OFFSET ?
        """
        cursor.execute(data_sql, params + [limit, offset])
        rows = cursor.fetchall()

        payments_list = []
        for r in rows:
            payments_list.append({
                "id": r["id"],
                "invoice_id": r["invoice_id"],
                "invoice_number": r["invoiceNumber"],
                "method": r["method"],
                "amount": float(r["amount"]),
                "payment_date": r["payment_date"],
                "note": r["note"],
                "created_by": r["created_by"],
                "customer": {
                    "name": r["customer_name"],
                    "email": r["customer_email"],
                },
                "invoice": {
                    "id": r["invoice_id"],
                    "invoice_number": r["invoiceNumber"],
                    "status": r["invoice_status"],
                    "total_amount": float(r["total_amount"]),
                }
            })

        return {
            "payments": payments_list,
            "total": total_records,
            "page": int(page),
            "page_size": limit,
            "total_pages": math.ceil(total_records / limit) if limit > 0 else 1,
            "total_amount": total_amount,
        }
    finally:
        conn.close()


def get_invoice_payment_views(
    type: str = "all",
    customer_id: Optional[str] = None,
    user: Optional[Dict[str, Any]] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    """
    Invoice payment views: paid versus outstanding lists, with amount_paid and balance_due per invoice.
    Uses SQL aggregates (SUM(amount)) via subquery/join.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        scoped_filters = customer_scoping_helper(user or {}, {"customer_id": customer_id} if customer_id else {})
        effective_cust_id = scoped_filters.get("customer_id")

        conditions = []
        params = []

        if type.lower() == "paid":
            conditions.append("inv.status = 'PAID'")
        elif type.lower() == "outstanding":
            conditions.append("inv.status NOT IN ('PAID', 'CANCELLED')")

        if effective_cust_id:
            conditions.append("inv.customer_id = ?")
            params.append(effective_cust_id)

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        count_sql = f"SELECT COUNT(*) FROM invoices inv WHERE {where_clause}"
        cursor.execute(count_sql, params)
        total_records = cursor.fetchone()[0]

        limit = max(1, min(100, int(page_size)))
        offset = max(0, (max(1, int(page)) - 1) * limit)

        # SQL Aggregate subquery computes amount_paid and balance_due per invoice
        data_sql = f"""
            SELECT inv.id, inv.invoiceNumber, inv.status, inv.invoice_date, inv.due_date,
                   inv.subtotal, inv.tax_amount, inv.discount_amount, inv.total_amount,
                   u.id as customer_id, u.name as customer_name, u.email as customer_email,
                   COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = inv.id), 0.0) as amount_paid
            FROM invoices inv
            JOIN users u ON inv.customer_id = u.id
            WHERE {where_clause}
            ORDER BY inv.created_at DESC
            LIMIT ? OFFSET ?
        """
        cursor.execute(data_sql, params + [limit, offset])
        rows = cursor.fetchall()

        invoices_list = []
        for r in rows:
            tot = float(r["total_amount"])
            paid = round(float(r["amount_paid"]), 2)
            bal = max(0.0, round(tot - paid, 2))
            invoices_list.append({
                "id": r["id"],
                "invoice_number": r["invoiceNumber"],
                "status": r["status"],
                "invoice_date": r["invoice_date"],
                "due_date": r["due_date"],
                "total_amount": tot,
                "amount_paid": paid,
                "balance_due": bal,
                "customer": {
                    "id": r["customer_id"],
                    "name": r["customer_name"],
                    "email": r["customer_email"],
                }
            })

        return {
            "invoices": invoices_list,
            "total": total_records,
            "page": int(page),
            "page_size": limit,
            "total_pages": math.ceil(total_records / limit) if limit > 0 else 1,
        }
    finally:
        conn.close()


def get_overdue_invoices(
    today: Optional[str] = None,
    customer_id: Optional[str] = None,
    user: Optional[Dict[str, Any]] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    """
    Overdue query: invoices where due_date is before today and the status is not Paid or Cancelled.
    Uses compound index on invoices(status, due_date, customer_id).
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        ref_date = today or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

        scoped_filters = customer_scoping_helper(user or {}, {"customer_id": customer_id} if customer_id else {})
        effective_cust_id = scoped_filters.get("customer_id")

        conditions = [
            "inv.due_date < ?",
            "inv.status NOT IN ('PAID', 'CANCELLED')",
        ]
        params = [ref_date]

        if effective_cust_id:
            conditions.append("inv.customer_id = ?")
            params.append(effective_cust_id)

        where_clause = " AND ".join(conditions)

        count_sql = f"SELECT COUNT(*) FROM invoices inv WHERE {where_clause}"
        cursor.execute(count_sql, params)
        total_records = cursor.fetchone()[0]

        limit = max(1, min(100, int(page_size)))
        offset = max(0, (max(1, int(page)) - 1) * limit)

        data_sql = f"""
            SELECT inv.id, inv.invoiceNumber, inv.status, inv.due_date, inv.invoice_date,
                   inv.total_amount, u.name as customer_name, u.email as customer_email,
                   COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = inv.id), 0.0) as amount_paid
            FROM invoices inv
            JOIN users u ON inv.customer_id = u.id
            WHERE {where_clause}
            ORDER BY inv.due_date ASC
            LIMIT ? OFFSET ?
        """
        cursor.execute(data_sql, params + [limit, offset])
        rows = cursor.fetchall()

        overdue_list = []
        now_dt = datetime.datetime.fromisoformat(ref_date.replace("Z", "+00:00")) if "T" in ref_date else datetime.datetime.strptime(ref_date, "%Y-%m-%d %H:%M:%S")

        for r in rows:
            tot = float(r["total_amount"])
            paid = round(float(r["amount_paid"]), 2)
            bal = max(0.0, round(tot - paid, 2))

            # calculate days overdue
            due_str = r["due_date"]
            due_dt = datetime.datetime.fromisoformat(due_str.replace("Z", "+00:00")) if "T" in due_str else datetime.datetime.strptime(due_str, "%Y-%m-%d %H:%M:%S")
            days_overdue = max(1, (now_dt - due_dt).days)

            overdue_list.append({
                "id": r["id"],
                "invoice_number": r["invoiceNumber"],
                "status": r["status"],
                "due_date": r["due_date"],
                "invoice_date": r["invoice_date"],
                "total_amount": tot,
                "amount_paid": paid,
                "balance_due": bal,
                "days_overdue": days_overdue,
                "customer": {
                    "name": r["customer_name"],
                    "email": r["customer_email"],
                }
            })

        return {
            "overdue_invoices": overdue_list,
            "total": total_records,
            "page": int(page),
            "page_size": limit,
            "total_pages": math.ceil(total_records / limit) if limit > 0 else 1,
            "reference_date": ref_date,
        }
    finally:
        conn.close()


def get_reports_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    customer_id: Optional[str] = None,
    subscription_status: Optional[str] = None,
    user: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    GET /reports/summary:
    Returns active subscription count, revenue collected, total outstanding and overdue count.
    Filters: date range, customer and subscription status.
    Uses SQL aggregates (SUM, COUNT) - NO loops in Python.
    """
    t0 = time.time()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        scoped_filters = customer_scoping_helper(user or {}, {"customer_id": customer_id} if customer_id else {})
        effective_cust_id = scoped_filters.get("customer_id")
        now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

        # 1. Active subscription count (SQL COUNT)
        sub_conditions = []
        sub_params = []
        if subscription_status and subscription_status.upper() != "ALL":
            sub_conditions.append("status = ?")
            sub_params.append(subscription_status.upper())
        else:
            sub_conditions.append("status = 'ACTIVE'")

        if effective_cust_id:
            sub_conditions.append("customer_id = ?")
            sub_params.append(effective_cust_id)

        sub_where = " AND ".join(sub_conditions)
        cursor.execute(f"SELECT COUNT(*) FROM subscriptions WHERE {sub_where}", sub_params)
        active_subscriptions_count = cursor.fetchone()[0]

        # 2. Revenue collected (SQL SUM of payments)
        pay_conditions = []
        pay_params = []
        if start_date:
            pay_conditions.append("p.payment_date >= ?")
            pay_params.append(start_date)
        if end_date:
            pay_conditions.append("p.payment_date <= ?")
            pay_params.append(end_date if " " in end_date else f"{end_date} 23:59:59")
        if effective_cust_id:
            pay_conditions.append("inv.customer_id = ?")
            pay_params.append(effective_cust_id)

        pay_where = " AND ".join(pay_conditions) if pay_conditions else "1=1"
        cursor.execute(
            f"""SELECT COALESCE(SUM(p.amount), 0.0), COUNT(p.id)
                FROM payments p
                JOIN invoices inv ON p.invoice_id = inv.id
                WHERE {pay_where}""",
            pay_params
        )
        row = cursor.fetchone()
        revenue_collected = round(float(row[0]), 2)
        payments_count = row[1]

        # 3. Total outstanding (SQL SUM of unpaid invoice totals minus partial payments)
        unpaid_conditions = ["inv.status NOT IN ('PAID', 'CANCELLED')"]
        unpaid_params = []
        if start_date:
            unpaid_conditions.append("inv.invoice_date >= ?")
            unpaid_params.append(start_date)
        if end_date:
            unpaid_conditions.append("inv.invoice_date <= ?")
            unpaid_params.append(end_date if " " in end_date else f"{end_date} 23:59:59")
        if effective_cust_id:
            unpaid_conditions.append("inv.customer_id = ?")
            unpaid_params.append(effective_cust_id)

        unpaid_where = " AND ".join(unpaid_conditions)
        cursor.execute(
            f"""SELECT COALESCE(SUM(inv.total_amount), 0.0),
                       COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id IN (SELECT id FROM invoices inv WHERE {unpaid_where})), 0.0),
                       COUNT(inv.id)
                FROM invoices inv
                WHERE {unpaid_where}""",
            unpaid_params + unpaid_params
        )
        unpaid_row = cursor.fetchone()
        total_inv_amt = float(unpaid_row[0])
        partial_on_unpaid = float(unpaid_row[1])
        total_outstanding = max(0.0, round(total_inv_amt - partial_on_unpaid, 2))
        unpaid_count = unpaid_row[2]

        # 4. Overdue count & overdue debt (SQL COUNT & SUM)
        overdue_conditions = [
            "inv.due_date < ?",
            "inv.status NOT IN ('PAID', 'CANCELLED')",
        ]
        overdue_params = [now_str]
        if effective_cust_id:
            overdue_conditions.append("inv.customer_id = ?")
            overdue_params.append(effective_cust_id)

        overdue_where = " AND ".join(overdue_conditions)
        cursor.execute(
            f"""SELECT COUNT(*),
                       COALESCE(SUM(inv.total_amount), 0.0),
                       COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id IN (SELECT id FROM invoices inv WHERE {overdue_where})), 0.0)
                FROM invoices inv
                WHERE {overdue_where}""",
            overdue_params + overdue_params
        )
        od_row = cursor.fetchone()
        overdue_count = od_row[0]
        overdue_debt = max(0.0, round(float(od_row[1]) - float(od_row[2]), 2))

        # 5. MRR (SQL SUM on subscription lines)
        mrr_conditions = ["s.status = 'ACTIVE'"]
        mrr_params = []
        if effective_cust_id:
            mrr_conditions.append("s.customer_id = ?")
            mrr_params.append(effective_cust_id)

        mrr_where = " AND ".join(mrr_conditions)
        cursor.execute(
            f"""SELECT COALESCE(SUM(sl.amount), 0.0)
                FROM subscription_lines sl
                JOIN subscriptions s ON sl.subscription_id = s.id
                WHERE {mrr_where}""",
            mrr_params
        )
        mrr = round(float(cursor.fetchone()[0]), 2)

        latency_ms = round((time.time() - t0) * 1000, 2)

        return {
            "active_subscriptions_count": active_subscriptions_count,
            "revenue_collected": revenue_collected,
            "total_outstanding": total_outstanding,
            "overdue_count": overdue_count,
            "overdue_amount": overdue_debt,
            "unpaid_invoices_count": unpaid_count,
            "total_payments_count": payments_count,
            "mrr": mrr,
            "latency_ms": latency_ms,
            "under_2_seconds": latency_ms < 2000.0,
            "filters_applied": {
                "start_date": start_date,
                "end_date": end_date,
                "customer_id": effective_cust_id,
                "subscription_status": subscription_status,
            }
        }
    finally:
        conn.close()
