"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  HeartHandshake,
  User,
  Clock,
  ShieldCheck,
  History,
  Settings,
  Menu,
  X,
  Droplet,
} from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { SignOutButton } from "@/components/shared/SignOutButton";

interface DonorSidebarProps {
  user: {
    email: string;
    profile?: {
      full_name: string | null;
      avatar_url?: string | null;
      role?: string;
    } | null;
  };
  bloodGroup?: string;
  isAvailable?: boolean;
}

const navItems = [
  {
    category: "Overview",
    links: [
      { name: "Dashboard", href: "/donor/dashboard", icon: LayoutDashboard },
      { name: "Donation Requests", href: "/donor/requests", icon: HeartHandshake, badgeKey: "requests" },
    ],
  },
  {
    category: "My Health & Readiness",
    links: [
      { name: "Availability", href: "/donor/availability", icon: Clock },
      { name: "Eligibility Status", href: "/donor/eligibility", icon: ShieldCheck },
      { name: "Donation History", href: "/donor/donations", icon: History },
    ],
  },
  {
    category: "Account",
    links: [
      { name: "My Profile", href: "/donor/profile", icon: User },
      { name: "Settings", href: "/donor/settings", icon: Settings },
    ],
  },
];

export function DonorSidebar({ user, bloodGroup, isAvailable }: DonorSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Listen for mobile header open/close events
  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    const handleClose = () => setMobileOpen(false);
    window.addEventListener("toggle-donor-sidebar", handleToggle);
    window.addEventListener("close-donor-sidebar", handleClose);
    return () => {
      window.removeEventListener("toggle-donor-sidebar", handleToggle);
      window.removeEventListener("close-donor-sidebar", handleClose);
    };
  }, []);

  const isActiveLink = (href: string) => {
    if (href === "/donor/dashboard") {
      return pathname === "/donor/dashboard" || pathname === "/donor";
    }
    return pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <Link href="/donor/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blood-600 flex items-center justify-center font-bold text-white shadow-sm shadow-blood-200">
              <Droplet className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="font-poppins font-bold text-base text-dark tracking-tight">
                Smart<span className="text-blood-600">Donor</span>
              </span>
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider">
                Hero Portal
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Donor Mini Card */}
        <div className="m-3 p-3 rounded-xl bg-gradient-to-br from-blood-50/80 to-rose-50/40 border border-blood-100/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blood-600 text-white font-poppins font-bold text-xs flex items-center justify-center shadow-sm">
              {bloodGroup || "O+"}
            </div>
            <div>
              <p className="text-xs text-dark truncate max-w-[110px]">
                {user.profile?.full_name?.split(" ")[0] || "Donor"}
              </p>
              <div className="flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isAvailable ? "bg-green-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                <span className="text-[10px] text-slate-600 font-medium">
                  {isAvailable ? "Ready to Donate" : "Unavailable"}
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/donor/availability"
            className="text-[10px] text-blood-600 hover:underline hover:text-blood-700"
          >
            Change
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav className="p-3 space-y-4">
          {navItems.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {section.category}
              </p>
              {section.links.map((link) => {
                const active = isActiveLink(link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                      active
                        ? "bg-blood-600 text-white shadow-sm shadow-blood-200"
                        : "text-slate-600 hover:text-dark hover:bg-slate-100/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 ${
                          active ? "text-white" : "text-slate-400"
                        }`}
                      />
                      <span>{link.name}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-3">
          <Avatar
            name={user.profile?.full_name || "Donor"}
            src={user.profile?.avatar_url || undefined}
            size="sm"
          />
          <div className="overflow-hidden">
            <p className="text-xs text-dark truncate">
              {user.profile?.full_name || "Blood Donor"}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <SignOutButton
          variant="menu"
          redirectTo="/donor/login"
          portalScope="donor"
          className="text-slate-600 hover:text-blood-600 hover:bg-slate-100 text-xs py-2"
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col justify-between transform transition-transform duration-200 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white text-slate-800 flex-shrink-0 flex-col justify-between border-r border-slate-200 min-h-screen sticky top-0 h-screen overflow-y-auto">
        {navContent}
      </aside>
    </>
  );
}
