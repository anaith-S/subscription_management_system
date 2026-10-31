"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import {
  Receipt,
  ArrowLeft,
  Printer,
  Mail,
  CheckCircle,
  XCircle,
  CreditCard,
  Building,
  Calendar,
  DollarSign,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNote, setPaymentNote] = useState("Direct invoice settlement");

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}`);
      const data = await res.json();
      if (data.invoice) {
        setInvoice(data.invoice);
        setPaymentAmount(data.invoice.totalAmount);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchInvoice();
  }, [id]);

  const handleAction = async (action: "confirm" | "cancel" | "send" | "pay") => {
    setActionLoading(true);
    try {
      const payload: any = { action };
      if (action === "pay") {
        payload.paymentMethod = paymentMethod;
        payload.paymentAmount = paymentAmount;
        payload.paymentNote = paymentNote;
      }

      const res = await fetch(`/api/invoices/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Action failed");
      } else {
        setIsPaymentModalOpen(false);
        await fetchInvoice();
      }
    } catch (err: any) {
      alert(err.message || "Failed to execute action");
    } finally {
      setActionLoading(false);
    }
  };

  const isStaffOrAdmin = user?.role === "ADMIN" || user?.role === "STAFF";

  if (loading) {
    return (
      <AppShell>
        <div className="p-16 text-center text-zinc-500">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-500 mb-2" />
          Loading invoice details...
        </div>
      </AppShell>
    );
  }

  if (!invoice) {
    return (
      <AppShell>
        <div className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Invoice Not Found</h2>
          <Link href="/invoices" className="mt-4 inline-block text-xs text-indigo-600 font-semibold">
            &larr; Back to Invoices
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Navigation & Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/invoices")}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Invoice {invoice.invoiceNumber}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    invoice.status === "PAID"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : invoice.status === "CONFIRMED"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                      : invoice.status === "DRAFT"
                      ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"
                  }`}
                >
                  {invoice.status}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Created: {new Date(invoice.createdAt).toLocaleString()}
                {invoice.sentAt && ` • Sent: ${new Date(invoice.sentAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Print View Link */}
            <Link
              href={`/invoices/${invoice.id}/print`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition"
            >
              <Printer className="w-4 h-4" />
              Print / PDF
            </Link>

            {isStaffOrAdmin && (
              <>
                {/* Send */}
                {invoice.status !== "CANCELLED" && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleAction("send")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition"
                  >
                    <Mail className="w-4 h-4 text-indigo-500" />
                    {invoice.sentAt ? "Resend" : "Send Invoice"}
                  </button>
                )}

                {/* Confirm */}
                {invoice.status === "DRAFT" && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleAction("confirm")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirm Invoice
                  </button>
                )}

                {/* Pay */}
                {invoice.status === "CONFIRMED" && (
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                  >
                    <CreditCard className="w-4 h-4" />
                    Record Payment
                  </button>
                )}

                {/* Cancel */}
                {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
                  <button
                    disabled={actionLoading}
                    onClick={() => {
                      if (confirm("Are you sure you want to cancel this invoice?")) {
                        handleAction("cancel");
                      }
                    }}
                    className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Cancel Invoice"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Invoice Printable Preview Container */}
        <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-8">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <span className="text-xl font-black text-indigo-600 tracking-tight">Brightloop Software</span>
              <p className="text-xs text-zinc-500 mt-1">
                Enterprise Cloud & Recurring Billing Services
                <br />
                billing@brightloop.com
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Invoice Details</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white mt-1">
                {invoice.invoiceNumber}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Issue Date: {new Date(invoice.invoiceDate).toLocaleDateString()}
                <br />
                Due Date: <span className="font-semibold text-zinc-900 dark:text-white">{new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Billed To & Subscription Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Billed To</div>
              <div className="font-bold text-sm text-zinc-900 dark:text-white">{invoice.customer.name}</div>
              <div className="text-xs text-zinc-500">{invoice.customer.email}</div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Subscription Reference
              </div>
              {invoice.subscription ? (
                <div className="text-xs text-zinc-700 dark:text-zinc-300">
                  <div className="font-semibold">{invoice.subscription.subscriptionNumber}</div>
                  <div className="text-zinc-500">{invoice.subscription.plan.name}</div>
                </div>
              ) : (
                <div className="text-xs text-zinc-400 italic">One-off invoice</div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 font-semibold">Description</th>
                  <th className="py-2.5 font-semibold text-center">Qty</th>
                  <th className="py-2.5 font-semibold text-right">Unit Price</th>
                  <th className="py-2.5 font-semibold text-right">Tax</th>
                  <th className="py-2.5 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                {invoice.lines.map((l: any) => (
                  <tr key={l.id}>
                    <td className="py-3 font-medium text-zinc-900 dark:text-white">{l.description}</td>
                    <td className="py-3 text-center">{l.quantity}</td>
                    <td className="py-3 text-right">${l.unitPrice.toFixed(2)}</td>
                    <td className="py-3 text-right">{l.taxRate}%</td>
                    <td className="py-3 text-right font-bold text-zinc-900 dark:text-white">
                      ${l.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Calculation Card */}
          <div className="flex justify-end pt-4">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">${invoice.subtotal.toFixed(2)}</span>
              </div>

              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount Applied:</span>
                  <span>-${invoice.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-zinc-500">
                <span>Calculated Tax:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">${invoice.taxAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-sm font-bold text-zinc-900 dark:text-white">
                <span>Total Amount:</span>
                <span className="text-base text-indigo-600 dark:text-indigo-400">
                  ${invoice.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Notes & Terms: </span>
              {invoice.notes}
            </div>
          )}

          {/* Payment Records Section */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Settlement & Payments
              </h3>
              <div className="space-y-2">
                {invoice.payments.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs"
                  >
                    <div>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        Paid via {p.method.replace("_", " ")}
                      </span>
                      <div className="text-[10px] text-zinc-400">
                        {new Date(p.paymentDate).toLocaleString()} • {p.note}
                      </div>
                    </div>
                    <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                      ${p.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal: Record Payment */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Record Payment for {invoice.invoiceNumber}
              </h3>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
                  >
                    <option value="BANK_TRANSFER">Bank Wire / Transfer</option>
                    <option value="CREDIT_CARD">Credit / Debit Card</option>
                    <option value="CASH">Cash Settlement</option>
                    <option value="OTHER">Other Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Note / Reference
                  </label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleAction("pay")}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    {actionLoading ? "Processing..." : "Confirm & Settle"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
