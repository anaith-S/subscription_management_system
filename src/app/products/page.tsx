"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import {
  Package,
  Plus,
  Trash2,
  Edit,
  Tag,
  DollarSign,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
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

export default function ProductsPage() {
  const { user, authFetch } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create Product Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("Software");
  const [salesPrice, setSalesPrice] = useState("400");
  const [costPrice, setCostPrice] = useState("150");
  const [notes, setNotes] = useState("");

  // Variant Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [variantAttr, setVariantAttr] = useState("brand");
  const [variantVal, setVariantVal] = useState("Odoo");
  const [variantExtra, setVariantExtra] = useState("560");

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

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await authFetch("/api/catalog/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          sales_price: parseFloat(salesPrice) || 0,
          cost_price: parseFloat(costPrice) || 0,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create product");

      setSuccess(`Product "${name}" created successfully!`);
      setIsCreateOpen(false);
      setName("");
      setNotes("");
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
          attribute: variantAttr,
          value: variantVal,
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

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[30px] sm:text-[36px] font-semibold leading-tight text-zinc-900 dark:text-white">Products</h1>
            <p className="mt-1.5 max-w-[68ch] text-[15px] text-zinc-600 dark:text-zinc-400">What Brightloop sells, with sales and cost prices. Variants add to the base price, for example the Odoo brand adds $560.</p>
          </div>

          {isAdmin ? (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-medium text-sm shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Product
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

        {/* Products Grid */}
        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-sm">Loading product catalog...</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-2xl border-zinc-300 dark:border-zinc-700">
            <Package className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
            <p className="text-zinc-600 dark:text-zinc-400 font-medium">No products registered yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {products.map((p) => (
              <div
                key={p.id}
                className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {p.type}
                      </span>
                      <h2 className="text-lg font-bold text-zinc-900 dark:text-white mt-1">
                        {p.name}
                      </h2>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="text-zinc-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {p.notes && (
                    <p className="text-xs text-zinc-500 mt-2 italic">{p.notes}</p>
                  )}

                  {/* Pricing info */}
                  <div className="mt-4 grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                    <div>
                      <span className="text-[11px] text-zinc-400 block uppercase">Sales Price</span>
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        ${p.sales_price.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-zinc-400 block uppercase">Cost Price</span>
                      <span className="text-base font-semibold text-zinc-600 dark:text-zinc-400">
                        ${p.cost_price.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Variants Section */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                        <Tag className="w-3.5 h-3.5" />
                        <span>Product Variants ({p.variants.length})</span>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setIsVariantModalOpen(true);
                          }}
                          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Variant
                        </button>
                      )}
                    </div>

                    {p.variants.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic">No variants configured (standard base price applies).</p>
                    ) : (
                      <div className="space-y-1.5">
                        {p.variants.map((v) => {
                          const unitPrice = p.sales_price + v.extra_price;
                          return (
                            <div
                              key={v.id}
                              className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-zinc-900 dark:text-white">
                                  {v.name}
                                </span>
                                {v.extra_price > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]">
                                    +${v.extra_price.toFixed(2)}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-zinc-500 font-mono">
                                  Final: <strong className="text-zinc-900 dark:text-white">${unitPrice.toFixed(2)}</strong>
                                </span>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteVariant(v.id)}
                                    className="text-zinc-400 hover:text-red-600"
                                    title="Delete variant"
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

                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>ID: {p.id.slice(0, 8)}...</span>
                  <span>Formula: Unit Price = Base (${p.sales_price.toFixed(2)}) + Variant Extra</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Add Product */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Add New Catalog Product
              </h2>

              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Brightloop Business Cloud"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
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
                      <option value="Hardware">Hardware</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                      Sales Price ($) *
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
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
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
                  <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional offering details..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-indigo-700 hover:bg-indigo-800 text-white font-medium rounded-xl shadow-sm"
                  >
                    Save Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Variant */}
        {isVariantModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Add Variant to {selectedProduct.name}
              </h2>
              <p className="text-xs text-zinc-500 mt-1 mb-4">
                Define an attribute (e.g. brand), value (e.g. Odoo), and extra price.
              </p>

              <form onSubmit={handleAddVariant} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                    Attribute (e.g. brand, tier, region)
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
                  <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                    Value (e.g. Odoo, Enterprise, US-East)
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
                  <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                    Extra Price ($) (e.g. +560)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={variantExtra}
                    onChange={(e) => setVariantExtra(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white focus:outline-indigo-500"
                  />
                </div>

                {/* Preview final price */}
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs">
                  <span className="text-zinc-500 block mb-1">Price Calculation Preview:</span>
                  <div className="flex justify-between font-mono">
                    <span>Base (${selectedProduct.sales_price.toFixed(2)}) + Extra (${(parseFloat(variantExtra) || 0).toFixed(2)}) =</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      ${(selectedProduct.sales_price + (parseFloat(variantExtra) || 0)).toFixed(2)}
                    </strong>
                  </div>
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
                    className="px-4 py-2 text-sm bg-indigo-700 hover:bg-indigo-800 text-white font-medium rounded-xl shadow-sm"
                  >
                    Add Variant
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
