"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Calendar,
  DollarSign,
  Receipt,
  ArrowUpRight,
  RefreshCw,
  Building2,
  FileText,
  User,
  X,
  AlertCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface PaymentItem {
  id: string;
  invoiceId: string;
  method: "CASH" | "BANK_TRANSFER" | "CREDIT_CARD" | "OTHER";
  amount: number;
  paymentDate: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    status: string;
    dueDate: string;
    customer: { id: string; name: string; email: string };
  };
}

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  status: string;
  dueDate: string;
  amountPaid: number;
  balanceDue: number;
  customer: { id: string; name: string; email: string };
}

export default function PaymentsPage() {
  const { user } = useAuth();

  // Payment List State
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Filters State
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Record Payment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form Fields
  const [unpaidInvoices, setUnpaidInvoices] = useState<InvoiceOption[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string>("BANK_TRANSFER");
  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = useState<string>("");

  // Receipt Preview Modal
  const [viewingReceipt, setViewingReceipt] = useState<PaymentItem | null>(null);

  // Fetch payments list
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", pageSize.toString());

      if (methodFilter !== "ALL") params.set("method", methodFilter);
      if (startDateFilter) params.set("startDate", startDateFilter);
      if (endDateFilter) params.set("endDate", endDateFilter);

      const res = await fetch(`/api/payments?${params.toString()}`);
      const data = await res.json();

      if (data.payments) {
        setPayments(data.payments);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setTotalAmount(data.totalAmount || 0);
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available invoices for recording payment
  const fetchAvailableInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const res = await fetch("/api/invoices/payments?type=outstanding&pageSize=50");
      const data = await res.json();
      if (data.invoices) {
        setUnpaidInvoices(data.invoices);
      }
    } catch (err) {
      console.error("Error fetching invoices for payment modal:", err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, pageSize, methodFilter, startDateFilter, endDateFilter]);

  // Open modal and pre-load invoices
  const openRecordModal = () => {
    setIsModalOpen(true);
    setFormError(null);
    setFormSuccess(null);
    setSelectedInvoiceId("");
    setAmount("");
    setNote("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    fetchAvailableInvoices();
  };

  // When user picks an invoice, prefill remaining balance
  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    const chosen = unpaidInvoices.find((i) => i.id === invId);
    if (chosen) {
      setAmount(chosen.balanceDue.toFixed(2));
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedInvoiceId) {
      setFormError("Please select an invoice to record payment against.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Please enter a valid payment amount greater than 0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          method: selectedMethod,
          amount: numAmount,
          paymentDate,
          note,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to record payment");
      } else {
        setFormSuccess(data.message || "Payment recorded successfully!");
        setTimeout(() => {
          setIsModalOpen(false);
          fetchPayments();
        }, 1200);
      }
    } catch (err: any) {
      setFormError(err.message || "Network error while saving payment.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter payments by search term locally for instant search UX
  const filteredPayments = payments.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const invNum = p.invoice?.invoiceNumber?.toLowerCase() || "";
    const custName = p.invoice?.customer?.name?.toLowerCase() || "";
    const custEmail = p.invoice?.customer?.email?.toLowerCase() || "";
    const noteText = p.note?.toLowerCase() || "";
    return (
      invNum.includes(term) ||
      custName.includes(term) ||
      custEmail.includes(term) ||
      noteText.includes(term)
    );
  });

  const selectedInvoice = unpaidInvoices.find((i) => i.id === selectedInvoiceId);
  const parsedAmount = parseFloat(amount) || 0;
  const isFullPayment = selectedInvoice && parsedAmount >= selectedInvoice.balanceDue;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[30px] sm:text-[36px] font-semibold leading-tight text-zinc-900 dark:text-white">Payments</h1>
            <p className="mt-1.5 max-w-[68ch] text-[15px] text-zinc-600 dark:text-zinc-400">Record what came in, by which method and against which invoice, and see what is still outstanding.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchPayments()}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={openRecordModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-medium text-xs sm:text-sm shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Record Payment
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium">Total Collected</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">Across all filtered records</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium">Payments Count</span>
              <Receipt className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{total}</div>
            <span className="text-[11px] text-zinc-500">Processed transactions</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium">Average Payment</span>
              <ArrowUpRight className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              ${total > 0 ? (totalAmount / total).toFixed(2) : "0.00"}
            </div>
            <span className="text-[11px] text-zinc-500">Average ticket size</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <span className="text-xs font-medium">Accepted Rails</span>
              <CreditCard className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-2 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Wire / Bank Transfer
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Credit & Debit Cards
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Cash & Cheque
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by invoice #, customer name, note..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Method Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
              <select
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Methods</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => {
                  setStartDateFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title="Start Date"
              />
              <span className="text-zinc-400 text-xs">to</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => {
                  setEndDateFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title="End Date"
              />
            </div>

            {(methodFilter !== "ALL" || startDateFilter || endDateFilter || searchTerm) && (
              <button
                onClick={() => {
                  setMethodFilter("ALL");
                  setStartDateFilter("");
                  setEndDateFilter("");
                  setSearchTerm("");
                  setPage(1);
                }}
                className="px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:underline shrink-0"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Payments Data Table */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-zinc-500 dark:text-zinc-400 font-medium">
                  <th className="py-3 px-4">Receipt / ID</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Note / Ref</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading payments...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-500">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                      No payments found matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition"
                      >
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                          {p.id.substring(0, 8)}...
                        </td>
                        <td className="py-3 px-4 font-medium text-zinc-900 dark:text-white">
                          {p.invoice ? (
                            <Link
                              href={`/invoices/${p.invoice.id}`}
                              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:underline flex items-center gap-1"
                            >
                              {p.invoice.invoiceNumber}
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          ) : (
                            p.invoiceId
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {p.invoice?.customer?.name || "Customer"}
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            {p.invoice?.customer?.email || ""}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              p.method === "BANK_TRANSFER"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400"
                                : p.method === "CREDIT_CARD"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400"
                                : p.method === "CASH"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                                : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            {p.method.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                          +${p.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300 text-xs">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 text-xs max-w-xs truncate">
                          {p.note || <span className="text-zinc-400 italic">None</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setViewingReceipt(p)}
                            className="px-2.5 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-zinc-700 dark:text-zinc-300"
                          >
                            Receipt
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
            <div>
              Showing {payments.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(page * pageSize, total)} of {total} payments
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>

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

        {/* Modal: Record Payment Form */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Transaction Entry
                </span>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Record Customer Payment
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Settlements auto-update invoice status to Paid once total is fulfilled.
                </p>
              </div>

              {formError && (
                <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="p-3 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleRecordPayment} className="space-y-4">
                {/* Pick Invoice */}
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Select Invoice <span className="text-red-500">*</span>
                  </label>
                  {loadingInvoices ? (
                    <div className="text-xs text-zinc-400 py-2">Loading outstanding invoices...</div>
                  ) : (
                    <select
                      value={selectedInvoiceId}
                      onChange={(e) => handleSelectInvoice(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Choose an unpaid/confirmed invoice --</option>
                      {unpaidInvoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} - {inv.customer.name} (Due: ${inv.balanceDue.toFixed(2)} / Total: ${inv.totalAmount.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedInvoice && (
                    <div className="mt-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Customer:</span>
                        <span className="font-medium text-zinc-900 dark:text-white">{selectedInvoice.customer.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Total Invoice Amount:</span>
                        <span className="font-medium">${selectedInvoice.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Remaining Balance Due:</span>
                        <span className="font-bold text-red-600 dark:text-red-400">${selectedInvoice.balanceDue.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Method */}
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedMethod}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer / Wire</option>
                    <option value="CREDIT_CARD">Credit / Debit Card</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other / Cheque</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Payment Amount ($) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  {/* Status Preview Tag */}
                  {selectedInvoice && parsedAmount > 0 && (
                    <div className="mt-1.5 text-[11px]">
                      {isFullPayment ? (
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Fully settles balance! Invoice will become{" "}
                          <strong className="underline">PAID</strong>.
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Partial payment: Remaining balance will be $
                          {(selectedInvoice.balanceDue - parsedAmount).toFixed(2)}. Status remains{" "}
                          <strong>CONFIRMED</strong>.
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Reference / Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Wire ref #TX-88219 or Check #4401"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 text-xs rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-medium shadow-sm transition disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Record Payment"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: View Receipt */}
        {viewingReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 relative">
              <button
                onClick={() => setViewingReceipt(null)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4 text-center">
                <Receipt className="w-8 h-8 text-indigo-600 mx-auto mb-1" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Payment Receipt
                </h3>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  ID: {viewingReceipt.id}
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-500">Invoice Number:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {viewingReceipt.invoice?.invoiceNumber || viewingReceipt.invoiceId}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-500">Customer:</span>
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {viewingReceipt.invoice?.customer?.name || "Customer"}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-500">Payment Method:</span>
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {viewingReceipt.method.replace("_", " ")}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-500">Amount Received:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    ${viewingReceipt.amount.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-500">Payment Date:</span>
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {new Date(viewingReceipt.paymentDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-500">Reference / Note:</span>
                  <span className="text-zinc-700 dark:text-zinc-300 italic">
                    {viewingReceipt.note || "None"}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setViewingReceipt(null)}
                  className="w-full py-2 text-xs rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium transition"
                >
                  Close Receipt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
