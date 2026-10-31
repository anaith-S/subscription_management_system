"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Menu, ChevronDown, Users, UserCircle } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

const DEMO_ACCOUNTS = [
  { role: "ADMIN", label: "Admin", email: "admin@brightloop.com", password: "Admin123!@#" },
  { role: "STAFF", label: "Staff", email: "staff@brightloop.com", password: "Staff123!@#" },
  { role: "CUSTOMER", label: "Customer", email: "customer@acme.com", password: "Customer123!@#" },
] as const;

// The role switcher signs in with the seeded demo accounts. Useful while
// developing and demoing, but it must never ship in a production build.
const SHOW_DEMO_SWITCHER = process.env.NODE_ENV !== "production";

export default function Navbar({ onToggleSidebar, isSidebarOpen }: NavbarProps) {
  const { user, logout, login } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = (user?.name ?? "")
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-zinc-50/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3 lg:hidden">
          <button
            onClick={onToggleSidebar}
            className="rounded-lg p-2 text-zinc-700 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Open navigation"
            aria-expanded={isSidebarOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
          <LogoMark tone="dark" size={24} />
        </div>

        <div className="hidden lg:block" />

        <div className="flex items-center gap-3">
          {SHOW_DEMO_SWITCHER && (
            <div
              className="hidden md:flex items-center rounded-full border border-dashed border-zinc-300 p-0.5 text-[12px] dark:border-zinc-700"
              title="Development only: sign in as a seeded demo account"
            >
              <span className="px-2.5 text-zinc-500">View as</span>
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  onClick={() => login(account.email, account.password)}
                  className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
                    user?.role === account.role
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  {account.label}
                </button>
              ))}
            </div>
          )}

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-700 text-[12px] font-semibold text-white">
                  {initials || "?"}
                </span>
                <span className="hidden sm:block max-w-[160px] truncate text-[13px] font-medium text-zinc-800 dark:text-zinc-200">
                  {user.name}
                </span>
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="px-3 py-2.5">
                      <p className="truncate text-[14px] font-semibold text-zinc-900 dark:text-white">{user.name}</p>
                      <p className="truncate text-[12px] text-zinc-500">{user.email}</p>
                    </div>
                    <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                    {user.role === "ADMIN" && (
                      <Link
                        href="/admin/staff"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <Users className="h-4 w-4 text-zinc-500" />
                        Manage staff
                      </Link>
                    )}
                    {user.role === "CUSTOMER" && (
                      <Link
                        href="/portal#profile"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <UserCircle className="h-4 w-4 text-zinc-500" />
                        Profile
                      </Link>
                    )}
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login" className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-700 hover:bg-zinc-200/60">
                Sign in
              </Link>
              <Link href="/auth/register" className="rounded-lg bg-indigo-700 px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-indigo-800">
                Create account
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
