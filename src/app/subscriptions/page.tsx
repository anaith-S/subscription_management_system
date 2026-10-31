"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import Pager from "@/components/ui/Pager";
import { useAuth } from "@/context/AuthContext";
import {
  Repeat,
  Plus,
  Filter,
  Play,
  CheckCircle,
  Pause,
  XCircle,
  FileText,
  Calendar,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Zap,
  Search,
} from "lucide-react";
import Link from "next/link";

interface Subscription {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  customer: { id: string; name: string; email: string };
  planId: string;
  plan: { id: string; name: string; frequency: string; cost: number; canPause: boolean };
  status: "DRAFT" | "QUOTATION" | "CONFIRMED" | "ACTIVE" | "PAUSED" | "CLOSED";
  startDate: string;
  expiryDate: string | null;
  nextBillingDate: string;
  lastBilledDate: string | null;
  paymentTerms: string;
  discountCode: string | null;
  lines: {
    id: string;
    product: { name: string };
    variant?: { name: string } | null;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  invoices: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
  }[];
}

interface ReferenceData {
  products: any[];
  plans: any[];
  customers: any[];
  taxes: any[];
  discounts: any[];
}

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
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
  const [refData, setRefData] = useState<ReferenceData | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [billingRunResult, setBillingRunResult] = useState<any | null>(null);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);

  // New Subscription Form State
  const [customerId, setCustomerId] = useState("");
  const [planId, setPlanId] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 15");
  const [discountCode, setDiscountCode] = useState("");
  const [lines, setLines] = useState([
    { productId: "", variantId: "", quantity: 1, unitPrice: 0 },
  ]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (debouncedSearch) params.set("q", debouncedSearch);
      const url = `/api/subscriptions?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.subscriptions) {
        setSubscriptions(data.subscriptions); setTotal(data.total ?? data.subscriptions.length);
      }
    } catch (err) {
      console.error("Failed to load subscriptions", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const res = await fetch("/api/reference-data");
      const data = await res.json();
      setRefData(data);
      if (data.customers?.length > 0 && !customerId) {
        setCustomerId(data.customers[0].id);
      }
      if (data.plans?.length > 0 && !planId) {
        setPlanId(data.plans[0].id);
      }
      if (data.products?.length > 0 && lines[0].productId === "") {
        setLines([
          {
            productId: data.products[0].id,
            variantId: "",
            quantity: 1,
            unitPrice: data.products[0].salesPrice,
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to load reference data", err);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, page, debouncedSearch]);

  useEffect(() => {
    fetchReferenceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle status transition
  const handleTransition = async (subscriptionId: string, targetStatus: string) => {
    setActionLoadingId(subscriptionId);
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed transition");
      } else {
        await fetchSubscriptions();
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Generate invoice on-demand
  const handleGenerateInvoice = async (subscriptionId: string) => {
    setActionLoadingId(subscriptionId);
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/create-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to generate invoice");
      } else {
        alert(`🎉 Invoice ${data.invoice.invoiceNumber} created for $${data.invoice.totalAmount}!`);
        await fetchSubscriptions();
      }
    } catch (err: any) {
      alert(err.message || "Failed to create invoice");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Run automated billing run
  const handleRunBilling = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setBillingRunResult(data);
      setIsBillingModalOpen(true);
      await fetchSubscriptions();
    } catch (err: any) {
      alert(err.message || "Billing run failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle Create Subscription
  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !planId) {
      alert("Please select customer and plan");
      return;
    }

    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          planId,
          paymentTerms,
          discountCode: discountCode || null,
          lines,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create subscription");
      } else {
        setIsCreateModalOpen(false);
        await fetchSubscriptions();
      }
    } catch (err: any) {
      alert(err.message || "Failed to create");
    }
  };

  // Line item manipulation
  const addLine = () => {
    if (!refData?.products?.length) return;
    setLines([
      ...lines,
      {
        productId: refData.products[0].id,
        variantId: "",
        quantity: 1,
        unitPrice: refData.products[0].salesPrice,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, idx) => idx !== index));
    }
  };

  const updateLineProduct = (index: number, pId: string) => {
    const prod = refData?.products.find((p) => p.id === pId);
    const updated = [...lines];
    updated[index].productId = pId;
    updated[index].variantId = "";
    updated[index].unitPrice = prod ? prod.salesPrice : 0;
    setLines(updated);
  };

  const updateLineVariant = (index: number, vId: string) => {
    const updated = [...lines];
    updated[index].variantId = vId;
    const prod = refData?.products.find((p) => p.id === updated[index].productId);
    const variant = prod?.variants.find((v: any) => v.id === vId);
    const extra = variant ? variant.extraPrice : 0;
    updated[index].unitPrice = (prod?.salesPrice || 0) + extra;
    setLines(updated);
  };

  // Render Status Badge
  const renderStatusBadge = (status: Subscription["status"]) => {
    const badges: Record<Subscription["status"], { label: string; bg: string; text: string }> = {
      DRAFT: { label: "Draft", bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-600 dark:text-zinc-300" },
      QUOTATION: { label: "Quotation", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-400" },
      CONFIRMED: { label: "Confirmed", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400" },
      ACTIVE: { label: "Active", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400" },
      PAUSED: { label: "Paused", bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-400" },
      CLOSED: { label: "Closed", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-400" },
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
        {/* Header Banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[30px] sm:text-[36px] font-semibold leading-tight text-zinc-900 dark:text-white">Subscriptions</h1>
            <p className="mt-1.5 max-w-[68ch] text-[15px] text-zinc-600 dark:text-zinc-400">Every customer subscription, from draft through quotation and confirmation to active and closed.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/quotation-templates"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition"
            >
              <FileText className="w-4 h-4 text-indigo-500" />
              Quotation Templates
            </Link>

            {isStaffOrAdmin && (
              <>
                <button
                  onClick={handleRunBilling}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-marigold hover:bg-amber-400 text-deep transition-colors disabled:opacity-60"
                  title="Generate recurring invoices for all active subscriptions due today"
                >
                  <Zap className="w-4 h-4" />
                  Run billing day
                </button>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  New Subscription
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters and Stats Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "ACTIVE", "CONFIRMED", "QUOTATION", "DRAFT", "PAUSED", "CLOSED"].map((st) => (
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
            <span className="sr-only">Search subscriptions</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by number, customer or email"
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-[13px] placeholder:text-zinc-400 focus:border-indigo-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            onClick={fetchSubscriptions}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          </div>
        </div>

        {/* Subscriptions Table / Cards */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          {loading && subscriptions.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-500 mb-2" />
              Loading subscriptions...
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="p-12 text-center">
              <Repeat className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">No subscriptions found</h3>
              <p className="text-xs text-zinc-500 mt-1">
                {filterStatus !== "ALL"
                  ? `No subscriptions with status '${filterStatus}'`
                  : "Create your first quote or subscription to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-500 text-[11px]">
                    <th className="py-3.5 px-4 font-semibold">Subscription #</th>
                    <th className="py-3.5 px-4 font-semibold">Customer</th>
                    <th className="py-3.5 px-4 font-semibold">Plan & Billing</th>
                    <th className="py-3.5 px-4 font-semibold">Next Billing Due</th>
                    <th className="py-3.5 px-4 font-semibold">Total / Line Items</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    {isStaffOrAdmin && <th className="py-3.5 px-4 font-semibold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {subscriptions.map((sub) => {
                    const subTotal = sub.lines.reduce((acc, l) => acc + l.amount, 0);

                    return (
                      <tr key={sub.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition">
                        {/* Number */}
                        <td className="py-4 px-4 font-bold text-zinc-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{sub.subscriptionNumber}</span>
                            {sub.discountCode && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-mono">
                                {sub.discountCode}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-normal">Terms: {sub.paymentTerms}</span>
                        </td>

                        {/* Customer */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{sub.customer.name}</div>
                          <div className="text-[11px] text-zinc-400">{sub.customer.email}</div>
                        </td>

                        {/* Plan */}
                        <td className="py-4 px-4">
                          <div className="font-medium text-zinc-800 dark:text-zinc-200">{sub.plan.name}</div>
                          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 capitalize">
                            {sub.plan.frequency.toLowerCase()} billing
                          </div>
                        </td>

                        {/* Dates */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1 font-medium text-zinc-800 dark:text-zinc-200">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            {new Date(sub.nextBillingDate).toLocaleDateString()}
                          </div>
                          {sub.lastBilledDate && (
                            <div className="text-[10px] text-zinc-400">
                              Last billed: {new Date(sub.lastBilledDate).toLocaleDateString()}
                            </div>
                          )}
                        </td>

                        {/* Line items & Total */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-zinc-900 dark:text-white">${subTotal.toFixed(2)}</div>
                          <div className="text-[10px] text-zinc-400">
                            {sub.lines.length} item{sub.lines.length !== 1 ? "s" : ""} (
                            {sub.lines.map((l) => l.product.name).join(", ").slice(0, 30)}
                            {sub.lines.map((l) => l.product.name).join(", ").length > 30 ? "..." : ""})
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-4">{renderStatusBadge(sub.status)}</td>

                        {/* Transition Actions */}
                        {isStaffOrAdmin && (
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* DRAFT -> QUOTATION */}
                              {sub.status === "DRAFT" && (
                                <button
                                  disabled={actionLoadingId === sub.id}
                                  onClick={() => handleTransition(sub.id, "QUOTATION")}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition text-[11px]"
                                >
                                  Send Quote
                                </button>
                              )}

                              {/* QUOTATION -> CONFIRMED */}
                              {sub.status === "QUOTATION" && (
                                <button
                                  disabled={actionLoadingId === sub.id}
                                  onClick={() => handleTransition(sub.id, "CONFIRMED")}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition text-[11px]"
                                >
                                  Confirm Quote
                                </button>
                              )}

                              {/* CONFIRMED -> ACTIVE */}
                              {sub.status === "CONFIRMED" && (
                                <button
                                  disabled={actionLoadingId === sub.id}
                                  onClick={() => handleTransition(sub.id, "ACTIVE")}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition text-[11px] flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3" />
                                  Activate
                                </button>
                              )}

                              {/* ACTIVE -> Bill Now */}
                              {sub.status === "ACTIVE" && (
                                <>
                                  <button
                                    disabled={actionLoadingId === sub.id}
                                    onClick={() => handleGenerateInvoice(sub.id)}
                                    className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-medium transition text-[11px]"
                                    title="Generate invoice immediately for this subscription"
                                  >
                                    Bill Now
                                  </button>

                                  {sub.plan.canPause && (
                                    <button
                                      disabled={actionLoadingId === sub.id}
                                      onClick={() => handleTransition(sub.id, "PAUSED")}
                                      className="p-1 rounded-lg text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-950/60 transition"
                                      title="Pause Subscription"
                                    >
                                      <Pause className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}

                              {/* PAUSED -> RESUME */}
                              {sub.status === "PAUSED" && (
                                <button
                                  disabled={actionLoadingId === sub.id}
                                  onClick={() => handleTransition(sub.id, "ACTIVE")}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition text-[11px]"
                                >
                                  Resume
                                </button>
                              )}

                              {/* CANCEL/CLOSE (Allowed for non-closed) */}
                              {sub.status !== "CLOSED" && (
                                <button
                                  disabled={actionLoadingId === sub.id}
                                  onClick={() => {
                                    if (confirm("Are you sure you want to CLOSE this subscription?")) {
                                      handleTransition(sub.id, "CLOSED");
                                    }
                                  }}
                                  className="p-1 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition"
                                  title="Close Subscription"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {total > 0 && (
            <Pager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} noun="subscriptions" />
          )}
        </div>

        {/* Modal: Create Subscription */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl p-6 shadow-xl my-8">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-indigo-600" />
                  Create New Subscription / Quote
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubscription} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Customer selection */}
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                      Customer *
                    </label>
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      required
                      className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {refData?.customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Plan selection */}
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                      Billing Plan *
                    </label>
                    <select
                      value={planId}
                      onChange={(e) => setPlanId(e.target.value)}
                      required
                      className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {refData?.plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.frequency}) - ${p.cost}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Terms */}
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                      Payment Terms
                    </label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Immediate">Immediate</option>
                      <option value="Net 15">Net 15 Days</option>
                      <option value="Net 30">Net 30 Days</option>
                    </select>
                  </div>

                  {/* Discount Code */}
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                      Discount Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VOLUME15, WELCOME50"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-zinc-500">
                      Product Lines & Variants
                    </label>
                    <button
                      type="button"
                      onClick={addLine}
                      className="text-xs text-indigo-600 hover:text-indigo-500 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Line
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {lines.map((line, idx) => {
                      const selectedProduct = refData?.products.find((p) => p.id === line.productId);

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40"
                        >
                          <div className="flex-1">
                            <select
                              value={line.productId}
                              onChange={(e) => updateLineProduct(idx, e.target.value)}
                              className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5"
                            >
                              {refData?.products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (${p.salesPrice})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Variants if any */}
                          {selectedProduct?.variants && selectedProduct.variants.length > 0 && (
                            <div className="flex-1">
                              <select
                                value={line.variantId}
                                onChange={(e) => updateLineVariant(idx, e.target.value)}
                                className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5"
                              >
                                <option value="">Standard Edition</option>
                                {selectedProduct.variants.map((v: any) => (
                                  <option key={v.id} value={v.id}>
                                    {v.name} (+${v.extraPrice})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="w-16">
                            <input
                              type="number"
                              min={1}
                              value={line.quantity}
                              onChange={(e) => {
                                const updated = [...lines];
                                updated[idx].quantity = Number(e.target.value);
                                setLines(updated);
                              }}
                              className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-center"
                              title="Quantity"
                            />
                          </div>

                          <div className="w-20 text-right font-bold text-xs">
                            ${(line.unitPrice * line.quantity).toFixed(2)}
                          </div>

                          {lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              className="p-1 text-zinc-400 hover:text-rose-500"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm transition"
                  >
                    Create Subscription (Draft)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Billing Run Results */}
        {isBillingModalOpen && billingRunResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Billing Run Completed</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Evaluated: {billingRunResult.totalEvaluated} active subscriptions.
                </p>
              </div>

              <div className="my-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Invoices Generated:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {billingRunResult.invoicesCreated}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Already Billed / Skipped:</span>
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">
                    {billingRunResult.skipped}
                  </span>
                </div>
                {billingRunResult.errors?.length > 0 && (
                  <div className="pt-2 text-rose-500 text-[11px]">
                    Errors: {billingRunResult.errors.length}
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsBillingModalOpen(false)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm transition"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
