"use client";

import React from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, TrendingUp, Repeat, Receipt, DollarSign } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Executive Overview
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1">
              Brightloop Finance & Operations Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Welcome back, {user?.name || "Administrator"}. Real-time recurring revenue, subscription lifecycle, and billing KPIs.
            </p>
          </div>
        </div>

        {/* KPI stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Monthly MRR</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">$5,145.00</div>
            <span className="text-[11px] text-emerald-600 font-medium">↑ 18.2% vs last month</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Active Subscriptions</span>
              <Repeat className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">2 Active</div>
            <span className="text-[11px] text-zinc-500">100% on-time renewals</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Invoiced</span>
              <Receipt className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">$5,774.50</div>
            <span className="text-[11px] text-zinc-500">Across 2 billing runs</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Payments Collected</span>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600">$4,570.00</div>
            <span className="text-[11px] text-zinc-500">Wire transfers & cards</span>
          </div>
        </div>

        <div className="p-8 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-dashed border-zinc-300 dark:border-zinc-700 text-center">
          <LayoutDashboard className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            Member 4 Module: Finance KPI Dashboard
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
            Ready for integration with Member 4&apos;s finance queries and filters. Auth context and app shell are active.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
