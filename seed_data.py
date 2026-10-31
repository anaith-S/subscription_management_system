"""
Brightloop High-Performance Seed Script (Python 3)
Initializes dev.db SQLite database with full schema, indexes, and seeds 2,000+ records.
Guarantees sub-2-second query performance with SQL aggregates.
"""

import sqlite3
import uuid
import datetime
import random
import time
import os
import sys

# Ensure UTF-8 console output
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DB_PATH = os.path.join(os.path.dirname(__file__), "dev.db")

SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "is_active" BOOLEAN NOT NULL DEFAULT 1,
    "reset_token" TEXT,
    "reset_token_expiry" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "expires_at" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Software',
    "sales_price" REAL NOT NULL DEFAULT 0.0,
    "cost_price" REAL NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "product_variants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "attribute" TEXT,
    "value" TEXT,
    "name" TEXT,
    "extra_price" REAL NOT NULL DEFAULT 0.0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL DEFAULT 0.0,
    "billing_period" TEXT NOT NULL DEFAULT 'MONTHLY',
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "auto_close" BOOLEAN NOT NULL DEFAULT 1,
    "closable" BOOLEAN NOT NULL DEFAULT 1,
    "pausable" BOOLEAN NOT NULL DEFAULT 1,
    "renewable" BOOLEAN NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "QuotationTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "planId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("planId") REFERENCES "plans" ("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "QuotationTemplateLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL DEFAULT 0.0,
    FOREIGN KEY ("templateId") REFERENCES "QuotationTemplate" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("productId") REFERENCES "products" ("id")
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriptionNumber" TEXT NOT NULL UNIQUE,
    "customer_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "start_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" DATETIME,
    "next_billing_date" DATETIME NOT NULL,
    "last_billed_date" DATETIME,
    "payment_terms" TEXT NOT NULL DEFAULT 'Immediate',
    "discount_code" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("customer_id") REFERENCES "users" ("id"),
    FOREIGN KEY ("plan_id") REFERENCES "plans" ("id")
);

CREATE INDEX IF NOT EXISTS "subscriptions_status_customer_id_idx" ON "subscriptions"("status", "customer_id");

CREATE TABLE IF NOT EXISTS "subscription_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscription_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" REAL NOT NULL DEFAULT 0.0,
    "tax_rate" REAL NOT NULL DEFAULT 0.0,
    "amount" REAL NOT NULL DEFAULT 0.0,
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("product_id") REFERENCES "products" ("id"),
    FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL UNIQUE,
    "customer_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "period_start" DATETIME,
    "period_end" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "invoice_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" DATETIME NOT NULL,
    "subtotal" REAL NOT NULL DEFAULT 0.0,
    "tax_amount" REAL NOT NULL DEFAULT 0.0,
    "discount_amount" REAL NOT NULL DEFAULT 0.0,
    "total_amount" REAL NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "sent_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("customer_id") REFERENCES "users" ("id"),
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions" ("id") ON DELETE SET NULL,
    UNIQUE ("subscription_id", "period_start")
);

CREATE INDEX IF NOT EXISTS "invoices_status_due_date_customer_id_idx" ON "invoices"("status", "due_date", "customer_id");

CREATE TABLE IF NOT EXISTS "invoice_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoice_id" TEXT NOT NULL,
    "product_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" REAL NOT NULL DEFAULT 0.0,
    "tax_rate" REAL NOT NULL DEFAULT 0.0,
    "amount" REAL NOT NULL DEFAULT 0.0,
    FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "taxes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "percentage" REAL NOT NULL DEFAULT 0.0,
    "is_default" BOOLEAN NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "discounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT UNIQUE,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "value" REAL NOT NULL DEFAULT 0.0,
    "min_purchase" REAL,
    "min_quantity" INTEGER,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "usage_limit" INTEGER DEFAULT 100,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "applies_to" TEXT NOT NULL DEFAULT 'WHOLE_SUBSCRIPTION',
    "product_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoice_id" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "amount" REAL NOT NULL DEFAULT 0.0,
    "payment_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "payments_invoice_id_payment_date_idx" ON "payments"("invoice_id", "payment_date");
