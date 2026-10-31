"use client";

import React, { useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/brand/AuthLayout";
import { useAuth } from "@/context/AuthContext";
import { Lock, Mail, User, ArrowRight, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time password requirement checkers
  const hasMinLength = password.length > 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = hasMinLength && hasUppercase && hasLowercase && hasSpecial && passwordsMatch && name.trim().length > 0 && email.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasSpecial) {
      setError("Password does not meet the security criteria.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const result = await signup(name, email, password);
    if (!result.success) {
      setError(result.error || "Failed to create account");
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full space-y-8">
        <div>
          <h1 className="text-[34px] font-semibold leading-tight text-zinc-900 dark:text-white">Create your account</h1>
          <p className="mt-2 text-[15px] text-zinc-600 dark:text-zinc-400">For Brightloop customers. Your subscriptions and invoices will appear here.</p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3.5 flex items-start gap-3 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[14px] font-medium text-zinc-800 dark:text-zinc-200 mb-1.5">
              Name or company
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp / Jane Doe"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-10 py-3 text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-medium text-zinc-800 dark:text-zinc-200 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-10 py-3 text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-medium text-zinc-800 dark:text-zinc-200 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-10 py-3 text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-medium text-zinc-800 dark:text-zinc-200 mb-1.5">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-10 py-3 text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>
          </div>

          {/* Password Policy Live Requirements Checklist */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-1.5 text-xs">
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">Your password needs</p>
            <div className="grid grid-cols-2 gap-1.5 text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                {hasMinLength ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-zinc-400" />
                )}
                <span>&gt; 8 characters</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasUppercase ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-zinc-400" />
                )}
                <span>1 uppercase letter</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasLowercase ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-zinc-400" />
                )}
                <span>1 lowercase letter</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasSpecial ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-zinc-400" />
                )}
                <span>1 special character</span>
              </div>
            </div>
            {password.length > 0 && confirmPassword.length > 0 && (
              <div className="pt-1 flex items-center gap-1.5 border-t border-zinc-200 dark:border-zinc-700">
                {passwordsMatch ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                )}
                <span className={passwordsMatch ? "text-emerald-600" : "text-red-500"}>
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating account…" : "Create account"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Sign in instead
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
