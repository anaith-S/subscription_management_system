"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowRight,
  ShieldAlert,
  Briefcase,
  UserCheck,
  Repeat,
  Receipt,
  CreditCard,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "CUSTOMER") {
        router.push("/portal");
      } else if (user.role === "STAFF") {
        router.push("/subscriptions");
      } else if (user.role === "ADMIN") {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 font-sans">
      {/* Top Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20">
              BL
            </div>
            <span className="font-bold text-lg text-zinc-900 dark:text-white tracking-tight">
              Brightloop Software
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          The Digital Backbone of Recurring Revenue
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white max-w-4xl">
          Subscription Management <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            Engine & Customer Portal
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
          Build one unified system to run plans, recurring billing, quotes, taxes, discounts, and payments with customer self-service.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/auth/login"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition"
          >
            Access Platform
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/register"
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-semibold transition"
          >
            Create Customer Account
          </Link>
        </div>

        {/* 1-Click Fast Role Sign-in Box for Hackathon Reviewers */}
        <div className="mt-14 w-full max-w-2xl p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md">
          <p className="text-xs uppercase font-bold tracking-wider text-zinc-500 mb-3">
            ⚡ 1-Click Evaluation Logins (Member 1 Auth & Roles Shell)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => login("admin@brightloop.com", "Admin123!@#")}
              className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-100/60 transition text-left group"
            >
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold text-sm mb-1">
                <ShieldAlert className="w-4 h-4" />
                Admin
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Full system control, staff provisioning, products & discounts.
              </p>
            </button>

            <button
              onClick={() => login("staff@brightloop.com", "Staff123!@#")}
              className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-100/60 transition text-left group"
            >
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-sm mb-1">
                <Briefcase className="w-4 h-4" />
                Staff
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Day-to-day subscriptions, quotes, billing invoices & payments.
              </p>
            </button>

            <button
              onClick={() => login("customer@acme.com", "Customer123!@#")}
              className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/60 transition text-left group"
            >
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm mb-1">
                <UserCheck className="w-4 h-4" />
                Customer
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Self-service portal to view own subscriptions and invoices.
              </p>
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full text-left">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <Repeat className="w-6 h-6 text-indigo-600 mb-3" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Recurring Engine</h3>
            <p className="text-xs text-zinc-500 mt-1">Daily, weekly, monthly and yearly billing frequencies with auto-advance.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <Receipt className="w-6 h-6 text-blue-600 mb-3" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Automated Invoicing</h3>
            <p className="text-xs text-zinc-500 mt-1">Automatic line item generation with dynamic tax rules & discount caps.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <CreditCard className="w-6 h-6 text-emerald-600 mb-3" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Payments & Tracking</h3>
            <p className="text-xs text-zinc-500 mt-1">Multi-method payment logging against invoices with overdue chasing.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <UserCheck className="w-6 h-6 text-purple-600 mb-3" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Customer Portal</h3>
            <p className="text-xs text-zinc-500 mt-1">Self-service dashboard strictly scoped to customer subscriptions.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
