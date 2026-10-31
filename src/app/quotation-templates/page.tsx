"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import {
  FileText,
  Plus,
  ArrowRight,
  Clock,
  Layers,
  Sparkles,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface QuotationTemplate {
  id: string;
  name: string;
  validityDays: number;
  planId: string | null;
  plan: { id: string; name: string; frequency: string; cost: number } | null;
  lines: {
    id: string;
    productId: string;
    product: { name: string; salesPrice: number; variants: any[] };
    quantity: number;
    unitPrice: number;
  }[];
}

export default function QuotationTemplatesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refData, setRefData] = useState<any>(null);

  // Create Template Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [validityDays, setValidityDays] = useState(30);
  const [planId, setPlanId] = useState("");
  const [lines, setLines] = useState([{ productId: "", quantity: 1, unitPrice: 0 }]);

  // Create Subscription From Template Modal
  const [selectedTemplate, setSelectedTemplate] = useState<QuotationTemplate | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 15");
  const [discountCode, setDiscountCode] = useState("");
  const [instantiating, setInstantiating] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quotation-templates");
      const data = await res.json();
      if (data.templates) setTemplates(data.templates);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const res = await fetch("/api/reference-data");
      const data = await res.json();
      setRefData(data);
      if (data.plans?.length > 0 && !planId) setPlanId(data.plans[0].id);
      if (data.products?.length > 0 && lines[0].productId === "") {
        setLines([
          { productId: data.products[0].id, quantity: 1, unitPrice: data.products[0].salesPrice },
        ]);
      }
      if (data.customers?.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(data.customers[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchReferenceData();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch("/api/quotation-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          validityDays: Number(validityDays),
          planId: planId || null,
          lines,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to create template");
      } else {
        setIsCreateOpen(false);
        setName("");
        await fetchTemplates();
      }
    } catch (err: any) {
      alert(err.message || "Failed to create");
    }
  };

  const handleInstantiateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !selectedCustomerId) return;

    setInstantiating(true);
    try {
      const res = await fetch(`/api/quotation-templates/${selectedTemplate.id}/create-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          paymentTerms,
          discountCode: discountCode || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create subscription from template");
      } else {
        alert(`🎉 Subscription ${data.subscription.subscriptionNumber} created with lines copied!`);
        setSelectedTemplate(null);
        router.push("/subscriptions");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create subscription");
    } finally {
      setInstantiating(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`/api/quotation-templates/${templateId}`, { method: "DELETE" });
      if (res.ok) await fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const addLine = () => {
    if (!refData?.products?.length) return;
    setLines([
      ...lines,
      { productId: refData.products[0].id, quantity: 1, unitPrice: refData.products[0].salesPrice },
    ]);
  };

  const removeLine = (idx: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  };

  const updateLineProduct = (idx: number, pId: string) => {
    const prod = refData?.products.find((p: any) => p.id === pId);
    const updated = [...lines];
    updated[idx].productId = pId;
    updated[idx].unitPrice = prod ? prod.salesPrice : 0;
    setLines(updated);
  };

  const isStaffOrAdmin = user?.role === "ADMIN" || user?.role === "STAFF";

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[30px] sm:text-[36px] font-semibold leading-tight text-zinc-900 dark:text-white">Quotation templates</h1>
            <p className="mt-1.5 max-w-[68ch] text-[15px] text-zinc-600 dark:text-zinc-400">Ready-made offers with a plan and product lines. Turn one into a subscription for a customer in a few clicks.</p>
          </div>

          {isStaffOrAdmin && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          )}
        </div>

        {/* Template Cards Grid */}
        {loading ? (
          <div className="p-12 text-center text-zinc-500">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-500 mb-2" />
            Loading quotation templates...
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <FileText className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">No Quotation Templates</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Create a quotation template with preset product lines to speed up sales quotes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => {
              const totalEstimate = tpl.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

              return (
                <div
                  key={tpl.id}
                  className="flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-white">{tpl.name}</h3>
                      {user?.role === "ADMIN" && (
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="text-zinc-400 hover:text-rose-500 p-1"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        Valid {tpl.validityDays} days
                      </span>
                      {tpl.plan && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-medium">
                          <Layers className="w-3 h-3" />
                          {tpl.plan.name}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
                      <div className="text-[11px] font-semibold text-zinc-400">
                        Included Product Lines
                      </div>
                      {tpl.lines.map((line) => (
                        <div key={line.id} className="flex justify-between text-xs text-zinc-600 dark:text-zinc-300">
                          <span>
                            {line.quantity}x {line.product.name}
                          </span>
                          <span className="font-semibold text-zinc-900 dark:text-white">
                            ${(line.unitPrice * line.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400">Template Total</span>
                      <div className="text-base font-bold text-zinc-900 dark:text-white">
                        ${totalEstimate.toFixed(2)}
                      </div>
                    </div>

                    {isStaffOrAdmin && (
                      <button
                        onClick={() => setSelectedTemplate(tpl)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Turn into Quote
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create Template */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl p-6 shadow-xl my-8">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">New Quotation Template</h3>
                <button onClick={() => setIsCreateOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTemplate} className="mt-4 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Enterprise Bundle (Software + Support)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                      Billing Plan
                    </label>
                    <select
                      value={planId}
                      onChange={(e) => setPlanId(e.target.value)}
                      className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
                    >
                      {refData?.plans.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.frequency})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                      Validity (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={validityDays}
                      onChange={(e) => setValidityDays(Number(e.target.value))}
                      className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Line items */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Preset Lines</label>
                    <button
                      type="button"
                      onClick={addLine}
                      className="text-xs text-indigo-600 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Item
                    </button>
                  </div>
                  <div className="space-y-2">
                    {lines.map((line, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={line.productId}
                          onChange={(e) => updateLineProduct(idx, e.target.value)}
                          className="flex-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5"
                        >
                          {refData?.products.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (${p.salesPrice})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => {
                            const updated = [...lines];
                            updated[idx].quantity = Number(e.target.value);
                            setLines(updated);
                          }}
                          className="w-16 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-center"
                        />
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-zinc-400 hover:text-rose-500"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
                  >
                    Save Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Instantiate Subscription From Template */}
        {selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Turn Quote into Subscription
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Template: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedTemplate.name}</span>
                (Valid {selectedTemplate.validityDays} days).
              </p>

              <form onSubmit={handleInstantiateSubscription} className="mt-4 space-y-3">
                <div>
                  <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                    Select Customer *
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                    className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
                  >
                    {refData?.customers.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
                  >
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Immediate">Immediate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                    Discount Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VOLUME15, WELCOME50"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={instantiating}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-700 hover:bg-indigo-800 text-white"
                  >
                    {instantiating ? "Creating..." : "Create Subscription"}
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
