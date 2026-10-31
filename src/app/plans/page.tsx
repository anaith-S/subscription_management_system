"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import {
  Layers,
  Plus,
  Trash2,
  Play,
  Pause,
  XCircle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  cost: number;
  billing_period: string;
  min_quantity: number;
  start_date: string | null;
  end_date: string | null;
  auto_close: boolean;
  closable: boolean;
  pausable: boolean;
  renewable: boolean;
  status: "ACTIVE" | "PAUSED" | "CLOSED" | string;
  createdAt: string;
}

export default function PlansPage() {
  const { user, authFetch } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("400");
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [minQuantity, setMinQuantity] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autoClose, setAutoClose] = useState(true);
  const [closable, setClosable] = useState(true);
  const [pausable, setPausable] = useState(true);
  const [renewable, setRenewable] = useState(true);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/catalog/plans");
      if (!res.ok) throw new Error("Failed to fetch plans");
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (err: any) {
      setError(err.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await authFetch("/api/catalog/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          price: parseFloat(price) || 0,
          billing_period: billingPeriod,
          min_quantity: parseInt(minQuantity, 10) || 1,
          start_date: startDate ? new Date(startDate).toISOString() : null,
          end_date: endDate ? new Date(endDate).toISOString() : null,
          auto_close: autoClose,
          closable,
          pausable,
          renewable,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create plan");

      setSuccess(`Plan "${name}" created successfully!`);
      setIsModalOpen(false);
      setName("");
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePlanAction = async (planId: string, action: "close" | "pause" | "renew") => {
    setError(null);
    setSuccess(null);

    try {
      const res = await authFetch(`/api/catalog/plans/${planId}/${action}`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} plan`);
      }

      setSuccess(`Plan ${action} action succeeded: ${data.message}`);
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTriggerAutoClose = async () => {
    setError(null);
    setSuccess(null);

    try {
      const res = await authFetch("/api/catalog/plans/auto-close", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auto-close check failed");
      setSuccess(data.message || `Auto-close check finished. Closed ${data.closed_count} expired plan(s).`);
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeletePlan = async (id: string, planName: string) => {
    if (!confirm(`Delete plan "${planName}"?`)) return;

    try {
      const res = await authFetch(`/api/catalog/plans/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete plan");
      }
      setSuccess(`Plan "${planName}" deleted.`);
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[30px] sm:text-[36px] font-semibold leading-tight text-zinc-900 dark:text-white">Plans</h1>
            <p className="mt-1.5 max-w-[68ch] text-[15px] text-zinc-600 dark:text-zinc-400">How often each plan bills, its minimum quantity and availability dates, and whether it can be paused, renewed or closed early.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerAutoClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-xs font-semibold shadow-sm transition cursor-pointer"
              title="Closes plans past their end date when auto_close is true"
            >
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              Run Auto-Close
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-medium text-sm shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Plan
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center gap-3 text-red-700 dark:text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Plans Grid */}
        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-sm">Loading billing plans...</div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-2xl border-zinc-300 dark:border-zinc-700">
            <Layers className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
            <p className="text-zinc-600 dark:text-zinc-400 font-medium">No plans configured yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((p) => {
              const isPastEnd = p.end_date ? new Date(p.end_date) < new Date() : false;

              return (
                <div
                  key={p.id}
                  className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Frequency badge & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
                        {p.billing_period}
                      </span>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            p.status === "ACTIVE"
                              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                              : p.status === "PAUSED"
                              ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {p.status}
                        </span>

                        {isAdmin && (
                          <button
                            onClick={() => handleDeletePlan(p.id, p.name)}
                            className="text-zinc-400 hover:text-red-600 p-1 rounded transition"
                            title="Delete plan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white mt-3">
                      {p.name}
                    </h2>

                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-zinc-900 dark:text-white">
                        ${p.price.toFixed(2)}
                      </span>
                      <span className="text-xs text-zinc-400">/ {p.billing_period}</span>
                    </div>

                    <p className="text-xs text-zinc-500 mt-1">
                      Min seats/quantity: <strong>{p.min_quantity}</strong>
                    </p>

                    {/* Validity Dates */}
                    {(p.start_date || p.end_date) && (
                      <div className="mt-3 text-[11px] p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 space-y-0.5">
                        {p.start_date && (
                          <div>Start: {new Date(p.start_date).toLocaleDateString()}</div>
                        )}
                        {p.end_date && (
                          <div className={isPastEnd ? "text-red-500 font-semibold" : ""}>
                            End: {new Date(p.end_date).toLocaleDateString()} {isPastEnd && "(Expired)"}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Flags grid */}
                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="text-[11px] text-zinc-400 uppercase font-semibold block mb-2">
                        Plan Action Flags:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <span className={`px-2 py-1 rounded flex items-center gap-1.5 text-[11px] ${p.auto_close ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300" : "text-zinc-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.auto_close ? "bg-emerald-500" : "bg-zinc-400"}`} />
                          Auto-Close: {p.auto_close ? "ON" : "OFF"}
                        </span>
                        <span className={`px-2 py-1 rounded flex items-center gap-1.5 text-[11px] ${p.closable ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300" : "text-zinc-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.closable ? "bg-emerald-500" : "bg-red-400"}`} />
                          Closable: {p.closable ? "Yes" : "No"}
                        </span>
                        <span className={`px-2 py-1 rounded flex items-center gap-1.5 text-[11px] ${p.pausable ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300" : "text-zinc-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.pausable ? "bg-emerald-500" : "bg-red-400"}`} />
                          Pausable: {p.pausable ? "Yes" : "No"}
                        </span>
                        <span className={`px-2 py-1 rounded flex items-center gap-1.5 text-[11px] ${p.renewable ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300" : "text-zinc-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.renewable ? "bg-emerald-500" : "bg-red-400"}`} />
                          Renewable: {p.renewable ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-[11px] text-zinc-400 block mb-1.5">Execute Action:</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handlePlanAction(p.id, "close")}
                        disabled={!p.closable || p.status === "CLOSED"}
                        title={!p.closable ? "Action blocked: closable flag is disabled" : "Close plan"}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition ${
                          !p.closable || p.status === "CLOSED"
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed opacity-60"
                            : "bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 cursor-pointer"
                        }`}
                      >
                        <XCircle className="w-3 h-3" />
                        Close
                      </button>

                      <button
                        onClick={() => handlePlanAction(p.id, "pause")}
                        disabled={!p.pausable || p.status === "PAUSED" || p.status === "CLOSED"}
                        title={!p.pausable ? "Action blocked: pausable flag is disabled" : "Pause plan"}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition ${
                          !p.pausable || p.status === "PAUSED" || p.status === "CLOSED"
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed opacity-60"
                            : "bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 cursor-pointer"
                        }`}
                      >
                        <Pause className="w-3 h-3" />
                        Pause
                      </button>

                      <button
                        onClick={() => handlePlanAction(p.id, "renew")}
                        disabled={!p.renewable || p.status === "ACTIVE"}
                        title={!p.renewable ? "Action blocked: renewable flag is disabled" : "Renew plan"}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition ${
                          !p.renewable || p.status === "ACTIVE"
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed opacity-60"
                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 cursor-pointer"
                        }`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Renew
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: New Plan */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Create Billing Plan
              </h2>

              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Enterprise Monthly Pro"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                      Billing Period (Frequency) *
                    </label>
                    <select
                      value={billingPeriod}
                      onChange={(e) => setBillingPeriod(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                      Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                      Minimum Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={minQuantity}
                      onChange={(e) => setMinQuantity(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Flags configuration */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-3">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                    Plan Behavior & Action Flags:
                  </span>

                  <label className="flex items-center gap-3 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={autoClose}
                      onChange={(e) => setAutoClose(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <div>
                      <strong className="text-zinc-900 dark:text-white">Auto Close</strong>
                      <p className="text-zinc-500 text-[11px]">Automatically close the plan when past its end date.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={closable}
                      onChange={(e) => setClosable(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <div>
                      <strong className="text-zinc-900 dark:text-white">Closable</strong>
                      <p className="text-zinc-500 text-[11px]">Permits closing this plan before or after end date.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={pausable}
                      onChange={(e) => setPausable(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <div>
                      <strong className="text-zinc-900 dark:text-white">Pausable</strong>
                      <p className="text-zinc-500 text-[11px]">Permits pausing this plan temporarily.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={renewable}
                      onChange={(e) => setRenewable(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <div>
                      <strong className="text-zinc-900 dark:text-white">Renewable</strong>
                      <p className="text-zinc-500 text-[11px]">Permits renewing this plan back to active state.</p>
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-indigo-700 hover:bg-indigo-800 text-white font-medium rounded-xl shadow-sm"
                  >
                    Save Plan
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
