"use client";

import React, { useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/brand/AuthLayout";
import { useAuth } from "@/context/AuthContext";
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    const result = await forgotPassword(email);
    setIsSubmitting(false);

    if (result.success) {
      setStatusMessage(
        result.message ||
          "If an account with that email exists, a password reset link has been sent."
      );
    } else {
      setError(result.error || "Failed to submit request");
    }
  };

  return (
    <AuthLayout>
      <div className="w-full space-y-8">
        <div>
          <h1 className="text-[34px] font-semibold leading-tight text-zinc-900 dark:text-white">Reset your password</h1>
          <p className="mt-2 text-[15px] text-zinc-600 dark:text-zinc-400">Enter your account email and we’ll send you a reset link.</p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3.5 flex items-start gap-3 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {statusMessage && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 p-4 space-y-3">
            <div className="flex items-start gap-2.5 text-emerald-800 dark:text-emerald-300 text-sm font-medium">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{statusMessage}</span>
            </div>

            {/* The token is never sent to the browser; it is printed server-side. */}
            {process.env.NODE_ENV !== "production" && (
              <p className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-700 dark:text-emerald-400">
                Local demo: the reset link is printed in the server terminal.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[14px] font-medium text-zinc-800 dark:text-zinc-200 mb-1.5">
              Account Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@acme.com"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-10 py-3 text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
          >
            {isSubmitting ? "Sending…" : "Send reset link"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="text-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
