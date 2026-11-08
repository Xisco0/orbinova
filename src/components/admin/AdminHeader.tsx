"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, Shield, ChevronRight, User, LogOut, ChevronDown, Menu } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { SignOutButton } from "@/components/shared/SignOutButton";

export interface AdminHeaderProps {
  user: {
    id: string;
    email?: string;
    profile?: {
      full_name: string | null;
      role: string;
      admin_role?: string | null;
      avatar_url?: string | null;
    } | null;
  };
  unreadNotificationsCount?: number;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  user,
  unreadNotificationsCount = 0,
}) => {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Generate breadcrumb from path
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbItems = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const label = seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const isLast = idx === segments.length - 1;
    return { href, label, isLast };
  });

  const getRoleDisplayName = (role?: string | null) => {
    if (!role) return "System Administrator";
    switch (role.toLowerCase()) {
      case "superadmin":
      case "super_admin":
        return "Super Administrator";
      case "staff":
      case "operations":
        return "Operations Staff";
      case "moderator":
        return "Clinical Moderator";
      default:
        return "System Administrator";
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "AD";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Mobile Menu Trigger, Breadcrumbs & Page Context */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("toggle-admin-sidebar"))}
          className="md:hidden p-2 -ml-1 text-slate-600 hover:text-dark hover:bg-slate-100 rounded-lg shrink-0 transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-inter truncate">
          <Link
            href="/admin/dashboard"
            className="hover:text-primary-600 transition-colors hidden sm:inline"
          >
            Admin
          </Link>
          {breadcrumbItems.length > 1 && (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:inline" />
          )}
          <span className="text-dark font-poppins text-xs sm:text-sm font-semibold truncate">
            {breadcrumbItems[breadcrumbItems.length - 1]?.label || "Dashboard"}
          </span>
        </div>
      </div>

      {/* Center/Left: Global Search Input */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search anything (requests, donors, facilities)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-dark placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all font-inter"
          />
        </div>
      </div>

      {/* Right: Notifications & Profile Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notifications Icon with dynamic badge */}
        <Link
          href="/admin/notifications"
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
          aria-label="View notifications"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white animate-pulse" />
          )}
        </Link>

        {/* Administrator Profile Pill */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer text-left focus:outline-none"
          >
            <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center font-poppins shrink-0">
              {getInitials(user.profile?.full_name)}
            </div>

            <div className="hidden lg:flex flex-col min-w-0">
              <span className="text-xs font-semibold text-dark truncate font-poppins leading-tight max-w-[120px]">
                {user.profile?.full_name || "System Admin"}
              </span>
              <span className="text-[10px] text-slate-500 truncate font-inter">
                {getRoleDisplayName(user.profile?.admin_role)}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5" />
          </button>

          {/* Profile Dropdown Menu */}
          {profileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-dark truncate font-poppins">
                    {user.profile?.full_name || "System Admin"}
                  </p>
                  <p className="text-[10px] text-primary-600 font-medium truncate font-inter">
                    {getRoleDisplayName(user.profile?.admin_role)}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate font-inter mt-0.5">
                    {user.email}
                  </p>
                </div>

                <Link
                  href="/admin/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-slate-50 hover:text-dark transition-colors font-inter"
                >
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Portal Settings</span>
                </Link>

                <div className="pt-1 mt-1 border-t border-slate-100">
                  <SignOutButton
                    variant="menu"
                    redirectTo="/login"
                    className="w-full text-xs text-rose-600 hover:bg-rose-50 rounded-lg py-2"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
