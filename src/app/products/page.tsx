"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import {
  Package,
  Plus,
  Trash2,
  Tag,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  X,
  TrendingUp,
} from "lucide-react";

interface Variant {
  id: string;
  productId: string;
  attribute: string | null;
  value: string | null;
  name: string;
  extra_price: number;
}

interface Product {
  id: string;
  name: string;
  type: string;
  sales_price: number;
  cost_price: number;
  notes: string | null;
  variants: Variant[];
  createdAt: string;
}

interface FormVariantRow {
  attribute: string;
  value: string;
  extra_price: string;
}

export default function ProductsPage() {
  const { user, authFetch } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  // Create Product Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("Software");
  const [salesPrice, setSalesPrice] = useState("400");
  const [costPrice, setCostPrice] = useState("150");
  const [notes, setNotes] = useState("");
  const [variantRows, setVariantRows] = useState<FormVariantRow[]>([
    { attribute: "brand", value: "Odoo", extra_price: "560" },
  ]);

  // Quick Add Variant to existing product Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [variantAttr, setVariantAttr] = useState("brand");
  const [variantVal, setVariantVal] = useState("Enterprise");
  const [variantExtra, setVariantExtra] = useState("200");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/catalog/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err: any) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addVariantRow = () => {
    setVariantRows((prev) => [
      ...prev,
      { attribute: "brand", value: "", extra_price: "0" },
    ]);
  };

  const updateVariantRow = (index: number, field: keyof FormVariantRow, value: string) => {
    setVariantRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeVariantRow = (index: number) => {
    setVariantRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const formattedVariants = variantRows
        .filter((r) => r.value.trim() !== "")
        .map((r) => ({
          attribute: r.attribute.trim() || null,
          value: r.value.trim(),
          name: r.attribute.trim() ? `${r.attribute.trim()}: ${r.value.trim()}` : r.value.trim(),
          extra_price: parseFloat(r.extra_price) || 0,
        }));

      const res = await authFetch("/api/catalog/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          sales_price: parseFloat(salesPrice) || 0,
          cost_price: parseFloat(costPrice) || 0,
          notes: notes.trim() || null,
          variants: formattedVariants,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create product");

      setSuccess(`Product "${name}" created with ${formattedVariants.length} variant(s)!`);
      setIsCreateOpen(false);
      setName("");
      setNotes("");
      setSalesPrice("400");
      setCostPrice("150");
      setVariantRows([{ attribute: "brand", value: "Odoo", extra_price: "560" }]);
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    if (!confirm(`Delete product "${prodName}" and all its variants?`)) return;

    try {
      const res = await authFetch(`/api/catalog/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete product");
      }
      setSuccess(`Product "${prodName}" deleted.`);
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await authFetch(`/api/catalog/products/${selectedProduct.id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attribute: variantAttr.trim(),
          value: variantVal.trim(),
          extra_price: parseFloat(variantExtra) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add variant");

      setSuccess(`Variant "${variantAttr} = ${variantVal}" added (+$${variantExtra})`);
      setIsVariantModalOpen(false);
      setVariantAttr("brand");
      setVariantVal("");
      setVariantExtra("0");
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm("Are you sure you want to remove this variant?")) return;

    try {
      const res = await authFetch(`/api/catalog/variants/${variantId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete variant");
      setSuccess("Variant removed.");
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.variants.some(
        (v) =>
          v.value?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.attribute?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesType = filterType === "ALL" || p.type.toUpperCase() === filterType.toUpperCase();
    return matchesSearch && matchesType;
  });

  const parsedBasePrice = parseFloat(salesPrice) || 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <Package className="w-6 h-6" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Products & Variants Catalog
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Admin screens: product list and form with variant rows. Unit price = base price + variant extra price.
            </p>
          </div>

          {isAdmin ? (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm shadow-indigo-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Product (with Variants)
            </button>
          ) : (
            <span className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
              Read-Only (Admin Write Required)
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

        {/* Controls: Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products or variants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            >
              <option value="ALL">All Product Types</option>
              <option value="SOFTWARE">Software</option>
              <option value="ADD-ON">Add-on</option>
              <option value="SERVICE">Service</option>
              <option value="HARDWARE">Hardware</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-sm">Loading product catalog...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-2xl border-zinc-300 dark:border-zinc-700">
            <Package className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
            <p className="text-zinc-600 dark:text-zinc-400 font-medium">No products match your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProducts.map((p) => {
              const margin = p.sales_price - p.cost_price;
              const marginPct = p.cost_price > 0 ? ((margin / p.cost_price) * 100).toFixed(0) : "100";

              return (
                <div
                  key={p.id}
                  className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Header & Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                            {p.type}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {p.variants.length} variant{p.variants.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mt-1.5">
                          {p.name}
                        </h2>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Price & Cost Breakdown */}
                    <div className="mt-4 grid grid-cols-3 gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60">
                      <div>
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase">Base Price</span>
                        <p className="text-base font-extrabold text-zinc-900 dark:text-white">
                          ${p.sales_price.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase">Cost Price</span>
                        <p className="text-base font-medium text-zinc-600 dark:text-zinc-400">
                          ${p.cost_price.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-500" /> Margin
                        </span>
                        <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                          +${margin} <span className="text-xs font-normal">({marginPct}%)</span>
                        </p>
                      </div>
                    </div>

                    {p.notes && (
                      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 italic">
                        &quot;{p.notes}&quot;
                      </p>
                    )}

                    {/* Variants Section */}
                    <div className="mt-5 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-indigo-500" />
                          Configured Variants ({p.variants.length})
                        </span>

                        {isAdmin && (
                          <button
                            onClick={() => {
                              setSelectedProduct(p);
                              setIsVariantModalOpen(true);
                            }}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Variant
                          </button>
                        )}
                      </div>

                      {p.variants.length === 0 ? (
                        <p className="text-xs text-zinc-400 py-1">No variants configured. Base price applies directly.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {p.variants.map((v) => {
                            const unitPrice = p.sales_price + v.extra_price;
                            return (
                              <div
                                key={v.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                    {v.attribute ? `${v.attribute} = ${v.value}` : v.value || v.name}
                                  </span>
                                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                    (+${v.extra_price})
                                  </span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-zinc-900 dark:text-white bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded text-[11px]">
                                    Final Unit: ${unitPrice}
                                  </span>
                                  {isAdmin && (
                                    <button
                                      onClick={() => handleDeleteVariant(v.id)}
                                      className="text-zinc-400 hover:text-red-500 transition cursor-pointer"
                                      title="Remove variant"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>ID: {p.id.slice(0, 8)}...</span>
                    <span>Created: {new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create Product WITH INLINE VARIANT ROWS */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-2xl p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 my-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Create Product with Variant Rows
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Define base product specs and add inline variant options with extra pricing.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Enterprise Cloud ERP"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Type
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    >
                      <option value="Software">Software</option>
                      <option value="Add-on">Add-on</option>
                      <option value="Service">Service</option>
                      <option value="Subscription">Subscription</option>
                      <option value="Hardware">Hardware</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Sales Base Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={salesPrice}
                      onChange={(e) => setSalesPrice(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Cost Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional offering details or internal notes..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-indigo-500"
                  />
                </div>

                {/* INLINE VARIANT ROWS SECTION */}
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-500" />
                        Variant Rows (Optional)
                      </span>
                      <p className="text-[11px] text-zinc-500">
                        Price helper rule: Final Unit Price = Base Price + Variant Extra Price.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addVariantRow}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg cursor-pointer transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-500" /> Add Variant Row
                    </button>
                  </div>

                  {variantRows.length === 0 ? (
                    <div className="p-3 text-center rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400">
                      No variant rows added. Product will use base sales price only.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {variantRows.map((row, idx) => {
                        const extraNum = parseFloat(row.extra_price) || 0;
                        const finalCalcPrice = parsedBasePrice + extraNum;

                        return (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs"
                          >
                            <div className="flex-1">
                              <label className="text-[10px] text-zinc-400 uppercase font-semibold">Attribute</label>
                              <input
                                type="text"
                                placeholder="e.g. brand, tier, region"
                                value={row.attribute}
                                onChange={(e) => updateVariantRow(idx, "attribute", e.target.value)}
                                className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-zinc-400 uppercase font-semibold">Value *</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Odoo, Pro, US-East"
                                value={row.value}
                                onChange={(e) => updateVariantRow(idx, "value", e.target.value)}
                                className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                              />
                            </div>
                            <div className="w-28">
                              <label className="text-[10px] text-zinc-400 uppercase font-semibold">Extra Price ($)</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="560"
                                value={row.extra_price}
                                onChange={(e) => updateVariantRow(idx, "extra_price", e.target.value)}
                                className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                              />
                            </div>
                            <div className="w-32 text-center pt-3 sm:pt-0">
                              <span className="text-[10px] text-zinc-400 uppercase block font-semibold">Unit Price</span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                ${finalCalcPrice}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeVariantRow(idx)}
                              className="self-end sm:self-center p-1 text-zinc-400 hover:text-red-500 rounded transition cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm cursor-pointer"
                  >
                    Save Product with Variants
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Variant to existing product */}
        {isVariantModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Add Variant to {selectedProduct.name}
                </h2>
                <button
                  onClick={() => setIsVariantModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-zinc-500 mb-4">
                Base price: <strong className="text-zinc-800 dark:text-zinc-200">${selectedProduct.sales_price}</strong>. 
                Unit price preview = ${selectedProduct.sales_price + (parseFloat(variantExtra) || 0)}.
              </p>

              <form onSubmit={handleAddVariant} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Attribute (e.g. brand, edition, storage)
                  </label>
                  <input
                    type="text"
                    required
                    value={variantAttr}
                    onChange={(e) => setVariantAttr(e.target.value)}
                    placeholder="brand"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Value (e.g. Odoo, Pro, Enterprise)
                  </label>
                  <input
                    type="text"
                    required
                    value={variantVal}
                    onChange={(e) => setVariantVal(e.target.value)}
                    placeholder="Odoo"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Extra Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={variantExtra}
                    onChange={(e) => setVariantExtra(e.target.value)}
                    placeholder="560"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsVariantModalOpen(false)}
                    className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm cursor-pointer"
                  >
                    Save Variant
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
