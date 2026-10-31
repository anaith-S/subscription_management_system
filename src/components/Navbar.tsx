"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  LogOut, 
  User as UserIcon, 
  Menu, 
  X, 
  ShieldAlert, 
  Briefcase, 
  UserCheck,
  ChevronDown
} from "lucide-react";

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function Navbar({ onToggleSidebar, isSidebarOpen }: NavbarProps) {
  const { user, logout, login } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getRoleBadge = (role?: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <ShieldAlert className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            Admin
          </span>
        );
      case "STAFF":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Briefcase className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            Staff
          </span>
        );
      case "CUSTOMER":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Customer
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 lg:hidden"
            aria-label="Toggle navigation menu"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href={user ? (user.role === "CUSTOMER" ? "/portal" : "/dashboard") : "/"} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20">
              BL
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                Brightloop
              </span>
              <span className="text-[10px] font-medium tracking-wide uppercase text-zinc-500 dark:text-zinc-400">
                Subscription Engine
              </span>
            </div>
          </Link>
        </div>

        {/* Right: Quick Demo Switcher + User Details & Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Switcher for fast testing during evaluation */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-xs border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-500 font-medium px-1">Quick Switch:</span>
            <button
              onClick={() => login("admin@brightloop.com", "Admin123!@#")}
              className={`px-2 py-1 rounded font-medium transition ${
                user?.role === "ADMIN"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-purple-600 hover:bg-white dark:hover:bg-zinc-800"
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => login("staff@brightloop.com", "Staff123!@#")}
              className={`px-2 py-1 rounded font-medium transition ${
                user?.role === "STAFF"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-blue-600 hover:bg-white dark:hover:bg-zinc-800"
              }`}
            >
              Staff
            </button>
            <button
              onClick={() => login("customer@acme.com", "Customer123!@#")}
              className={`px-2 py-1 rounded font-medium transition ${
                user?.role === "CUSTOMER"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-zinc-800"
              }`}
            >
              Customer
            </button>
          </div>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 rounded-full p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 font-semibold text-xs border border-zinc-300 dark:border-zinc-700">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 max-w-[130px] truncate">
                    {user.name}
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {user.email}
                  </span>
                </div>
                {getRoleBadge(user.role)}
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 z-50">
                    <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                      <p className="text-xs font-medium text-zinc-500">Signed in as</p>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                        {user.name}
                      </p>
                      <div className="mt-1">{getRoleBadge(user.role)}</div>
                    </div>

                    {user.role === "ADMIN" && (
                      <Link
                        href="/admin/staff"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <UserIcon className="h-4 w-4" />
                        Staff Management
                      </Link>
                    )}

                    {user.role === "CUSTOMER" && (
                      <Link
                        href="/portal"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <UserCheck className="h-4 w-4" />
                        Customer Portal
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Log In
              </Link>
              <Link
                href="/auth/register"
                className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm transition"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
