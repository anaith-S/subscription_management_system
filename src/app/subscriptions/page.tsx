"use client";

import React from "react";
import AppShell from "@/components/AppShell";
import { Repeat } from "lucide-react";

export default function SubscriptionsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Repeat className="w-6 h-6 text-indigo-600" />
            Subscriptions & Quotations
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Quotation lifecycle: Draft ➔ Quotation ➔ Confirmed ➔ Active ➔ Closed / Paused
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-dashed border-zinc-300 dark:border-zinc-700 text-center">
          <Repeat className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            Member 2 Module: Catalog & Subscriptions Flow
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
            Ready for quotation templates and state machine transitions.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
