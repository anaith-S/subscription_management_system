"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Wordmark } from "@/components/brand/Logo";
import MonthLoop, { MONTH_STAGES } from "@/components/brand/MonthLoop";

const BEFORE_AFTER = [
  { today: "Subscriptions live in a spreadsheet", after: "Every subscription has a number, a status and a history" },
  { today: "Renewals are remembered by whoever notices", after: "Billing day finds every subscription that's due" },
  { today: "Invoices are typed by hand each month", after: "Invoices are generated with taxes and discounts applied" },
  { today: "Payments are matched by scrolling bank statements", after: "Each payment is recorded against its invoice" },
  { today: "Revenue reports take a quarter to build", after: "Recurring revenue and overdue amounts, any time" },
];

const ROLES = [
  {
    name: "Admin",
    text: "Sets up products, plans, taxes and discount rules, and adds members of staff.",
  },
  {
    name: "Operations team",
    text: "Turns quotes into subscriptions, runs billing day, records payments and chases overdue invoices.",
  },
  {
    name: "Customers",
    text: "See their own subscriptions and invoices in a portal, without emailing anyone.",
  },
];

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@brightloop.com", password: "Admin123!@#" },
  { label: "Staff", email: "staff@brightloop.com", password: "Staff123!@#" },
  { label: "Customer", email: "customer@acme.com", password: "Customer123!@#" },
];

const SHOW_DEMO = process.env.NODE_ENV !== "production";

export default function HomePage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push(user.role === "CUSTOMER" ? "/portal" : "/dashboard");
    }
  }, [user, loading, router]);

  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long" });

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <section className="relative overflow-hidden bg-deep text-white">
        <header className="mx-auto flex h-20 max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <Wordmark tone="light" />
          <nav className="flex items-center gap-2">
            <Link href="/auth/login" className="rounded-lg px-3.5 py-2 text-[14px] font-medium text-white/80 hover:text-white">
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="rounded-lg bg-white px-4 py-2 text-[14px] font-semibold text-deep hover:bg-zinc-100"
            >
              Create account
            </Link>
          </nav>
        </header>

        <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-6 lg:pb-24 lg:pt-10">
          <div className="max-w-[540px]">
            <h1 className="text-[44px] font-semibold leading-[1.02] sm:text-[60px] lg:text-[68px]">
              Run the whole billing month in one place.
            </h1>
            <p className="mt-6 max-w-[46ch] text-[18px] leading-relaxed text-white/70">
              Plans, subscriptions, invoices, payments and recurring revenue for Brightloop Software, from the first
              sign-up to the month-end numbers.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/auth/login"
                className="rounded-xl bg-marigold px-6 py-3.5 text-[15px] font-semibold text-deep transition-colors hover:bg-amber-400"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="rounded-xl border border-white/25 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/5"
              >
                Create a customer account
              </Link>
            </div>
          </div>

          <div className="mx-auto hidden w-full max-w-[600px] text-white sm:block">
            <MonthLoop monthLabel={monthLabel} />
          </div>

          <div className="sm:hidden">
            <p className="text-[14px] text-white/60">A billing month at Brightloop</p>
            <ol className="mt-4 space-y-3">
              {MONTH_STAGES.map((stage, i) => (
                <li key={stage.title} className="flex items-baseline gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                      i === 3 ? "bg-marigold text-deep" : "border border-white/40 text-white"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-semibold">{stage.title}</span>
                    <span className="text-white/60">, {stage.detail.toLowerCase()}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
        <h2 className="max-w-[20ch] text-[34px] font-semibold leading-tight text-zinc-900 sm:text-[42px]">
          What changes from today
        </h2>
        <div className="mt-12 border-t border-zinc-300">
          <div className="hidden grid-cols-2 gap-10 py-3 text-[13px] font-medium text-zinc-500 sm:grid">
            <span>Today</span>
            <span>With Brightloop</span>
          </div>
          {BEFORE_AFTER.map((row) => (
            <div key={row.today} className="grid gap-2 border-t border-zinc-200 py-5 sm:grid-cols-2 sm:gap-10">
              <p className="text-[16px] text-zinc-500 line-through decoration-zinc-300">{row.today}</p>
              <p className="text-[16px] font-medium text-zinc-900">{row.after}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 sm:px-8 md:grid-cols-3 lg:py-20">
          {ROLES.map((role) => (
            <div key={role.name}>
              <h3 className="font-display text-[22px] font-semibold text-zinc-900">{role.name}</h3>
              <p className="mt-2 max-w-[36ch] text-[15px] leading-relaxed text-zinc-600">{role.text}</p>
            </div>
          ))}
        </div>
      </section>

      {SHOW_DEMO && (
        <section className="border-t border-zinc-200 bg-zinc-100/60">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-3 px-5 py-6 sm:px-8">
            <p className="mr-2 text-[14px] text-zinc-600">Demo accounts (development only):</p>
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.label}
                onClick={() => login(account.email, account.password)}
                className="rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-[13px] font-medium text-zinc-800 hover:border-indigo-600 hover:text-indigo-700"
              >
                Sign in as {account.label.toLowerCase()}
              </button>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-auto border-t border-zinc-200">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-6 text-[13px] text-zinc-500 sm:px-8">
          <span>Brightloop Software</span>
          <span>Subscriptions and recurring billing</span>
        </div>
      </footer>
    </div>
  );
}
