"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  UserPlus,
  Package,
  Layers,
  Repeat,
  Receipt,
  Percent,
  CreditCard,
  AlertTriangle,
  Home,
  UserCheck,
  ShieldAlert,
  Briefcase,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const role = user?.role || "CUSTOMER";

  // Navigation configurations based on role
  const getNavItems = () => {
    if (role === "ADMIN") {
      return [
        {
          title: "Core Administration",
          items: [
            { name: "Executive Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { name: "Manage Staff", href: "/admin/staff", icon: UserPlus, highlight: true },
          ],
        },
        {
          title: "Catalog & Plans",
          items: [
            { name: "Products & Variants", href: "/products", icon: Package },
            { name: "Billing Plans", href: "/plans", icon: Layers },
            { name: "Discounts & Taxes", href: "/discounts", icon: Percent },
          ],
        },
        {
          title: "Billing & Operations",
          items: [
            { name: "All Subscriptions", href: "/subscriptions", icon: Repeat },
            { name: "All Invoices", href: "/invoices", icon: Receipt },
            { name: "Payments Received", href: "/payments", icon: CreditCard },
          ],
        },
      ];
    }

    if (role === "STAFF") {
      return [
        {
          title: "Daily Operations",
          items: [
            { name: "Subscriptions & Quotes", href: "/subscriptions", icon: Repeat },
            { name: "Invoices Management", href: "/invoices", icon: Receipt },
            { name: "Overdue Invoices", href: "/invoices/overdue", icon: AlertTriangle },
            { name: "Record Payments", href: "/payments", icon: CreditCard },
          ],
        },
        {
          title: "Catalog Reference",
          items: [
            { name: "Products List", href: "/products", icon: Package },
            { name: "Plans Available", href: "/plans", icon: Layers },
          ],
        },
      ];
    }

    // CUSTOMER role
    return [
      {
        title: "Self-Service Portal",
        items: [
          { name: "Portal Overview", href: "/portal", icon: Home },
          { name: "My Subscriptions", href: "/portal#subscriptions", icon: Repeat },
          { name: "My Invoices", href: "/portal#invoices", icon: Receipt },
          { name: "Account Details", href: "/portal#profile", icon: UserCheck },
        ],
      },
    ];
  };

  const navSections = getNavItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-zinc-50/95 backdrop-blur transition-transform duration-200 dark:border-zinc-800 dark:bg-zinc-950 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header on mobile sidebar */}
        <div className="flex h-16 items-center border-b border-zinc-200 px-6 dark:border-zinc-800 lg:hidden">
          <span className="text-base font-bold text-zinc-900 dark:text-white">
            Brightloop Navigation
          </span>
        </div>

        {/* Current Role Banner */}
        <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            {role === "ADMIN" && <ShieldAlert className="w-4 h-4 text-purple-600" />}
            {role === "STAFF" && <Briefcase className="w-4 h-4 text-blue-600" />}
            {role === "CUSTOMER" && <UserCheck className="w-4 h-4 text-emerald-600" />}
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              {role} View
            </span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            {role === "ADMIN" && "Full administrative control of systems, staff & rules."}
            {role === "STAFF" && "Operational view for subscriptions, billing & payments."}
            {role === "CUSTOMER" && "Personal account subscriptions & billing records."}
          </p>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1.5">
              <h3 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href.includes("#") && pathname === "/portal");

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => {
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                          : "text-zinc-700 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800/70"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition ${
                          isActive
                            ? "text-white"
                            : "text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                        }`}
                      />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom footer / status */}
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              System Online
            </span>
            <span className="text-[10px] text-zinc-400">v1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
