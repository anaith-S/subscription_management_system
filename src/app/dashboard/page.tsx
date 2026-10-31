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
        alert("Overdue payment reminder dispatched successfully!");
      }
    } catch {
      alert("Failed to send reminder.");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header with Performance Speed Badge */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Finance Lead Executive Overview
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400">
                <Zap className="w-3 h-3 text-emerald-600 animate-pulse" />
                {latencyMs !== null ? `${latencyMs}ms latency` : "< 2.0s SLA"}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1">
              Brightloop Finance & Operations Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Real-time recurring revenue, payment reconciliations, and debt chasing with sub-2s query speeds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchDashboardData()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 transition"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Sync Data
            </button>
            <Link
              href="/payments"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm transition"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Record Payment
            </Link>
          </div>
        </div>

        {/* Dynamic Filter Controls Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filter Analytics
            </span>
            {(datePreset !== "ALL" || statusFilter !== "ACTIVE" || customerId !== "ALL") && (
              <button
                onClick={() => {
                  setDatePreset("ALL");
                  setStartDate("");
                  setEndDate("");
                  setStatusFilter("ACTIVE");
                  setCustomerId("ALL");
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Reset All Filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Preset Buttons */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
              {[
                { label: "All Time", value: "ALL" },
                { label: "Today", value: "TODAY" },
                { label: "Last 7d", value: "7D" },
                { label: "Last 30d", value: "30D" },
                { label: "This Month", value: "THIS_MONTH" },
                { label: "Last 90d", value: "90D" },
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleDatePresetChange(p.value)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    datePreset === p.value
                      ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            <div className="flex items-center gap-1 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("CUSTOM");
                }}
                className="px-2 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                title="Start Date"
              />
              <span className="text-zinc-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("CUSTOM");
                }}
                className="px-2 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                title="End Date"
              />
            </div>

            {/* Customer Filter */}
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none"
            >
              <option value="ALL">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Subscription Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none"
            >
              <option value="ALL">All Subscriptions</option>
              <option value="ACTIVE">Status: ACTIVE</option>
              <option value="QUOTATION">Status: QUOTATION</option>
              <option value="CONFIRMED">Status: CONFIRMED</option>
              <option value="PAUSED">Status: PAUSED</option>
              <option value="CLOSED">Status: CLOSED</option>
            </select>
          </div>
        </div>

        {/* 5 KPI Metric Cards (Member 4 Requirements) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Active Subscriptions */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Active Subs</span>
              <Repeat className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {loading ? "..." : summary?.active_subscriptions_count ?? 0}
            </div>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              Recurring Contracts
            </span>
          </div>

          {/* 2. Monthly MRR */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Monthly MRR</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              ${loading ? "..." : (summary?.mrr ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">Monthly run-rate</span>
          </div>

          {/* 3. Revenue Collected */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Revenue Collected</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ${loading ? "..." : (summary?.revenue_collected ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-zinc-500">
              {summary?.total_payments_count ?? 0} payments settled
            </span>
          </div>

          {/* 4. Total Outstanding */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Total Outstanding</span>
              <Receipt className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ${loading ? "..." : (summary?.total_outstanding ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-zinc-500">
              {summary?.unpaid_invoices_count ?? 0} open invoices
            </span>
          </div>

          {/* 5. Overdue Invoices & Amount */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Overdue Debt</span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              ${loading ? "..." : (summary?.overdue_amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">
              {summary?.overdue_count ?? 0} invoices past due
            </span>
          </div>
        </div>

        {/* Revenue Performance Visual Chart */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Revenue Ingestion vs. Outstanding Debt Distribution
              </h3>
              <p className="text-xs text-zinc-500">
                Visual ratio of collected settlements against pending receivables.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <span className="w-3 h-3 rounded bg-emerald-500"></span> Collected (${summary?.revenue_collected.toFixed(2)})
              </span>
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <span className="w-3 h-3 rounded bg-blue-500"></span> Outstanding (${summary?.total_outstanding.toFixed(2)})
              </span>
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <span className="w-3 h-3 rounded bg-red-500"></span> Overdue (${summary?.overdue_amount.toFixed(2)})
              </span>
            </div>
          </div>

          {/* Graphical Progress Bar Visualization */}
          {(() => {
            const collected = summary?.revenue_collected || 0;
            const outstanding = summary?.total_outstanding || 0;
            const overdue = summary?.overdue_amount || 0;
            const total = Math.max(1, collected + outstanding + overdue);

            const collectedPct = Math.round((collected / total) * 100);
            const outstandingPct = Math.round((outstanding / total) * 100);
            const overduePct = Math.min(100 - collectedPct - outstandingPct, Math.round((overdue / total) * 100));

            return (
              <div className="space-y-2 pt-2">
                <div className="h-4 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${collectedPct}%` }}
                    className="bg-emerald-500 hover:bg-emerald-400 transition-all duration-500"
                    title={`Collected: ${collectedPct}%`}
                  ></div>
                  <div
                    style={{ width: `${outstandingPct}%` }}
                    className="bg-blue-500 hover:bg-blue-400 transition-all duration-500"
                    title={`Outstanding: ${outstandingPct}%`}
                  ></div>
                  <div
                    style={{ width: `${overduePct}%` }}
                    className="bg-red-500 hover:bg-red-400 transition-all duration-500"
                    title={`Overdue: ${overduePct}%`}
                  ></div>
                </div>

                <div className="flex justify-between text-[11px] text-zinc-500 pt-1">
                  <span>Settlement Rate: <strong>{collectedPct}%</strong></span>
                  <span>Pending Collection: <strong>{outstandingPct}%</strong></span>
                  <span className="text-red-500">Delinquent Risk: <strong>{overduePct}%</strong></span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Dual Grid: Overdue Invoices Priority & Recent Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Overdue Invoices Action Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Priority Overdue Chasing
                  </h3>
                </div>
                <Link
                  href="/invoices/overdue"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  View All ({summary?.overdue_count ?? 0}) <ChevronRight className="w-3.5 h-3.5" />
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
                          {inv.customer.name} • Due {new Date(inv.dueDate).toLocaleDateString()}
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
              <span>Automatic reminders scheduled for all 15d+ debt.</span>
              <Link href="/invoices/overdue" className="font-semibold text-indigo-600 hover:underline">
                Overdue Page &rarr;
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
                    Recent Incoming Payments
                  </h3>
                </div>
                <Link
                  href="/payments"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  View All ({summary?.total_payments_count ?? 0}) <ChevronRight className="w-3.5 h-3.5" />
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
                          {p.invoice?.customer?.name || "Customer"} • {new Date(p.paymentDate).toLocaleDateString()}
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
              <span>Instant sync with Stripe & banking webhooks.</span>
              <Link href="/payments" className="font-semibold text-indigo-600 hover:underline">
                Payment History &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
