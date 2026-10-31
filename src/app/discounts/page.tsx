"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import {
  Percent,
  Receipt,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight,
  Calculator,
} from "lucide-react";

interface Discount {
  id: string;
  code: string;
  name: string;
  type: "fixed" | "percentage";
  value: number;
  min_purchase: number | null;
  min_quantity: number | null;
  start_date: string | null;
  end_date: string | null;
  usage_limit: number | null;
  used_count: number;
  applies_to: "product" | "whole_subscription";
  product_id: string | null;
  targetProduct?: { name: string } | null;
  createdAt: string;
}

interface Tax {
  id: string;
  name: string;
  percentage: number;
  is_default: boolean;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  sales_price: number;
}

export default function DiscountsAndTaxesPage() {
  const { user, authFetch } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [activeTab, setActiveTab] = useState<"discounts" | "taxes" | "tester">("discounts");

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Discount Modal State
  const [isDiscModalOpen, setIsDiscModalOpen] = useState(false);
  const [discName, setDiscName] = useState("");
  const [discCode, setDiscCode] = useState("");
  const [discType, setDiscType] = useState<"percentage" | "fixed">("percentage");
  const [discValue, setDiscValue] = useState("15");
  const [discMinPurchase, setDiscMinPurchase] = useState("");
  const [discMinQty, setDiscMinQty] = useState("");
  const [discStartDate, setDiscStartDate] = useState("");
  const [discEndDate, setDiscEndDate] = useState("");
  const [discUsageLimit, setDiscUsageLimit] = useState("100");
  const [discScope, setDiscScope] = useState<"whole_subscription" | "product">("whole_subscription");
  const [discProductId, setDiscProductId] = useState("");

  // Tax Modal State
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [taxName, setTaxName] = useState("");
  const [taxPct, setTaxPct] = useState("10");
  const [taxIsDefault, setTaxIsDefault] = useState(false);

  // Tester State
  const [testerQty, setTesterQty] = useState("3");
  const [testerCode, setTesterCode] = useState("");
  const [testerProdId, setTesterProdId] = useState("");
  const [testResults, setTestResults] = useState<any[] | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [discRes, taxRes, prodRes] = await Promise.all([
        authFetch("/api/catalog/discounts"),
        authFetch("/api/catalog/taxes"),
        authFetch("/api/catalog/products"),
      ]);

      if (discRes.ok) {
        const data = await discRes.json();
        setDiscounts(data.discounts || []);
      }
      if (taxRes.ok) {
        const data = await taxRes.json();
        setTaxes(data.taxes || []);
      }
      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(data.products || []);
        if (data.products?.length > 0 && !testerProdId) {
          setTesterProdId(data.products[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load catalog rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await authFetch("/api/catalog/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: discName,
          code: discCode || undefined,
          type: discType,
          value: parseFloat(discValue) || 0,
          min_purchase: discMinPurchase ? parseFloat(discMinPurchase) : null,
          min_quantity: discMinQty ? parseInt(discMinQty, 10) : null,
          start_date: discStartDate ? new Date(discStartDate).toISOString() : null,
          end_date: discEndDate ? new Date(discEndDate).toISOString() : null,
          usage_limit: discUsageLimit ? parseInt(discUsageLimit, 10) : null,
          applies_to: discScope,
          product_id: discScope === "product" ? discProductId : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create discount");

      setSuccess(`Discount "${discName}" created successfully!`);
      setIsDiscModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteDiscount = async (id: string, name: string) => {
    if (!confirm(`Delete discount "${name}"?`)) return;
    try {
      const res = await authFetch(`/api/catalog/discounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete discount");
      setSuccess(`Discount "${name}" deleted.`);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await authFetch("/api/catalog/taxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: taxName,
          percentage: parseFloat(taxPct) || 0,
          is_default: taxIsDefault,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create tax");

      setSuccess(`Tax rule "${taxName}" created successfully!`);
      setIsTaxModalOpen(false);
      setTaxName("");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTax = async (id: string, name: string) => {
    if (!confirm(`Delete tax rule "${name}"?`)) return;
    try {
      const res = await authFetch(`/api/catalog/taxes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete tax");
      setSuccess(`Tax rule "${name}" deleted.`);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTestDiscounts = async () => {
    setError(null);
    try {
      const selectedProd = products.find((p) => p.id === testerProdId);
      const qty = parseInt(testerQty, 10) || 1;
      const unitPrice = selectedProd?.sales_price || 100;
      const subtotal = qty * unitPrice;

      const res = await authFetch("/api/catalog/discounts/applicable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: { discountCode: testerCode || null, subtotal },
          lines: [{ productId: testerProdId, quantity: qty, unitPrice, amount: subtotal }],
          today: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Calculation failed");
      setTestResults(data.valid_discounts || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400">
                <Percent className="w-6 h-6" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Discounts & Taxes Rules
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Configure promotional discounts (fixed/percentage, product/subscription scope, usage limits) and tax rates.
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              {activeTab === "discounts" && (
                <button
                  onClick={() => setIsDiscModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm shadow-indigo-500/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Discount
                </button>
              )}
              {activeTab === "taxes" && (
                <button
                  onClick={() => setIsTaxModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm shadow-indigo-500/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Tax Rule
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("discounts")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === "discounts"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Discounts ({discounts.length})
          </button>
          <button
            onClick={() => setActiveTab("taxes")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === "taxes"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Taxes ({taxes.length})
          </button>
          <button
            onClick={() => setActiveTab("tester")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "tester"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Live Engine Tester
          </button>
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

        {/* TAB 1: DISCOUNTS */}
        {activeTab === "discounts" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {discounts.map((d) => (
              <div
                key={d.id}
                className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400">
                      {d.code}
                    </span>

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteDiscount(d.id, d.name)}
                        className="text-zinc-400 hover:text-red-600 p-1"
                        title="Delete discount"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 dark:text-white mt-2">
                    {d.name}
                  </h3>

                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {d.type === "percentage" ? `${d.value}% Off` : `$${d.value.toFixed(2)} Off`}
                    </span>
                    <span className="text-xs text-zinc-400 uppercase">
                      ({d.applies_to.replace("_", " ")})
                    </span>
                  </div>

                  {d.targetProduct && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Applies to product: <strong>{d.targetProduct.name}</strong>
                    </p>
                  )}

                  {/* Conditions & Thresholds */}
                  <div className="mt-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-xs space-y-1">
                    {d.min_quantity && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Min Quantity:</span>
                        <strong className="text-zinc-700 dark:text-zinc-300">{d.min_quantity} items</strong>
                      </div>
                    )}
                    {d.min_purchase && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Min Order Total:</span>
                        <strong className="text-zinc-700 dark:text-zinc-300">${d.min_purchase.toFixed(2)}</strong>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Usage Limit:</span>
                      <strong className="text-zinc-700 dark:text-zinc-300">
                        {d.used_count} / {d.usage_limit ?? "∞"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400">
                  {d.start_date && <span>Starts: {new Date(d.start_date).toLocaleDateString()}</span>}
                  {d.end_date && <span className="ml-2">Ends: {new Date(d.end_date).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: TAXES */}
        {activeTab === "taxes" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {taxes.map((t) => (
              <div
                key={t.id}
                className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl font-black text-zinc-900 dark:text-white">
                      {t.percentage}%
                    </span>

                    <div className="flex items-center gap-2">
                      {t.is_default && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 uppercase">
                          Default
                        </span>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteTax(t.id, t.name)}
                          className="text-zinc-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 dark:text-white mt-2">
                    {t.name}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400">
                  Added on: {new Date(t.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: LIVE TESTER */}
        {activeTab === "tester" && (
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Live Invoicing & Pricing Discount Evaluator
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Simulate Member 3 invoice generation calling `get_applicable_discounts(subscription, lines, today)`.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Target Product
                </label>
                <select
                  value={testerProdId}
                  onChange={(e) => setTesterProdId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.sales_price})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={testerQty}
                  onChange={(e) => setTesterQty(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Promo / Discount Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. VOLUME15 or WELCOME50"
                  value={testerCode}
                  onChange={(e) => setTesterCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleTestDiscounts}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition cursor-pointer flex items-center gap-2"
            >
              Evaluate Applicable Discounts
              <ArrowRight className="w-4 h-4" />
            </button>

            {testResults && (
              <div className="mt-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-3">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Evaluation Result: {testResults.length} Valid Discount(s) Found
                </h4>

                {testResults.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">
                    No discounts met date, quantity, purchase amount or usage constraints for this scenario.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {testResults.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs"
                      >
                        <div>
                          <strong className="text-indigo-600 dark:text-indigo-400 font-mono mr-2">[{r.code}]</strong>
                          <span className="font-semibold text-zinc-900 dark:text-white">{r.name}</span>
                        </div>
                        <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          -${r.calculated_discount_amount?.toFixed(2) || "0.00"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal: Add Discount */}
        {isDiscModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Add Discount Rule
              </h2>

              <form onSubmit={handleCreateDiscount} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Rule Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={discName}
                      onChange={(e) => setDiscName(e.target.value)}
                      placeholder="e.g. Volume Tier Discount"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Discount Code
                    </label>
                    <input
                      type="text"
                      value={discCode}
                      onChange={(e) => setDiscCode(e.target.value)}
                      placeholder="e.g. VOLUME20"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Type *
                    </label>
                    <select
                      value={discType}
                      onChange={(e: any) => setDiscType(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Value *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={discValue}
                      onChange={(e) => setDiscValue(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Scope *
                    </label>
                    <select
                      value={discScope}
                      onChange={(e: any) => setDiscScope(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    >
                      <option value="whole_subscription">Whole Subscription</option>
                      <option value="product">Specific Product</option>
                    </select>
                  </div>
                  {discScope === "product" && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Select Product *
                      </label>
                      <select
                        required
                        value={discProductId}
                        onChange={(e) => setDiscProductId(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      >
                        <option value="">Choose product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Min Purchase Amount ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={discMinPurchase}
                      onChange={(e) => setDiscMinPurchase(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Min Quantity (Seats/Items)
                    </label>
                    <input
                      type="number"
                      value={discMinQty}
                      onChange={(e) => setDiscMinQty(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={discStartDate}
                      onChange={(e) => setDiscStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={discEndDate}
                      onChange={(e) => setDiscEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Usage Limit (Max Redeems)
                  </label>
                  <input
                    type="number"
                    value={discUsageLimit}
                    onChange={(e) => setDiscUsageLimit(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsDiscModalOpen(false)}
                    className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm"
                  >
                    Save Discount
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Tax */}
        {isTaxModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Add Tax Rule
              </h2>

              <form onSubmit={handleCreateTax} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tax Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={taxName}
                    onChange={(e) => setTaxName(e.target.value)}
                    placeholder="e.g. Standard VAT (10%)"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Rate Percentage (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={taxPct}
                    onChange={(e) => setTaxPct(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxIsDefault}
                    onChange={(e) => setTaxIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span>Set as default tax rule for new subscription lines</span>
                </label>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsTaxModalOpen(false)}
                    className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm"
                  >
                    Save Tax
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
