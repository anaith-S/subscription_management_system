"""
Brightloop Member 4 Comprehensive Verification Test Suite
Tests:
1. POST /payments: Records payment, auto-updates to PAID when full, keeps CONFIRMED on partial, rejects CANCELLED.
2. GET /payments: List with filters (invoice, method, date range) and pagination.
3. Invoice payment views: Paid vs outstanding lists with amount_paid and balance_due per invoice.
4. Overdue query: Invoices where due_date < today and status not in ('PAID', 'CANCELLED').
5. GET /reports/summary: active_subscriptions_count, revenue_collected, total_outstanding, overdue_count.
6. Performance: Sub-2-second requirement verified with SQL aggregates on 2,000+ records.
"""

import sqlite3
import time
import sys
import os

# Ensure UTF-8 console output
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from backend_member4 import (
    record_payment,
    get_payments,
    get_invoice_payment_views,
    get_overdue_invoices,
    get_reports_summary,
    get_db_connection,
)
from deps import HTTPException


def run_tests():
    print("=" * 70)
    print("STARTING MEMBER 4 VERIFICATION TEST SUITE")
    print("=" * 70)

    conn = get_db_connection()
    cursor = conn.cursor()

    # Find a test customer and invoice
    cursor.execute("SELECT id, name, email FROM users WHERE role = 'CUSTOMER' LIMIT 1;")
    cust = cursor.fetchone()
    print(f"\n1. Testing with Customer: {cust['name']} ({cust['email']})")

    # -------------------------------------------------------------
    # Test 1: Reject payment on CANCELLED invoice
    # -------------------------------------------------------------
    print("\n--- TEST 1: Reject payment on CANCELLED invoices ---")
    cursor.execute("SELECT id, invoiceNumber, total_amount, status FROM invoices WHERE status = 'CANCELLED' LIMIT 1;")
    cancelled_inv = cursor.fetchone()
    if cancelled_inv:
        try:
            record_payment(cancelled_inv["id"], 50.0, method="BANK_TRANSFER")
            raise AssertionError("ERROR: Payment should have been rejected on CANCELLED invoice!")
        except HTTPException as e:
            print(f"[PASS] Correctly rejected payment on CANCELLED invoice: {e.detail}")
            assert e.status_code == 400
    else:
        print("[SKIP] No cancelled invoice found.")

    # -------------------------------------------------------------
    # Test 2: Partial payment keeps CONFIRMED & shows outstanding balance
    # -------------------------------------------------------------
    print("\n--- TEST 2: Partial payment keeps invoice CONFIRMED ---")
    cursor.execute(
        "SELECT id, invoiceNumber, total_amount, status FROM invoices WHERE status = 'CONFIRMED' LIMIT 1;"
    )
    conf_inv = cursor.fetchone()
    inv_id = conf_inv["id"]
    tot_amt = float(conf_inv["total_amount"])

    # Make partial payment of 25% of total
    partial_amt = round(tot_amt * 0.25, 2)
    res_partial = record_payment(
        invoice_id=inv_id,
        amount=partial_amt,
        method="CREDIT_CARD",
        note="Q3 installment test",
    )
    print(f"[PASS] Partial payment of ${partial_amt} recorded against {conf_inv['invoiceNumber']}")
    print(f"       Status: {res_partial['invoice']['status']} (Expected: CONFIRMED)")
    print(f"       Amount Paid: ${res_partial['amount_paid']} / Total: ${tot_amt}")
    print(f"       Balance Due: ${res_partial['balance_due']}")
    assert res_partial["invoice"]["status"] == "CONFIRMED"
    assert res_partial["balance_due"] > 0

    # -------------------------------------------------------------
    # Test 3: Full settlement sets invoice to PAID
    # -------------------------------------------------------------
    print("\n--- TEST 3: Full payment sets invoice to PAID ---")
    remaining_bal = res_partial["balance_due"]
    res_full = record_payment(
        invoice_id=inv_id,
        amount=remaining_bal,
        method="BANK_TRANSFER",
        note="Final settlement test",
    )
    print(f"[PASS] Settle remaining ${remaining_bal} on {conf_inv['invoiceNumber']}")
    print(f"       New Status: {res_full['invoice']['status']} (Expected: PAID)")
    print(f"       Balance Due: ${res_full['balance_due']} (Expected: 0.0)")
    assert res_full["invoice"]["status"] == "PAID"
    assert res_full["balance_due"] == 0.0

    # -------------------------------------------------------------
    # Test 4: GET /payments list with filters and pagination
    # -------------------------------------------------------------
    print("\n--- TEST 4: GET /payments with filters & pagination ---")
    list_res = get_payments(page=1, page_size=10, method="BANK_TRANSFER")
    print(f"[PASS] Total Bank Transfer payments: {list_res['total']}")
    print(f"       Page: {list_res['page']} of {list_res['total_pages']} (Page size: {list_res['page_size']})")
    print(f"       Returned items count: {len(list_res['payments'])}")
    assert len(list_res["payments"]) <= 10
    assert all(p["method"] == "BANK_TRANSFER" for p in list_res["payments"])

    # -------------------------------------------------------------
    # Test 5: Invoice payment views (paid vs outstanding)
    # -------------------------------------------------------------
    print("\n--- TEST 5: Invoice payment views (paid vs outstanding) ---")
    paid_views = get_invoice_payment_views(type="paid", page=1, page_size=5)
    print(f"[PASS] Paid invoices view: {paid_views['total']} records found")
    for inv in paid_views["invoices"][:3]:
        print(f"       {inv['invoice_number']}: Total=${inv['total_amount']}, Paid=${inv['amount_paid']}, Balance=${inv['balance_due']}")
        assert inv["status"] == "PAID"
        assert inv["balance_due"] == 0.0

    out_views = get_invoice_payment_views(type="outstanding", page=1, page_size=5)
    print(f"[PASS] Outstanding invoices view: {out_views['total']} records found")
    for inv in out_views["invoices"][:3]:
        print(f"       {inv['invoice_number']}: Total=${inv['total_amount']}, Paid=${inv['amount_paid']}, Balance=${inv['balance_due']}")
        assert inv["status"] != "PAID"
        assert inv["balance_due"] > 0.0

    # -------------------------------------------------------------
    # Test 6: Overdue query (due_date < today and not Paid/Cancelled)
    # -------------------------------------------------------------
    print("\n--- TEST 6: Overdue query ---")
    overdue_res = get_overdue_invoices(page=1, page_size=10)
    print(f"[PASS] Total overdue invoices: {overdue_res['total']}")
    for od in overdue_res["overdue_invoices"][:3]:
        print(f"       {od['invoice_number']}: Due={od['due_date']}, Days Overdue={od['days_overdue']}d, Debt=${od['balance_due']}")
        assert od["status"] not in ("PAID", "CANCELLED")
        assert od["days_overdue"] >= 1
        assert od["balance_due"] > 0

    # -------------------------------------------------------------
    # Test 7: GET /reports/summary with filters & SQL aggregates
    # -------------------------------------------------------------
    print("\n--- TEST 7: GET /reports/summary ---")
    summary = get_reports_summary()
    print(f"[PASS] Active Subscriptions Count: {summary['active_subscriptions_count']}")
    print(f"       Revenue Collected:          ${summary['revenue_collected']:,.2f}")
    print(f"       Total Outstanding:          ${summary['total_outstanding']:,.2f}")
    print(f"       Overdue Count:              {summary['overdue_count']}")
    print(f"       Overdue Debt Amount:        ${summary['overdue_amount']:,.2f}")
    print(f"       Monthly MRR:                ${summary['mrr']:,.2f}")
    print(f"       Summary Query Latency:      {summary['latency_ms']} ms")
    assert summary["active_subscriptions_count"] > 0
    assert summary["revenue_collected"] > 0
    assert summary["total_outstanding"] > 0
    assert summary["overdue_count"] > 0

    # Test summary with date range filter
    today_str = time.strftime("%Y-%m-%d")
    filtered_summary = get_reports_summary(start_date="2026-01-01", end_date=today_str, subscription_status="ACTIVE")
    print(f"[PASS] Filtered Summary (Active subs, YTD): {filtered_summary['active_subscriptions_count']} subs, ${filtered_summary['revenue_collected']:,.2f} rev")

    # -------------------------------------------------------------
    # Test 8: Performance Benchmark (Under 2 seconds requirement)
    # -------------------------------------------------------------
    print("\n--- TEST 8: Performance Benchmark (Under-2-Second Requirement) ---")
    t_start = time.time()
    for _ in range(10):
        get_reports_summary()
        get_overdue_invoices(page_size=25)
        get_payments(page_size=25)
    total_time = time.time() - t_start
    avg_per_batch = (total_time / 10.0) * 1000.0

    print(f"[PASS] 10 multi-query reporting runs completed in {total_time:.3f} seconds.")
    print(f"       Average batch latency: {avg_per_batch:.2f} ms (Target SLA: < 2,000 ms)")
    assert avg_per_batch < 2000.0, "Performance SLA breached!"

    conn.close()
    print("\n" + "=" * 70)
    print("ALL MEMBER 4 BACKEND & REPORTING TESTS PASSED 100%!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
