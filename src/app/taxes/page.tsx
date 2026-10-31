"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import {
  Receipt,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Calculator,
  Percent,
  X,
  ShieldAlert,
} from "lucide-react";

interface Tax {
  id: string;
  name: string;
  percentage: number;
  ratePercentage?: number;
  is_default: boolean;
  isDefault?: boolean;
  createdAt: string;
}

export default function TaxesPage() {
  const { user, authFetch } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & Calculator
  const [searchTerm, setSearchTerm] = useState("");
  const [previewBase, setPreviewBase] = useState("1000");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taxName, setTaxName] = useState("");
  const [taxPct, setTaxPct] = useState("18");
  const [taxIsDefault, setTaxIsDefault] = useState(false);

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/catalog/taxes");
      if (!res.ok) throw new Error("Failed to fetch taxes");
      const data = await res.json();
      setTaxes(data.taxes || []);
    } catch (err: any) {
      setError(err.message || "Failed to load tax rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const pctValue = parseFloat(taxPct);
      if (isNaN(pctValue) || pctValue < 0) {
        throw new Error("Tax percentage must be 0 or greater");
      }

      const res = await authFetch("/api/catalog/taxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: taxName.trim(),
          percentage: pctValue,
          is_default: taxIsDefault,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create tax");

      setSuccess(`Tax rule "${taxName}" (${pctValue}%) created successfully!`);
      setIsModalOpen(false);
      setTaxName("");
      setTaxPct("18");
      setTaxIsDefault(false);
      fetchTaxes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTax = async (id: string, name: string) => {
    if (!confirm(`Delete tax rule "${name}"?`)) return;

    try {
      const res = await authFetch(`/api/catalog/taxes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete tax");
      }
      setSuccess(`Tax rule "${name}" deleted.`);
      fetchTaxes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredTaxes = taxes.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const baseAmount = parseFloat(previewBase) || 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Receipt className="w-6 h-6" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Tax Rules Catalog
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Admin screens: tax list and form with percentages and default billing tax designations.
            </p>
          </div>

          {isAdmin ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm shadow-emerald-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Tax Rule
            </button>
          ) : (
            <span className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> Read-Only (Admin write required)
            </span>
          )}
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

        {/* Controls & Quick Estimator */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tax rules by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
            <Calculator className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
              Test Base ($):
            </span>
            <input
              type="number"
              value={previewBase}
              onChange={(e) => setPreviewBase(e.target.value)}
              className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            />
          </div>
        </div>

        {/* Taxes List Grid */}
        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-sm">Loading tax rules...</div>
        ) : filteredTaxes.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-2xl border-zinc-300 dark:border-zinc-700">
            <Receipt className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
            <p className="text-zinc-600 dark:text-zinc-400 font-medium">No tax rules registered</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTaxes.map((tax) => {
              const pct = Number(tax.percentage ?? tax.ratePercentage ?? 0);
              const isDef = Boolean(tax.is_default ?? tax.isDefault);
              const taxAmount = (baseAmount * pct) / 100;
              const totalAmount = baseAmount + taxAmount;

              return (
                <div
                  key={tax.id}
                  className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {isDef && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                            Default System Tax
                          </span>
                        )}
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mt-1">
                          {tax.name}
                        </h2>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteTax(tax.id, tax.name)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                          title="Delete Tax"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="mt-4 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase">
                          Tax Rate
                        </span>
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                          {pct}%
                        </span>
                      </div>
                    </div>

                    {/* Live Calculator Card */}
                    <div className="mt-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Live Preview on ${baseAmount}
                      </span>
                      <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                        <span>Tax Added ({pct}%):</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">+${taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-zinc-900 dark:text-white pt-1 border-t border-zinc-200 dark:border-zinc-700">
                        <span>Total with Tax:</span>
                        <span>${totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>ID: {tax.id.slice(0, 8)}...</span>
                    <span>Created: {new Date(tax.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create Tax Form */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Percent className="w-5 h-5 text-emerald-600" />
                  Create Tax Rule
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTax} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tax Rule Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={taxName}
                    onChange={(e) => setTaxName(e.target.value)}
                    placeholder="e.g. GST Standard 18%, State VAT 5%"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Percentage (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={taxPct}
                      onChange={(e) => setTaxPct(e.target.value)}
                      placeholder="18"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 font-bold">%</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                  <label className="flex items-center gap-3 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={taxIsDefault}
                      onChange={(e) => setTaxIsDefault(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <strong className="text-zinc-900 dark:text-white">Default Tax Rule</strong>
                      <p className="text-zinc-500 text-[11px]">Automatically pre-select this tax when creating subscriptions and invoices.</p>
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
                    className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm cursor-pointer"
                  >
                    Save Tax Rule
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
