"use client";

import React, { useState } from "react";
import Link from "next/link";
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
    <div className="min-h-screen flex flex-col justify-center items-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xl shadow-lg shadow-indigo-500/25">
            BL
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Reset Password
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Enter your email to receive a password reset link
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-4 flex items-start gap-3 text-red-700 dark:text-red-400 text-sm">
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
              Account Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@acme.com"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-10 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition disabled:opacity-50"
          >
            {isSubmitting ? "Sending Reset Link..." : "Send Reset Link"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="text-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
