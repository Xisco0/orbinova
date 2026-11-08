"use client";

import React from "react";
import Link from "next/link";
import { Bell, HeartHandshake, ShieldCheck, Menu, Droplet } from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { SignOutButton } from "@/components/shared/SignOutButton";

interface DonorHeaderProps {
  user: {
    email: string;
    profile?: {
      full_name: string | null;
      avatar_url?: string | null;
    } | null;
  };
  bloodGroup?: string;
  isAvailable?: boolean;
  unreadNotifications?: number;
  pendingRequestsCount?: number;
}

export function DonorHeader({
  user,
  bloodGroup = "O+",
  isAvailable = true,
  unreadNotifications = 0,
  pendingRequestsCount = 0,
}: DonorHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left side: Hamburger (mobile), Blood Type Badge & Availability indicator */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("toggle-donor-sidebar"))}
          className="md:hidden p-2 -ml-1 text-slate-600 hover:text-dark hover:bg-slate-100 rounded-lg shrink-0 transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <span className="px-2.5 py-0.5 rounded-full bg-blood-50 border border-blood-200 text-blood-700 text-xs font-bold shrink-0">
          {bloodGroup || "O+"}
        </span>

        <Link
          href="/donor/availability"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs transition-all border shrink-0 ${
            isAvailable
              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isAvailable ? "bg-green-500 animate-pulse" : "bg-amber-500"
            }`}
          />
          <span className="hidden xs:inline">{isAvailable ? "Available" : "Unavailable"}</span>
        </Link>

        <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium shrink-0">
          <ShieldCheck className="w-4 h-4 text-secondary-600" />
          <span>Verified Network</span>
        </span>
      </div>

      {/* Right side: Urgent alerts, notifications, user avatar */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {pendingRequestsCount > 0 && (
          <Link
            href="/donor/requests"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-blood-600 text-white text-[11px] sm:text-xs font-bold shadow-xs hover:bg-blood-700 transition-all animate-bounce shrink-0"
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{pendingRequestsCount} Urgent Match!</span>
            <span className="sm:hidden">{pendingRequestsCount}!</span>
          </Link>
        )}

        {/* Notifications Icon */}
        <Link
          href="/donor/notifications"
          className="relative p-2 rounded-xl text-slate-500 hover:text-dark hover:bg-slate-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blood-600 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Link>

        {/* User Account / Avatar */}
        <Link
          href="/donor/profile"
          className="flex items-center gap-2 sm:gap-2.5 pl-1.5 sm:pl-2 border-l border-slate-200 hover:opacity-90 transition-opacity"
        >
          <Avatar
            name={user.profile?.full_name || "Donor"}
            src={user.profile?.avatar_url || undefined}
            size="sm"
          />
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-dark truncate max-w-[120px]">
              {user.profile?.full_name || "Blood Donor"}
            </p>
            <p className="text-[10px] text-blood-600">
              Type: {bloodGroup}
            </p>
          </div>
        </Link>

        <div className="hidden sm:block">
          <SignOutButton redirectTo="/donor/login" />
        </div>
      </div>
    </header>
  );
}