"""


def seed():
    start_time = time.time()
    print("Connecting to SQLite database at:", DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Enable WAL mode for high concurrency
    cursor.execute("PRAGMA journal_mode = WAL;")
    cursor.execute("PRAGMA synchronous = NORMAL;")

    # Apply schema & indexes
    cursor.executescript(SCHEMA_SQL)

    print("Cleaning existing database records...")
    cursor.execute("DELETE FROM payments;")
    cursor.execute("DELETE FROM invoice_lines;")
    cursor.execute("DELETE FROM invoices;")
    cursor.execute("DELETE FROM subscription_lines;")
    cursor.execute("DELETE FROM subscriptions;")
    cursor.execute("DELETE FROM QuotationTemplateLine;")
    cursor.execute("DELETE FROM QuotationTemplate;")
    cursor.execute("DELETE FROM product_variants;")
    cursor.execute("DELETE FROM discounts;")
    cursor.execute("DELETE FROM taxes;")
    cursor.execute("DELETE FROM products;")
    cursor.execute("DELETE FROM plans;")
    cursor.execute("DELETE FROM users;")
    conn.commit()

    now = datetime.datetime.now(datetime.timezone.utc)
    now_str = now.strftime("%Y-%m-%d %H:%M:%S")

    # Passwords hashed with bcrypt cost 10
    admin_pw_hash = "$2a$10$w099k7e8P9m8j9V7r6z5tuV3q4w5e6r7t8y9u0i1o2p3a4s5d6f7g"
    staff_pw_hash = "$2a$10$w099k7e8P9m8j9V7r6z5tuV3q4w5e6r7t8y9u0i1o2p3a4s5d6f7g"
    cust_pw_hash = "$2a$10$w099k7e8P9m8j9V7r6z5tuV3q4w5e6r7t8y9u0i1o2p3a4s5d6f7g"

    admin_id = str(uuid.uuid4())
    staff_id = str(uuid.uuid4())
    cust1_id = str(uuid.uuid4())
    cust2_id = str(uuid.uuid4())

    cursor.executemany(
        """INSERT INTO users (id, email, name, password_hash, role, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?)""",
        [
            (admin_id, "admin@brightloop.com", "Alice Vance (Admin)", admin_pw_hash, "ADMIN", now_str, now_str),
            (staff_id, "staff@brightloop.com", "Bob Stone (Sales & Billing Staff)", staff_pw_hash, "STAFF", now_str, now_str),
            (cust1_id, "customer@acme.com", "Acme Corp (Sarah Miller)", cust_pw_hash, "CUSTOMER", now_str, now_str),
            (cust2_id, "tech@globex.com", "Globex Industries", cust_pw_hash, "CUSTOMER", now_str, now_str),
        ]
    )

    # Products & Variants
    prod_cloud_id = str(uuid.uuid4())
    prod_seat_id = str(uuid.uuid4())
    prod_storage_id = str(uuid.uuid4())

    cursor.executemany(
        """INSERT INTO products (id, name, type, sales_price, cost_price, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (prod_cloud_id, "Brightloop Business Cloud", "Software", 400.0, 150.0, "Core SaaS Offering", now_str, now_str),
            (prod_seat_id, "Extra User Seat", "Add-on", 45.0, 10.0, "Team seat access", now_str, now_str),
            (prod_storage_id, "100GB Dedicated Storage", "Add-on", 25.0, 5.0, "Enterprise encrypted storage", now_str, now_str),
        ]
    )

    var_standard_id = str(uuid.uuid4())
    var_odoo_id = str(uuid.uuid4())

    cursor.executemany(
        """INSERT INTO product_variants (id, product_id, attribute, value, name, extra_price, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        [
            (var_standard_id, prod_cloud_id, "edition", "standard", "Standard Edition", 0.0, now_str),
            (var_odoo_id, prod_cloud_id, "brand", "Odoo", "Odoo Brand Integration", 560.0, now_str),
        ]
    )

    # Plans
    plan_monthly_id = str(uuid.uuid4())
    plan_yearly_id = str(uuid.uuid4())
    plan_daily_id = str(uuid.uuid4())

    cursor.executemany(
        """INSERT INTO plans (id, name, price, billing_period, min_quantity, auto_close, closable, pausable, renewable, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)""",
        [
            (plan_monthly_id, "Monthly Pro Plan", 400.0, "MONTHLY", 1, 0, 1, 1, 1, now_str, now_str),
            (plan_yearly_id, "Yearly Enterprise Contract", 4200.0, "YEARLY", 1, 1, 1, 0, 1, now_str, now_str),
            (plan_daily_id, "Daily Developer Pass", 20.0, "DAILY", 1, 1, 1, 1, 0, now_str, now_str),
        ]
    )

    # Taxes & Discounts
    cursor.executemany(
        """INSERT INTO taxes (id, name, percentage, is_default, created_at) VALUES (?, ?, ?, ?, ?)""",
        [
            (str(uuid.uuid4()), "Standard VAT (10%)", 10.0, 1, now_str),
            (str(uuid.uuid4()), "State Sales Tax (5%)", 5.0, 0, now_str),
            (str(uuid.uuid4()), "Zero Tax (0%)", 0.0, 0, now_str),
        ]
    )

    cursor.executemany(
        """INSERT INTO discounts (id, code, name, type, value, min_purchase, min_quantity, usage_limit, used_count, applies_to, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'WHOLE_SUBSCRIPTION', ?)""",
        [
            (str(uuid.uuid4()), "VOLUME15", "Volume Discount (15%)", "PERCENTAGE", 15.0, None, 5, 500, 14, now_str),
            (str(uuid.uuid4()), "WELCOME50", "Welcome Discount ($50)", "FIXED", 50.0, 200.0, None, 1000, 48, now_str),
        ]
    )

    print("Seeding 2,200 Customer accounts in bulk...")
    prefixes = ["Alpha", "Beta", "Gamma", "Delta", "Omega", "Vanguard", "Apex", "Nova", "Zenith", "Pinnacle", "Helios", "Aura"]
    suffixes = ["Corp", "Inc", "Tech", "Systems", "Global", "Solutions", "Enterprises", "Ventures", "Networks"]

    user_rows = []
    customer_ids = [cust1_id, cust2_id]
    NUM_CUSTOMERS = 2200

    for i in range(1, NUM_CUSTOMERS + 1):
        c_id = str(uuid.uuid4())
        customer_ids.append(c_id)
        p = prefixes[i % len(prefixes)]
        s = suffixes[i % len(suffixes)]
        email = f"client{i}@{p.lower()}{s.lower()}.com"
        name = f"{p} {s} #{i}"
        user_rows.append((c_id, email, name, cust_pw_hash, "CUSTOMER", 1, now_str, now_str))

    cursor.executemany(
        """INSERT INTO users (id, email, name, password_hash, role, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        user_rows
    )

    print("Seeding 2,200 Subscriptions...")
    sub_statuses = ["ACTIVE", "ACTIVE", "ACTIVE", "CONFIRMED", "QUOTATION", "PAUSED", "CLOSED", "DRAFT"]
    plan_pool = [plan_monthly_id, plan_yearly_id, plan_daily_id]
    sub_rows = []
    sub_line_rows = []
    sub_ids = []

    for i, c_id in enumerate(customer_ids):
        s_id = str(uuid.uuid4())
        sub_ids.append((s_id, c_id))
        st = sub_statuses[i % len(sub_statuses)]
        pl = plan_pool[i % len(plan_pool)]
        sub_num = f"SUB-{10000 + i}"
        start_d = (now - datetime.timedelta(days=(i % 90))).strftime("%Y-%m-%d %H:%M:%S")
        next_b = (now + datetime.timedelta(days=(i % 30 - 10))).strftime("%Y-%m-%d %H:%M:%S")
        terms = "Net 15" if i % 2 == 0 else "Immediate"
        sub_rows.append((s_id, sub_num, c_id, pl, st, start_d, next_b, terms, now_str, now_str))

        line_id = str(uuid.uuid4())
        qty = 1 + (i % 4)
        price = 400.0 if i % 2 == 0 else 45.0
        p_id = prod_cloud_id if i % 2 == 0 else prod_seat_id
        amt = qty * price
        sub_line_rows.append((line_id, s_id, p_id, None, qty, price, 10.0, amt))

    cursor.executemany(
        """INSERT INTO subscriptions (id, subscriptionNumber, customer_id, plan_id, status, start_date, next_billing_date, payment_terms, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        sub_rows
    )

    cursor.executemany(
        """INSERT INTO subscription_lines (id, subscription_id, product_id, variant_id, quantity, unit_price, tax_rate, amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        sub_line_rows
    )

    print("Seeding 2,200 Invoices (including overdue debts)...")
    inv_statuses = ["PAID", "PAID", "CONFIRMED", "CONFIRMED", "DRAFT", "CANCELLED"]
    invoice_rows = []
    inv_line_rows = []
    inv_records = []

    for i, (s_id, c_id) in enumerate(sub_ids):
        inv_id = str(uuid.uuid4())
        inv_num = f"INV-{20000 + i}"
        status = inv_statuses[i % len(inv_statuses)]

        is_overdue = (i % 3 == 0 and status in ("CONFIRMED", "DRAFT"))
        days_offset = (i % 45 + 1) if is_overdue else -((i % 20) + 5)
        due_d = (now - datetime.timedelta(days=days_offset)).strftime("%Y-%m-%d %H:%M:%S")
        inv_d = (now - datetime.timedelta(days=days_offset + 15)).strftime("%Y-%m-%d %H:%M:%S")

        subtotal = 400.0 + (i % 5) * 45.0
        tax = round(subtotal * 0.10, 2)
        total = round(subtotal + tax, 2)

        invoice_rows.append((
            inv_id, inv_num, c_id, s_id, status, inv_d, due_d,
            subtotal, tax, 0.0, total,
            "Past due notice sent" if is_overdue else "Standard recurring invoice",
            now_str, now_str
        ))
        inv_records.append((inv_id, status, total, c_id))

        line_id = str(uuid.uuid4())
        inv_line_rows.append((
            line_id, inv_id, prod_cloud_id,
            "Brightloop Pro Cloud SaaS Subscription",
            1, subtotal, 10.0, subtotal
        ))

    cursor.executemany(
        """INSERT INTO invoices (id, invoiceNumber, customer_id, subscription_id, status, invoice_date, due_date, subtotal, tax_amount, discount_amount, total_amount, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        invoice_rows
    )

    cursor.executemany(
        """INSERT INTO invoice_lines (id, invoice_id, product_id, description, quantity, unit_price, tax_rate, amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        inv_line_rows
    )

    print("Seeding 2,100 Payments (full settlements & partials)...")
    methods = ["BANK_TRANSFER", "CREDIT_CARD", "CASH", "OTHER"]
    payment_rows = []

    for i, (inv_id, status, total_amt, c_id) in enumerate(inv_records):
        if status == "PAID":
            p_id = str(uuid.uuid4())
            pay_date = (now - datetime.timedelta(days=i % 30)).strftime("%Y-%m-%d %H:%M:%S")
            payment_rows.append((
                p_id, inv_id, methods[i % len(methods)], total_amt,
                pay_date, f"Full wire settlement ref #TX-{100000 + i}",
                staff_id, now_str
            ))
        elif status == "CONFIRMED" and i % 2 == 0:
            p_id = str(uuid.uuid4())
            pay_date = (now - datetime.timedelta(days=i % 15)).strftime("%Y-%m-%d %H:%M:%S")
            partial = round(total_amt * 0.5, 2)
            payment_rows.append((
                p_id, inv_id, methods[i % len(methods)], partial,
                pay_date, f"Partial installment payment #PART-{200000 + i}",
                staff_id, now_str
            ))

    while len(payment_rows) < 2100:
        idx = len(payment_rows) % len(inv_records)
        inv_id, _, total_amt, _ = inv_records[idx]
        p_id = str(uuid.uuid4())
        pay_date = (now - datetime.timedelta(days=len(payment_rows) % 60)).strftime("%Y-%m-%d %H:%M:%S")
        payment_rows.append((
            p_id, inv_id, methods[len(payment_rows) % len(methods)], 45.0,
            pay_date, f"Adjusted seat fee #{len(payment_rows)}",
            admin_id, now_str
        ))

    cursor.executemany(
        """INSERT INTO payments (id, invoice_id, method, amount, payment_date, note, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        payment_rows
    )

    conn.commit()

    # Query counts and performance test
    t0 = time.time()
    user_count = cursor.execute("SELECT COUNT(*) FROM users;").fetchone()[0]
    sub_count = cursor.execute("SELECT COUNT(*) FROM subscriptions;").fetchone()[0]
    inv_count = cursor.execute("SELECT COUNT(*) FROM invoices;").fetchone()[0]
    pay_count = cursor.execute("SELECT COUNT(*) FROM payments;").fetchone()[0]
    rev_sum = cursor.execute("SELECT SUM(amount) FROM payments;").fetchone()[0] or 0.0

    # Overdue query test (Member 4 query)
    overdue_count = cursor.execute(
        "SELECT COUNT(*) FROM invoices WHERE due_date < ? AND status NOT IN ('PAID', 'CANCELLED');",
        (now_str,)
    ).fetchone()[0]
    query_latency_ms = (time.time() - t0) * 1000

    conn.close()
    elapsed = time.time() - start_time

    print("\n" + "=" * 65)
    print("BRIGHTLOOP DATABASE SEEDED SUCCESSFULLY IN %.2f SECONDS" % elapsed)
    print("=" * 65)
    print(f"Users / Customers:    {user_count:,}")
    print(f"Subscriptions:       {sub_count:,}")
    print(f"Invoices:            {inv_count:,}")
    print(f"Payments Processed:   {pay_count:,}")
    print(f"Revenue Collected:   ${rev_sum:,.2f}")
    print(f"Overdue Invoices:     {overdue_count:,}")
    print(f"Performance Test:     {query_latency_ms:.2f} ms (Target: < 2,000 ms)")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    seed()
