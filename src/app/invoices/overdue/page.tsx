"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import {
  AlertTriangle,
  Receipt,
  Mail,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Send,
  CreditCard,
  X,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  dueDate: string;
  invoiceDate: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  daysOverdue: number;
  customer: { id: string; name: string; email: string };
  subscription?: { id: string; subscriptionNumber: string; plan?: { name: string } } | null;
}

export default function OverdueInvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<OverdueInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bulkReminderLoading, setBulkReminderLoading] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Inline Quick Payment Modal
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<OverdueInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [paymentNote, setPaymentNote] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchOverdueInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", pageSize.toString());

      const res = await fetch(`/api/invoices/overdue?${params.toString()}`);
      const data = await res.json();

      if (data.overdueInvoices) {
        setInvoices(data.overdueInvoices);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Error fetching overdue invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdueInvoices();
  }, [page, pageSize]);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotificationMsg({ text, type });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // Dispatch reminder for single invoice
  const handleSendReminder = async (invoiceId: string, invoiceNumber: string) => {
    setActionLoadingId(invoiceId);
    try {
      const res = await fetch("/api/invoices/overdue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || "Failed to dispatch reminder", "error");
      } else {
        showNotification(`Payment reminder successfully sent for ${invoiceNumber}!`);
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to send reminder", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Dispatch bulk reminders
  const handleBulkReminders = async () => {
    if (invoices.length === 0) return;
    setBulkReminderLoading(true);
    try {
      const invoiceIds = invoices.map((i) => i.id);
      const res = await fetch("/api/invoices/overdue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || "Failed to dispatch bulk reminders", "error");
      } else {
        showNotification(`Reminders successfully sent to ${data.count} overdue accounts!`);
      }
    } catch (err: any) {
      showNotification(err.message || "Bulk reminder failed", "error");
    } finally {
      setBulkReminderLoading(false);
    }
  };

  // Open Quick Payment Modal
  const openPaymentModal = (invoice: OverdueInvoice) => {
    setPaymentModalInvoice(invoice);
    setPaymentAmount(invoice.balanceDue.toFixed(2));
    setPaymentMethod("BANK_TRANSFER");
    setPaymentNote(`Overdue settlement for ${invoice.invoiceNumber}`);
  };

  // Handle Quick Payment Submit
  const handleRecordQuickPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;

    setSubmittingPayment(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: paymentModalInvoice.id,
          amount: parseFloat(paymentAmount),
          method: paymentMethod,
          note: paymentNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || "Failed to record payment", "error");
      } else {
        showNotification(data.message || "Payment processed successfully!");
        setPaymentModalInvoice(null);
        fetchOverdueInvoices();
      }
    } catch (err: any) {
      showNotification(err.message || "Error processing payment", "error");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Local filter for search & severity
  const filtered = invoices.filter((inv) => {
    if (severityFilter === "1-15" && inv.daysOverdue > 15) return false;
    if (severityFilter === "16-30" && (inv.daysOverdue <= 15 || inv.daysOverdue > 30)) return false;
    if (severityFilter === "30+" && inv.daysOverdue <= 30) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(term) ||
      inv.customer.name.toLowerCase().includes(term) ||
      inv.customer.email.toLowerCase().includes(term)
    );
  });

  // Calculate summary metrics
  const totalOverdueDebt = invoices.reduce((acc, i) => acc + i.balanceDue, 0);
  const criticalCount = invoices.filter((i) => i.daysOverdue > 30).length;
  const maxDays = invoices.length > 0 ? Math.max(...invoices.map((i) => i.daysOverdue)) : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Notification Toast */}
        {notificationMsg && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between shadow-lg text-xs sm:text-sm ${
              notificationMsg.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : "bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {notificationMsg.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <span>{notificationMsg.text}</span>
            </div>
            <button onClick={() => setNotificationMsg(null)}>
              <X className="w-4 h-4 text-zinc-400 hover:text-zinc-600" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[30px] sm:text-[36px] font-semibold leading-tight text-zinc-900 dark:text-white">Overdue invoices</h1>
            <p className="mt-1.5 max-w-[68ch] text-[15px] text-zinc-600 dark:text-zinc-400">Invoices past their due date with money still owed, oldest first. Send reminders before they become lost revenue.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchOverdueInvoices()}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleBulkReminders}
              disabled={bulkReminderLoading || invoices.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs sm:text-sm shadow-sm transition disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${bulkReminderLoading ? "animate-spin" : ""}`} />
              Remind All Overdue
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium">Total Overdue Debt</span>
              <DollarSign className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              ${totalOverdueDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-zinc-500">Uncollected past-due receivables</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium">Overdue Count</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{total}</div>
            <span className="text-[11px] text-zinc-500">Invoices awaiting collection</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium">Critical Debt (&gt;30d)</span>
              <Clock className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-rose-600">{criticalCount} Accounts</div>
            <span className="text-[11px] text-zinc-500">High priority escalation</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium">Max Days Overdue</span>
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {maxDays} Days
            </div>
            <span className="text-[11px] text-zinc-500">Oldest outstanding invoice</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search overdue invoices by invoice #, customer name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Overdue Tiers</option>
              <option value="1-15">Recent (1 - 15 days)</option>
              <option value="16-30">Medium (16 - 30 days)</option>
              <option value="30+">Critical (30+ days)</option>
            </select>
          </div>

          {(severityFilter !== "ALL" || searchTerm) && (
            <button
              onClick={() => {
                setSeverityFilter("ALL");
                setSearchTerm("");
              }}
              className="px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:underline shrink-0"
            >
              Reset
            </button>
          )}
        </div>

        {/* Overdue Table */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-zinc-500 dark:text-zinc-400 font-medium">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Plan / Sub</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Aging</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Balance Due</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading overdue accounts...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-500">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                      Excellent! No overdue invoices found for this criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((inv) => {
                    const badgeClass =
                      inv.daysOverdue > 30
                        ? "bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-400 border border-red-200 dark:border-red-800"
                        : inv.daysOverdue > 15
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/70 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800";

                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition"
                      >
                        <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-white">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:underline flex items-center gap-1"
                          >
                            {inv.invoiceNumber}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {inv.customer.name}
                          </div>
                          <div className="text-[11px] text-zinc-400">{inv.customer.email}</div>
                        </td>

                        <td className="py-3 px-4 text-xs text-zinc-600 dark:text-zinc-300">
                          {inv.subscription?.plan?.name || inv.subscription?.subscriptionNumber || "Direct SaaS"}
                        </td>

                        <td className="py-3 px-4 text-xs text-zinc-600 dark:text-zinc-300">
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}
                          >
                            {inv.daysOverdue}d Overdue
                          </span>
                        </td>

                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300 font-medium">
                          ${inv.totalAmount.toFixed(2)}
                        </td>

                        <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 text-xs">
                          ${inv.amountPaid.toFixed(2)}
                        </td>

                        <td className="py-3 px-4 font-bold text-red-600 dark:text-red-400 text-sm">
                          ${inv.balanceDue.toFixed(2)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSendReminder(inv.id, inv.invoiceNumber)}
                              disabled={actionLoadingId === inv.id}
                              className="px-2.5 py-1 text-xs rounded-lg border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition flex items-center gap-1 disabled:opacity-50"
                              title="Send overdue email reminder"
                            >
                              <Mail className="w-3 h-3" />
                              {actionLoadingId === inv.id ? "Sending..." : "Remind"}
                            </button>

                            <button
                              onClick={() => openPaymentModal(inv)}
                              className="px-2.5 py-1 text-xs rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-medium transition flex items-center gap-1"
                              title="Record payment settlement"
                            >
                              <CreditCard className="w-3 h-3" />
                              Collect
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
            <div>
              Showing {invoices.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(page * pageSize, total)} of {total} overdue records
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Quick Payment Settlement Modal */}
        {paymentModalInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 relative">
              <button
                onClick={() => setPaymentModalInvoice(null)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Immediate Collection
                </span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Settle {paymentModalInvoice.invoiceNumber}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Customer: <strong>{paymentModalInvoice.customer.name}</strong> ({paymentModalInvoice.customer.email})
                </p>
              </div>

              <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 text-xs">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Total Invoiced:</span>
                  <span className="font-medium">${paymentModalInvoice.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400 mt-1">
                  <span>Already Paid:</span>
                  <span className="text-emerald-600 font-medium">${paymentModalInvoice.amountPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-red-600 dark:text-red-400 mt-1 text-sm">
                  <span>Remaining Overdue:</span>
                  <span>${paymentModalInvoice.balanceDue.toFixed(2)}</span>
                </div>
              </div>

              <form onSubmit={handleRecordQuickPayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Settlement Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer / Wire</option>
                    <option value="CREDIT_CARD">Credit / Debit Card</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other / Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Amount Received ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Transaction Note
                  </label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="e.g. Wire received after reminder"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentModalInvoice(null)}
                    className="px-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="px-5 py-2 text-xs rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-medium transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {submittingPayment ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing...
                      </>
                    ) : (
                      "Confirm Settlement"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
