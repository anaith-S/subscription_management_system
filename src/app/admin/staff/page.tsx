"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import {
  UserPlus,
  ShieldAlert,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  User,
  Lock,
  Calendar,
  Briefcase,
} from "lucide-react";

export default function AdminStaffPage() {
  const { user, authFetch } = useAuth();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Password policy live validation
  const hasMinLength = password.length > 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isFormValid = hasMinLength && hasUppercase && hasLowercase && hasSpecial && name.trim().length > 0 && email.trim().length > 0;

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/auth/staff");
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
      }
    } catch (err) {
      console.error("Fetch staff error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isFormValid) {
      setError("Please ensure the staff password fulfills all policy criteria.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authFetch("/api/auth/staff", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create staff member");
      } else {
        setSuccess(`Staff user '${name}' created successfully!`);
        setName("");
        setEmail("");
        setPassword("");
        fetchStaff();
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user && user.role !== "ADMIN") {
    return (
      <AppShell>
        <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Admin Access Required</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Only administrators are authorized to access the staff provisioning console.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[30px] sm:text-[36px] font-semibold leading-tight text-zinc-900 dark:text-white">Staff</h1>
            <p className="mt-1.5 max-w-[68ch] text-[15px] text-zinc-600 dark:text-zinc-400">Members of the operations team. Only administrators can add staff.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Staff Form */}
          <div className="lg:col-span-1 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Add New Staff User
              </h2>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 flex items-start gap-2.5 text-red-700 dark:text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 p-3 flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-10 py-2.5 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@brightloop.com"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-10 py-2.5 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                  Initial Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-10 py-2.5 text-xs text-zinc-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Password Policy live check */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-1 text-[11px]">
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">Policy Criteria:</p>
                <div className="grid grid-cols-2 gap-1 text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1">
                    {hasMinLength ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-zinc-400" />}
                    <span>&gt; 8 chars</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasUppercase ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-zinc-400" />}
                    <span>1 uppercase</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasLowercase ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-zinc-400" />}
                    <span>1 lowercase</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasSpecial ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-zinc-400" />}
                    <span>1 special</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 px-4 py-2.5 text-xs font-semibold text-white shadow-md transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating Staff User..." : "Create Staff Account"}
              </button>
            </form>
          </div>

          {/* Existing Staff Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Internal Team Roster
              </h2>
              <span className="text-xs text-zinc-500">{staffList.length} total members</span>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                  {staffList.map((member) => (
                    <tr key={member.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                      <td className="px-5 py-4 font-semibold text-zinc-900 dark:text-white">
                        {member.name}
                      </td>
                      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-300">
                        {member.email}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            member.role === "ADMIN"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}
                        >
                          {member.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      </td>
                      <td className="px-5 py-4 text-zinc-500">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
