"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function InvoicePrintPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInv() {
      try {
        const res = await fetch(`/api/invoices/${id}`);
        const data = await res.json();
        if (data.invoice) setInvoice(data.invoice);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchInv();
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-sm font-sans">Loading invoice for print preview...</div>;
  }

  if (!invoice) {
    return <div className="p-12 text-center text-sm font-sans">Invoice not found.</div>;
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans p-8 md:p-12">
      {/* Print Controls (Hidden when printing) */}
      <div className="print:hidden max-w-3xl mx-auto mb-8 flex items-center justify-between p-4 bg-zinc-100 rounded-xl border border-zinc-300">
        <Link
          href={`/invoices/${invoice.id}`}
          className="text-xs font-semibold text-zinc-700 hover:text-black flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to App
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-sm transition cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      {/* Printable Invoice Sheet */}
      <div className="max-w-3xl mx-auto border border-zinc-200 p-8 sm:p-12 rounded-lg shadow-sm print:shadow-none print:border-none print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start pb-8 border-b-2 border-zinc-800">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-950 uppercase">Brightloop Software</h1>
            <p className="text-xs text-zinc-600 mt-1">
              Subscription & Recurring Billing Systems
              <br />
              billing@brightloop.com • https://brightloop.com
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Invoice</span>
            <div className="text-xl font-black text-zinc-950">{invoice.invoiceNumber}</div>
            <div className="text-xs text-zinc-600 mt-1">
              Status: <span className="font-bold uppercase">{invoice.status}</span>
            </div>
          </div>
        </div>

        {/* Invoice Metadata */}
        <div className="grid grid-cols-2 gap-8 my-8 text-xs">
          <div>
            <div className="font-bold uppercase tracking-wider text-zinc-400 mb-1">Billed To</div>
            <div className="font-bold text-sm text-zinc-900">{invoice.customer.name}</div>
            <div className="text-zinc-600">{invoice.customer.email}</div>
          </div>

          <div className="text-right">
            <div className="font-bold uppercase tracking-wider text-zinc-400 mb-1">Dates</div>
            <div>
              <span className="text-zinc-500">Invoice Date: </span>
              <span className="font-semibold">{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-zinc-500">Payment Due: </span>
              <span className="font-bold text-zinc-950">{new Date(invoice.dueDate).toLocaleDateString()}</span>
            </div>
            {invoice.subscription && (
              <div className="mt-1 text-zinc-500">
                Ref: {invoice.subscription.subscriptionNumber} ({invoice.subscription.plan.name})
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-left text-xs mb-8">
          <thead>
            <tr className="border-b-2 border-zinc-200 text-zinc-500 uppercase text-[10px]">
              <th className="py-2.5 font-bold">Item & Description</th>
              <th className="py-2.5 font-bold text-center">Qty</th>
              <th className="py-2.5 font-bold text-right">Unit Price</th>
              <th className="py-2.5 font-bold text-right">Tax Rate</th>
              <th className="py-2.5 font-bold text-right">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {invoice.lines.map((l: any) => (
              <tr key={l.id}>
                <td className="py-3 font-semibold text-zinc-900">{l.description}</td>
                <td className="py-3 text-center">{l.quantity}</td>
                <td className="py-3 text-right">${l.unitPrice.toFixed(2)}</td>
                <td className="py-3 text-right">{l.taxRate}%</td>
                <td className="py-3 text-right font-bold text-zinc-900">${l.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal:</span>
              <span className="font-semibold">${invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Discount:</span>
                <span>-${invoice.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-600">
              <span>Tax (Calculated):</span>
              <span className="font-semibold">${invoice.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t-2 border-zinc-800 text-sm font-black text-zinc-950">
              <span>Total Due:</span>
              <span>${invoice.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes & Bank Details */}
        <div className="border-t border-zinc-200 pt-6 text-[11px] text-zinc-500">
          <p className="font-semibold text-zinc-700">Payment Instructions</p>
          <p className="mt-1">
            Please settle within the agreed payment terms. Thank you for your business with Brightloop Software.
          </p>
        </div>
      </div>
    </div>
  );
}
