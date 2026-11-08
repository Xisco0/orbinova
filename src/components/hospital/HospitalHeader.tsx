"use client";

import React from "react";
import Link from "next/link";
import { Bell, PlusCircle, ShieldCheck, AlertCircle, Menu, Building2, Droplet } from "lucide-react";
import { Avatar, Badge, Button } from "@/components/ui";
import { SignOutButton } from "@/components/shared/SignOutButton";

interface HospitalHeaderProps {
  user: {
    email: string;
    profile?: {
      full_name: string | null;
      avatar_url?: string | null;
    } | null;
  };
  organization: {
    name: string;
    organization_type: string;
    verification_status: string;
  };
  unreadNotifications?: number;
}

export function HospitalHeader({
  user,
  organization,
  unreadNotifications = 0,
}: HospitalHeaderProps) {
  const isBloodBank = organization.organization_type === "blood_bank";

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left side: Mobile Menu Trigger, Org Badge & Verification */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("toggle-hospital-sidebar"))}
          className="md:hidden p-2 -ml-1 text-slate-600 hover:text-dark hover:bg-slate-100 rounded-lg shrink-0 transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Badge
          variant={isBloodBank ? "secondary" : "primary"}
          size="md"
          className="shrink-0 text-[11px] sm:text-xs"
        >
          {isBloodBank ? "Blood Bank" : "Hospital"}
        </Badge>

        <span className="font-poppins font-semibold text-xs sm:text-sm text-dark truncate max-w-[140px] xs:max-w-[180px] sm:hidden">
          {organization.name}
        </span>

        <span className="text-xs text-slate-500 hidden sm:inline-flex items-center gap-1 shrink-0">
          <ShieldCheck className="w-4 h-4 text-secondary-600" />
          <span>Nigeria Healthcare</span>
        </span>
      </div>

      {/* Right side: Quick CTA, Notifications, Avatar */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <Link href="/hospital/blood-requests/new" className="hidden sm:block">
          <Button
            variant="blood"
            size="sm"
            className="text-xs"
            leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
          >
            New Request
          </Button>
        </Link>

        {/* Notifications Icon */}
        <Link
          href="/hospital/notifications"
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

        {/* User Account */}
        <div className="flex items-center gap-2 sm:gap-2.5 pl-1.5 sm:pl-2 border-l border-slate-200">
          <Avatar
            name={user.profile?.full_name || organization.name}
            src={user.profile?.avatar_url || undefined}
            size="sm"
          />
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-dark truncate max-w-[130px]">
              {user.profile?.full_name || "Staff Officer"}
            </p>
            <p className="text-[10px] text-slate-500 truncate max-w-[130px]">
              {organization.name}
            </p>
          </div>
        </div>

        <div className="hidden sm:block">
          <SignOutButton redirectTo="/login" />
        </div>
      </div>
    </header>
  );
}
