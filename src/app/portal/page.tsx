"use client";

import React, { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import {
  Repeat,
  Receipt,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Building,
  RefreshCw,
} from "lucide-react";

interface SubscriptionLineItem {
  id: string;
  quantity: number;
  product?: { name: string };
  variant?: { name: string };
}

interface PortalSubscription {
  id: string;
  subscriptionNumber: string;
  status: string;
  nextBillingDate?: string;
  plan?: {
    name: string;
    frequency: string;
  };
  lines?: SubscriptionLineItem[];
}

interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
}

interface PortalData {
  customer: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  subscriptions: PortalSubscription[];
  invoices: PortalInvoice[];
}

export default function CustomerPortalPage() {
  const { user, authFetch, loading: authLoading } = useAuth();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch("/api/portal/data");

      if (!res.ok) {
        throw new Error("Failed to load customer subscription data");
      }

      const result: PortalData = await res.json();
      setData(result);
    } catch (err: unknown) {
      console.error("Fetch error:", err);
      const msg = err instanceof Error ? err.message : "Could not retrieve records";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    let ignore = false;
    if (authLoading) return;

    async function load() {
      try {
        const res = await authFetch("/api/portal/data");
        if (res.ok && !ignore) {
          const result: PortalData = await res.json();
          setData(result);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Could not retrieve records");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [authLoading, authFetch]);

  const subscriptions = data?.subscriptions || [];
  const invoices = data?.invoices || [];

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            {status}
          </span>
        );
      case "CONFIRMED":
      case "QUOTATION":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            {status}
          </span>
        );
      case "PAUSED":
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            {status}
          </span>
        );
      case "CLOSED":
      case "CANCELLED":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            {status}
          </span>
        );
    }
  };

  const totalSpent = invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Customer Self-Service Portal
              </span>
              <span className="text-xs text-indigo-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Scoped to Your Account
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome, {user?.name || "Valued Customer"}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200">
              Manage your active Brightloop software subscriptions, review billing history, and download invoices.
            </p>
          </div>

          <button
            onClick={fetchPortalData}
            disabled={loading}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold backdrop-blur border border-white/20 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Records
          </button>
        </div>

        {/* Overview KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Active Subscriptions</span>
              <Repeat className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {subscriptions.filter((s) => s.status === "ACTIVE").length}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Software plans currently running</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Invoices</span>
              <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {invoices.length}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Generated recurring & quote invoices</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Paid</span>
              <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Lifetime payments recorded</p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-4 flex items-center gap-3 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: My Subscriptions */}
        <section id="subscriptions" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Repeat className="w-5 h-5 text-indigo-600" />
                My Subscriptions
              </h2>
              <p className="text-xs text-zinc-500">Live view of recurring billing agreements and software packages</p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              Loading subscriptions...
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              No subscriptions found for your account yet.
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Subscription #</th>
                      <th className="px-5 py-3.5">Plan</th>
                      <th className="px-5 py-3.5">Frequency</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Next Billing</th>
                      <th className="px-5 py-3.5">Included Items</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition">
                        <td className="px-5 py-4 font-mono font-medium text-zinc-900 dark:text-white">
                          {sub.subscriptionNumber}
                        </td>
                        <td className="px-5 py-4 font-semibold text-zinc-900 dark:text-zinc-100">
                          {sub.plan?.name || "Custom Plan"}
                        </td>
                        <td className="px-5 py-4 text-zinc-600 dark:text-zinc-300">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800">
                            {sub.plan?.frequency || "MONTHLY"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {getStatusBadge(sub.status)}
                        </td>
                        <td className="px-5 py-4 text-zinc-600 dark:text-zinc-300 text-xs">
                          {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            {sub.lines?.map((line) => (
                              <div key={line.id} className="text-xs text-zinc-600 dark:text-zinc-400">
                                • {line.product?.name} (Qty: {line.quantity})
                                {line.variant && <span className="text-indigo-600 dark:text-indigo-400 ml-1">[{line.variant.name}]</span>}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Section 2: My Invoices */}
        <section id="invoices" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                My Invoices & Receipts
              </h2>
              <p className="text-xs text-zinc-500">Invoices billed against your subscriptions with tax and discount breakdowns</p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              No invoices generated for your account yet.
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Invoice #</th>
                      <th className="px-5 py-3.5">Issue Date</th>
                      <th className="px-5 py-3.5">Due Date</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Subtotal</th>
                      <th className="px-5 py-3.5">Tax / Discount</th>
                      <th className="px-5 py-3.5">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition">
                        <td className="px-5 py-4 font-mono font-medium text-zinc-900 dark:text-white">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-5 py-4 text-xs text-zinc-600 dark:text-zinc-400">
                          {new Date(inv.invoiceDate).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-xs text-zinc-600 dark:text-zinc-400">
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
                          {getStatusBadge(inv.status)}
                        </td>
                        <td className="px-5 py-4 text-zinc-700 dark:text-zinc-300 font-mono">
                          ${inv.subtotal?.toFixed(2)}
                        </td>
                        <td className="px-5 py-4 text-xs text-zinc-500">
                          Tax: ${inv.taxAmount?.toFixed(2)}
                          {inv.discountAmount > 0 && (
                            <span className="text-emerald-600 ml-1">
                              (-${inv.discountAmount?.toFixed(2)})
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-bold text-zinc-900 dark:text-white font-mono">
                          ${inv.totalAmount?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Section 3: Account Profile Information */}
        <section id="profile" className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Account Details</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-zinc-400 uppercase font-semibold">Account Name</span>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">{user?.name}</p>
            </div>
            <div>
              <span className="text-zinc-400 uppercase font-semibold">Registered Email</span>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">{user?.email}</p>
            </div>
            <div>
              <span className="text-zinc-400 uppercase font-semibold">Account Role</span>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">{user?.role}</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
