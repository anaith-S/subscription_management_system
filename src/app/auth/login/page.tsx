"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Lock, Mail, AlertCircle, KeyRound } from "lucide-react";
import AuthLayout from "@/components/brand/AuthLayout";

const SHOW_DEMO = process.env.NODE_ENV !== "production";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || "Failed to log in");
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <AuthLayout>
      <h1 className="text-[34px] font-semibold leading-tight text-zinc-900 dark:text-white">Sign in</h1>
      <p className="mt-2 text-[15px] text-zinc-600 dark:text-zinc-400">
        Use the email and password for your Brightloop account.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-[14px] text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[14px] font-medium text-zinc-800 dark:text-zinc-200">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-10 pr-3.5 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-[14px] font-medium text-zinc-800 dark:text-zinc-200">
              Password
            </label>
            <Link href="/auth/forgot-password" className="text-[13px] font-medium text-indigo-700 hover:underline dark:text-indigo-300">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-10 pr-3.5 text-[15px] text-zinc-900 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-indigo-800 disabled:opacity-60"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-[14px] text-zinc-600 dark:text-zinc-400">
        New customer?{" "}
        <Link href="/auth/register" className="font-semibold text-indigo-700 hover:underline dark:text-indigo-300">
          Create an account
        </Link>
      </p>

      {SHOW_DEMO && (
        <div className="mt-10 rounded-xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
          <p className="flex items-center gap-2 text-[13px] text-zinc-600 dark:text-zinc-400">
            <KeyRound className="h-4 w-4" />
            Fill in a demo account (development only)
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: "Admin", email: "admin@brightloop.com", password: "Admin123!@#" },
              { label: "Staff", email: "staff@brightloop.com", password: "Staff123!@#" },
              { label: "Customer", email: "customer@acme.com", password: "Customer123!@#" },
            ].map((demo) => (
              <button
                key={demo.label}
                type="button"
                onClick={() => handleQuickFill(demo.email, demo.password)}
                className="rounded-full border border-zinc-300 px-3.5 py-1.5 text-[13px] font-medium text-zinc-700 hover:border-indigo-600 hover:text-indigo-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                {demo.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
