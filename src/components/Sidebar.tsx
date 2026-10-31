"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  Repeat,
  Receipt,
  Percent,
  CreditCard,
  AlarmClock,
  Home,
  UserCircle,
  FileText,
  X,
  type LucideIcon,
} from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const BILLING: NavSection = {
  title: "Billing",
  items: [
    { name: "Subscriptions", href: "/subscriptions", icon: Repeat },
    { name: "Invoices", href: "/invoices", icon: Receipt },
    { name: "Overdue", href: "/invoices/overdue", icon: AlarmClock },
    { name: "Payments", href: "/payments", icon: CreditCard },
  ],
};

const NAV: Record<string, NavSection[]> = {
  ADMIN: [
    { title: "Overview", items: [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
    BILLING,
    {
      title: "Catalog",
      items: [
        { name: "Products", href: "/products", icon: Package },
        { name: "Plans", href: "/plans", icon: Layers },
        { name: "Quotation templates", href: "/quotation-templates", icon: FileText },
        { name: "Discounts and taxes", href: "/discounts", icon: Percent },
      ],
    },
    { title: "Team", items: [{ name: "Staff", href: "/admin/staff", icon: Users }] },
  ],
  STAFF: [
    { title: "Overview", items: [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
    BILLING,
    {
      title: "Catalog",
      items: [
        { name: "Products", href: "/products", icon: Package },
        { name: "Plans", href: "/plans", icon: Layers },
        { name: "Quotation templates", href: "/quotation-templates", icon: FileText },
      ],
    },
  ],
  CUSTOMER: [
    {
      title: "My account",
      items: [
        { name: "Overview", href: "/portal", icon: Home },
        { name: "Subscriptions", href: "/portal#subscriptions", icon: Repeat },
        { name: "Invoices", href: "/portal#invoices", icon: Receipt },
        { name: "Profile", href: "/portal#profile", icon: UserCircle },
      ],
    },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  STAFF: "Operations team",
  CUSTOMER: "Customer account",
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role || "CUSTOMER";
  const sections = NAV[role] ?? NAV.CUSTOMER;

  // The most specific matching link wins, so /invoices/overdue doesn't also
  // light up /invoices.
  const allHrefs = sections.flatMap((s) => s.items.map((i) => i.href.split("#")[0]));
  const activeHref = allHrefs
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/50 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col bg-deep text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href={role === "CUSTOMER" ? "/portal" : "/dashboard"} onClick={onClose}>
            <Wordmark tone="light" />
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6 pt-2">
          {sections.map((section) => (
            <div key={section.title} className="mt-5 first:mt-2">
              <h3 className="px-3 pb-1.5 text-[12px] font-medium text-white/40">{section.title}</h3>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href.includes("#")
                    ? false
                    : activeHref === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (window.innerWidth < 1024) onClose();
                        }}
                        aria-current={isActive ? "page" : undefined}
                        className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors ${
                          isActive
                            ? "bg-white/[0.09] font-semibold text-white"
                            : "text-white/70 hover:bg-white/[0.05] hover:text-white"
                        }`}
                      >
                        {isActive && (
                          <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-marigold" />
                        )}
                        <Icon className={`h-[17px] w-[17px] shrink-0 ${isActive ? "text-marigold" : "text-white/50"}`} />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {user && (
          <div className="border-t border-white/10 px-5 py-4">
            <p className="truncate text-[13px] font-medium text-white">{user.name}</p>
            <p className="text-[12px] text-white/50">{ROLE_LABEL[role]}</p>
          </div>
        )}
      </aside>
    </>
  );
}
