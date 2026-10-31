# 🚀 Brightloop Subscription Management System - Hackathon Guide

## 🛠️ Quick Start (For All 4 Teammates)

Run these 3 commands to get the entire project and database running locally:
```bash
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Pre-Seeded Accounts (Passwords match strict policy)

| Role | Email | Password | Allowed Access |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@brightloop.com` | `Admin123!@#` | Full system control, manage staff, products, plans, taxes, discounts |
| **Staff** | `staff@brightloop.com` | `Staff123!@#` | Day-to-day operations, quotes, subscriptions, billing, payments |
| **Customer** | `customer@acme.com` | `Customer123!@#` | Self-service portal (only sees their own subscriptions & invoices) |

---

## 👥 4-Member Task Distribution & Feature Branches

```
Repo (main)
  ├── feature/auth-portal           --> Member 1
  ├── feature/catalog-subscriptions --> Member 2
  ├── feature/billing-engine        --> Member 3
  └── feature/payments-dashboard    --> Member 4
```

### 👤 Member 1: Auth, Roles & Customer Portal
* **Branch:** `feature/auth-portal`
* **Target Files:**
  * `src/app/auth/register/page.tsx`: Sign-up page with password policy:
    * Regex: `^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{9,}$` (> 8 characters, uppercase, lowercase, special character).
  * `src/app/auth/login/page.tsx`: Session / mock cookie login.
  * `src/app/auth/reset-password/page.tsx`: Password reset link generator.
  * `src/app/portal/page.tsx`: Customer Self-Service view (strictly filters `where: { customerId: currentUserId }`).

### 👤 Member 2: Products, Plans & Quotation/Subscription Flow
* **Branch:** `feature/catalog-subscriptions`
* **Target Files:**
  * `src/app/products/page.tsx`: Product list & creation with variants (e.g. Odoo brand adds +560).
  * `src/app/plans/page.tsx`: Plan configuration (frequencies: Daily, Weekly, Monthly, Yearly; auto-close, pause, renew toggles).
  * `src/app/subscriptions/page.tsx`:
    * Load from Quotation Template with validity days.
    * Subscription state machine transitions:
      `Draft` ➔ `Quotation` ➔ `Confirmed` ➔ `Active` ➔ `Closed` / `Paused`.

### 👤 Member 3: "Billing Day" Engine, Taxes & Discounts
* **Branch:** `feature/billing-engine`
* **Target Files:**
  * `src/app/api/billing/run/route.ts`: "Billing Day" automated engine:
    * Finds active subscriptions where `nextBillingDate <= today`.
    * Checks `lastBilledDate` to prevent double billing or skipped billing.
    * Generates `Invoice` and `InvoiceLine` items.
    * Advances `nextBillingDate` based on frequency (Daily: +1d, Weekly: +7d, Monthly: +1mo, Yearly: +1yr).
  * `src/app/invoices/page.tsx`: Invoice list & Print/PDF layout.
  * `src/app/discounts/page.tsx`: Admin discount rules (Percentage/Fixed, min seats/amount, usage counter).

### 👤 Member 4: Payments, Overdue Chasing & Finance KPI Dashboard
* **Branch:** `feature/payments-dashboard`
* **Target Files:**
  * `src/app/payments/page.tsx`: Record payment modal (Method: Bank Transfer, Card, Cash; amount, date, notes).
    * Auto-updates invoice from `Confirmed` to `Paid`.
  * `src/app/invoices/overdue/page.tsx`: Overdue invoices tracking & reminder action.
  * `src/app/dashboard/page.tsx`: Finance Lead Executive Overview:
    * Active Subscriptions counter.
    * Monthly Recurring Revenue (MRR) & Total Collected.
    * Outstanding & Overdue Revenue.
    * Filter by date / plan / status with sub-2s query response.

---

## 🗄️ Database Reference (`prisma/schema.prisma`)
Import the Prisma client anywhere in server components or API routes:
```typescript
import { prisma } from "@/lib/prisma";

// Example: Get active subscriptions
const subscriptions = await prisma.subscription.findMany({
  where: { status: "ACTIVE" },
  include: { customer: true, plan: true, lines: true },
});
```
