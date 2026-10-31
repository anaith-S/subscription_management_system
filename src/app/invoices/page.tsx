"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import Pager from "@/components/ui/Pager";
import { useAuth } from "@/context/AuthContext";
import {
  Receipt,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Mail,
  Printer,
  Calendar,
  DollarSign,
  Zap,
  RefreshCw,
  Eye,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import Link from "next/link";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: { id: string; name: string; email: string };
  subscriptionId: string | null;
  subscription: { id: string; subscriptionNumber: string; plan: { name: string } } | null;
  status: "DRAFT" | "CONFIRMED" | "PAID" | "CANCELLED";
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  sentAt: string | null;
  payments: { id: string; amount: number; method: string }[];
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const PAGE_SIZE = 25;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Billing Run Modal State
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingResult, setBillingResult] = useState<any | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (debouncedSearch) params.set("q", debouncedSearch);
      const url = `/api/invoices?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.invoices) setInvoices(data.invoices); setTotal(data.total ?? data.invoices.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, page, debouncedSearch]);

  const handleInvoiceAction = async (invoiceId: string, action: "confirm" | "cancel" | "send" | "pay") => {
    setActionLoadingId(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Action failed");
      } else {
        await fetchInvoices();
      }
    } catch (err: any) {
      alert(err.message || "Failed to execute action");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRunBilling = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setBillingResult(data);
      setIsBillingModalOpen(true);
      await fetchInvoices();
    } catch (err: any) {
      alert(err.message || "Billing run failed");
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status: Invoice["status"]) => {
    const badges: Record<Invoice["status"], { label: string; bg: string; text: string }> = {
      DRAFT: { label: "Draft", bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-600 dark:text-zinc-300" },
      CONFIRMED: { label: "Confirmed", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400" },
      PAID: { label: "Paid", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400" },
      CANCELLED: { label: "Cancelled", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-400" },
    };
    const b = badges[status] || badges.DRAFT;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${b.bg} ${b.text}`}>
        {b.label}
      </span>
    );
  };

  const isStaffOrAdmin = user?.role === "ADMIN" || user?.role === "STAFF";

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[30px] sm:text-[36px] font-semibold leading-tight text-zinc-900 dark:text-white">Invoices</h1>
            <p className="mt-1.5 max-w-[68ch] text-[15px] text-zinc-600 dark:text-zinc-400">Invoices move from draft to confirmed to paid. Run billing day to invoice every subscription that’s due.</p>
          </div>

          {isStaffOrAdmin && (
            <button
              onClick={handleRunBilling}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-marigold hover:bg-amber-400 text-deep transition-colors disabled:opacity-60"
            >
              <Zap className="w-4 h-4" />
              Run billing day
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "DRAFT", "CONFIRMED", "PAID", "CANCELLED"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setFilterStatus(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filterStatus === st
                    ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-zinc-200 dark:border-zinc-700 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
          <label className="relative min-w-[220px] max-w-[340px] flex-1">
            <span className="sr-only">Search invoices</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice number, customer or email"
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-[13px] placeholder:text-zinc-400 focus:border-indigo-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            onClick={fetchInvoices}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          </div>
        </div>

        {/* Invoices List */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          {loading && invoices.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-500 mb-2" />
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">No invoices found</h3>
              <p className="text-xs text-zinc-500 mt-1">
                {filterStatus !== "ALL"
                  ? `No invoices in '${filterStatus}' status.`
                  : "Run billing or create an invoice from an active subscription."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-500 text-[11px]">
                    <th className="py-3.5 px-4 font-semibold">Invoice #</th>
                    <th className="py-3.5 px-4 font-semibold">Customer</th>
                    <th className="py-3.5 px-4 font-semibold">Subscription / Plan</th>
                    <th className="py-3.5 px-4 font-semibold">Dates</th>
                    <th className="py-3.5 px-4 font-semibold">Total Amount</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition">
                      <td className="py-4 px-4 font-bold text-zinc-900 dark:text-white">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5"
                        >
                          {inv.invoiceNumber}
                          {inv.sentAt && (
                            <span title={`Sent on ${new Date(inv.sentAt).toLocaleDateString()}`}>
                              <Mail className="w-3.5 h-3.5 text-indigo-500" />
                            </span>
                          )}
                        </Link>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{inv.customer.name}</div>
                        <div className="text-[11px] text-zinc-400">{inv.customer.email}</div>
                      </td>

                      <td className="py-4 px-4">
                        {inv.subscription ? (
                          <>
                            <div className="font-medium text-zinc-800 dark:text-zinc-200">
                              {inv.subscription.subscriptionNumber}
                            </div>
                            <div className="text-[11px] text-zinc-400">{inv.subscription.plan.name}</div>
                          </>
                        ) : (
                          <span className="text-zinc-400 italic">Manual Invoice</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-zinc-800 dark:text-zinc-200 font-medium">
                          Due: {new Date(inv.dueDate).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Issued: {new Date(inv.invoiceDate).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-zinc-900 dark:text-white text-sm">
                          ${inv.totalAmount.toFixed(2)}
                        </div>
                        {inv.discountAmount > 0 && (
                          <div className="text-[10px] text-emerald-600 font-semibold">
                            -${inv.discountAmount.toFixed(2)} discount
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4">{renderStatusBadge(inv.status)}</td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* Print view */}
                          <Link
                            href={`/invoices/${inv.id}/print`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            title="Print Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>

                          {isStaffOrAdmin && (
                            <>
                              {/* Confirm (Draft -> Confirmed) */}
                              {inv.status === "DRAFT" && (
                                <button
                                  disabled={actionLoadingId === inv.id}
                                  onClick={() => handleInvoiceAction(inv.id, "confirm")}
                                  className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-[11px]"
                                >
                                  Confirm
                                </button>
                              )}

                              {/* Send */}
                              {(inv.status === "CONFIRMED" || inv.status === "PAID") && (
                                <button
                                  disabled={actionLoadingId === inv.id}
                                  onClick={() => handleInvoiceAction(inv.id, "send")}
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                                  title="Send / Email Invoice"
                                >
                                  <Mail className="w-4 h-4" />
                                </button>
                              )}

                              {/* Pay (Confirmed -> Paid) */}
                              {inv.status === "CONFIRMED" && (
                                <button
                                  disabled={actionLoadingId === inv.id}
                                  onClick={() => handleInvoiceAction(inv.id, "pay")}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center gap-1"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  Pay
                                </button>
                              )}

                              {/* Cancel */}
                              {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                                <button
                                  disabled={actionLoadingId === inv.id}
                                  onClick={() => {
                                    if (confirm("Cancel this invoice?")) {
                                      handleInvoiceAction(inv.id, "cancel");
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                  title="Cancel Invoice"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > 0 && (
            <Pager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} noun="invoices" />
          )}
        </div>

        {/* Modal: Billing Run Results */}
        {isBillingModalOpen && billingResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Billing Run Completed</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Active subscriptions evaluated: {billingResult.totalEvaluated}
                </p>
              </div>

              <div className="my-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Invoices Generated:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {billingResult.invoicesCreated}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Already Billed for Period (Skipped):</span>
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">{billingResult.skipped}</span>
                </div>
              </div>

              <button
                onClick={() => setIsBillingModalOpen(false)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
