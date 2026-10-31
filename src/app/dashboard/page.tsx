"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Repeat,
  Receipt,
  DollarSign,
  Clock,
  AlertTriangle,
  Calendar,
  Filter,
  CheckCircle,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  CreditCard,
  Mail,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import RevenueLoop, { REVENUE_COLORS } from "@/components/brand/RevenueLoop";

interface DashboardSummary {
  active_subscriptions_count: number;
  revenue_collected: number;
  total_outstanding: number;
  overdue_count: number;
  overdue_amount: number;
  mrr: number;
  unpaid_invoices_count: number;
  total_payments_count: number;
  performance?: {
    latency_ms: number;
    under_2_seconds: boolean;
  };
}

interface OverdueInvoicePreview {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  daysOverdue: number;
  customer: { id: string; name: string; email: string };
}

interface PaymentPreview {
  id: string;
  amount: number;
  method: string;
  paymentDate: string;
  note: string | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    customer: { id: string; name: string };
  };
}

export default function DashboardPage() {
  const { user } = useAuth();

  // Summary State
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [overdueList, setOverdueList] = useState<OverdueInvoicePreview[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Filters State
  const [datePreset, setDatePreset] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [customerId, setCustomerId] = useState("ALL");
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  // Apply Date Preset
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === "ALL") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "TODAY") {
      const todayStr = now.toISOString().split("T")[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "7D") {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "30D") {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "THIS_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "90D") {
      const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    }
  };

  // Fetch Customers for Filter
  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch("/api/reference-data");
        const data = await res.json();
        if (data.customers) setCustomers(data.customers);
      } catch (err) {
        // Fallback or guest
      }
    }
    loadCustomers();
  }, []);

  // Fetch Dashboard Data with Performance Latency Benchmark
  const fetchDashboardData = async () => {
    setLoading(true);
    const clientStartTime = performance.now();
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (statusFilter && statusFilter !== "ALL") params.set("subscriptionStatus", statusFilter);
      if (customerId && customerId !== "ALL") params.set("customerId", customerId);

      const [summaryRes, overdueRes, paymentsRes] = await Promise.all([
        fetch(`/api/reports/summary?${params.toString()}`),
        fetch(`/api/invoices/overdue?pageSize=5${customerId !== "ALL" ? `&customerId=${customerId}` : ""}`),
        fetch(`/api/payments?pageSize=5${customerId !== "ALL" ? `&customerId=${customerId}` : ""}`),
      ]);

      const clientLatency = Math.round(performance.now() - clientStartTime);
      setLatencyMs(clientLatency);

      const summaryData = await summaryRes.json();
      const overdueData = await overdueRes.json();
      const paymentsData = await paymentsRes.json();

      setSummary(summaryData);
      if (overdueData.overdueInvoices) setOverdueList(overdueData.overdueInvoices);
      if (paymentsData.payments) setRecentPayments(paymentsData.payments);
    } catch (err) {
      console.error("Dashboard data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate, statusFilter, customerId]);

  // Handle Quick Reminder Dispatch
  const handleQuickRemind = async (invoiceId: string) => {
    try {
      const res = await fetch("/api/invoices/overdue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      if (res.ok) {
        alert("Reminder sent.");
      }
    } catch {
      alert("The reminder could not be sent. Try again.");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[14px] text-zinc-500" suppressHydrationWarning>
              {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <h1 className="mt-1 text-[32px] font-semibold leading-tight text-zinc-900 dark:text-white sm:text-[38px]">
              Revenue at a glance
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchDashboardData()}
              className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              title={latencyMs !== null ? `Last refresh took ${latencyMs} ms` : undefined}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/payments"
              className="flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-indigo-800"
            >
              <CreditCard className="h-4 w-4" />
              Record payment
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2 text-[13px] dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center rounded-xl bg-zinc-100 p-1 dark:bg-zinc-950">
            {[
              { label: "All time", value: "ALL" },
              { label: "Today", value: "TODAY" },
              { label: "7 days", value: "7D" },
              { label: "30 days", value: "30D" },
              { label: "This month", value: "THIS_MONTH" },
              { label: "90 days", value: "90D" },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => handleDatePresetChange(p.value)}
                aria-pressed={datePreset === p.value}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  datePreset === p.value
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              aria-label="From date"
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset("CUSTOM");
              }}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-950"
            />
            <span className="text-zinc-400">to</span>
            <input
              type="date"
              value={endDate}
              aria-label="To date"
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset("CUSTOM");
              }}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>

          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            aria-label="Customer"
            className="max-w-[200px] rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="ALL">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Subscription status"
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="ALL">All subscriptions</option>
            <option value="ACTIVE">Active</option>
            <option value="QUOTATION">Quotation</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PAUSED">Paused</option>
            <option value="CLOSED">Closed</option>
          </select>

          {(datePreset !== "ALL" || statusFilter !== "ACTIVE" || customerId !== "ALL") && (
            <button
              onClick={() => {
                setDatePreset("ALL");
                setStartDate("");
                setEndDate("");
                setStatusFilter("ACTIVE");
                setCustomerId("ALL");
              }}
              className="ml-auto px-2 font-medium text-indigo-700 hover:underline dark:text-indigo-300"
            >
              Clear filters
            </button>
          )}
        </div>

        {(() => {
          const money = (n: number) =>
            n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
          const collected = summary?.revenue_collected ?? 0;
          const outstanding = summary?.total_outstanding ?? 0;
          const overdue = Math.min(summary?.overdue_amount ?? 0, outstanding);
          const due = Math.max(0, outstanding - overdue);
          const rows = [
            { label: "Collected", value: collected, note: `${summary?.total_payments_count ?? 0} payments`, color: REVENUE_COLORS.collected },
            { label: "Due, not yet late", value: due, note: `${summary?.unpaid_invoices_count ?? 0} open invoices`, color: REVENUE_COLORS.due },
            { label: "Overdue", value: overdue, note: `${summary?.overdue_count ?? 0} invoices past due`, color: REVENUE_COLORS.overdue },
          ];
          return (
            <section
              aria-busy={loading}
              className={`grid gap-8 rounded-2xl border border-zinc-200 bg-white p-6 transition-opacity dark:border-zinc-800 dark:bg-zinc-900 sm:p-8 lg:grid-cols-[300px_1fr] lg:gap-12 ${
                loading && !summary ? "opacity-50" : ""
              }`}
            >
              <div className="flex justify-center text-zinc-900 dark:text-white lg:justify-start">
                <RevenueLoop collected={collected} due={due} overdue={overdue} />
              </div>

              <div className="flex flex-col justify-center">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="text-[14px] text-zinc-500">Monthly recurring revenue</p>
                    <p className="font-display mt-1 text-[44px] font-semibold leading-none tracking-tight text-zinc-900 dark:text-white tabular">
                      {money(summary?.mrr ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[14px] text-zinc-500">Active subscriptions</p>
                    <p className="font-display mt-1 text-[44px] font-semibold leading-none tracking-tight text-zinc-900 dark:text-white tabular">
                      {(summary?.active_subscriptions_count ?? 0).toLocaleString("en-US")}
                    </p>
                  </div>
                </div>

                <dl className="mt-8 divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
                  {rows.map((row) => (
                    <div key={row.label} className="flex items-center gap-3 py-3.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row.color }} />
                      <dt className="text-[15px] font-medium text-zinc-800 dark:text-zinc-200">{row.label}</dt>
                      <span className="hidden text-[13px] text-zinc-500 sm:inline">{row.note}</span>
                      <dd className="ml-auto text-[17px] font-semibold text-zinc-900 dark:text-white tabular">
                        {money(row.value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          );
        })()}

        {/* Dual Grid: Overdue Invoices Priority & Recent Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Overdue Invoices Action Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Overdue, oldest first
                  </h3>
                </div>
                <Link
                  href="/invoices/overdue"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  View all {summary?.overdue_count ?? 0} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {overdueList.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                  No overdue accounts currently requiring chasing.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {overdueList.map((inv) => (
                    <div
                      key={inv.id}
                      className="py-3 flex items-center justify-between text-xs hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 rounded-xl px-2 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900 dark:text-white">
                            {inv.invoiceNumber}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400">
                            {inv.daysOverdue}d overdue
                          </span>
                        </div>
                        <div className="text-zinc-500 text-[11px] mt-0.5">
                          {inv.customer.name}, due {new Date(inv.dueDate).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-bold text-red-600 dark:text-red-400 text-xs">
                            ${inv.balanceDue.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            Total: ${inv.totalAmount.toFixed(2)}
                          </div>
                        </div>

                        <button
                          onClick={() => handleQuickRemind(inv.id)}
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                          title="Send Email Reminder"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-500 flex justify-between items-center">
              <span>Send a reminder from the envelope button.</span>
              <Link href="/invoices/overdue" className="font-semibold text-indigo-600 hover:underline">
                All overdue invoices
              </Link>
            </div>
          </div>

          {/* Right: Recent Processed Payments */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Latest payments
                  </h3>
                </div>
                <Link
                  href="/payments"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  View all {summary?.total_payments_count ?? 0} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentPayments.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  <Receipt className="w-6 h-6 text-zinc-400 mx-auto mb-1" />
                  No payments recorded yet for this period.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {recentPayments.map((p) => (
                    <div
                      key={p.id}
                      className="py-3 flex items-center justify-between text-xs hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 rounded-xl px-2 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {p.invoice?.invoiceNumber || "Settlement"}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {p.method.replace("_", " ")}
                          </span>
                        </div>
                        <div className="text-zinc-500 text-[11px] mt-0.5">
                          {p.invoice?.customer?.name || "Customer"}, {new Date(p.paymentDate).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          +${p.amount.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-zinc-400 italic truncate max-w-[120px]">
                          {p.note || "Settled"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-500 flex justify-between items-center">
              <span>Latest payments recorded against invoices.</span>
              <Link href="/payments" className="font-semibold text-indigo-600 hover:underline">
                All payments
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
