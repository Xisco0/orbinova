"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Shield, Building2, Heart, Droplet, Package, History, ClipboardList, Settings, Menu, X, ChevronRight, LogOut, Activity } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { SignOutButton } from "@/components/shared/SignOutButton";
import { cn } from "@/lib/utils";
import { hasPermission, PermissionKey } from "@/constants/permissions";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: PermissionKey;
  badgeCount?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export interface AdminSidebarProps {
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

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  user,
  unreadNotificationsCount = 0,
}) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route transition
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Listen for mobile header open/close events
  React.useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    const handleClose = () => setMobileOpen(false);
    window.addEventListener("toggle-admin-sidebar", handleToggle);
    window.addEventListener("close-admin-sidebar", handleClose);
    return () => {
      window.removeEventListener("toggle-admin-sidebar", handleToggle);
      window.removeEventListener("close-admin-sidebar", handleClose);
    };
  }, []);

  const adminRole = user.profile?.admin_role;

  // Format the administrative display title
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

  const rawNavigationSections: NavSection[] = [
    {
      title: "OVERVIEW",
      items: [
        {
          name: "Dashboard",
          href: "/admin/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "MANAGEMENT",
      items: [
        {
          name: "Administrators",
          href: "/admin/admins",
          icon: Shield,
          permission: "manage_admins",
        },
        {
          name: "Organizations",
          href: "/admin/organizations",
          icon: Building2,
          permission: "manage_organizations",
        },
        {
          name: "Donors",
          href: "/admin/donors",
          icon: Heart,
          permission: "manage_donors",
        },
      ],
    },
    {
      title: "OPERATIONS",
      items: [
        {
          name: "Blood Requests",
          href: "/admin/blood-requests",
          icon: Droplet,
          permission: "manage_requests",
        },
        {
          name: "Matching",
          href: "/admin/matching",
          icon: Activity,
          permission: "manage_matching",
        },
        {
          name: "Blood Inventory",
          href: "/admin/inventory",
          icon: Package,
          permission: "manage_inventory",
        },
        {
          name: "Donations",
          href: "/admin/donations",
          icon: History,
          permission: "manage_inventory",
        },
      ],
    },
    {
      title: "SYSTEM",
      items: [
        {
          name: "Audit Logs",
          href: "/admin/audit-logs",
          icon: ClipboardList,
          permission: "view_audit_logs",
        },
        {
          name: "Settings",
          href: "/admin/settings",
          icon: Settings,
          permission: "manage_settings",
        },
      ],
    },
  ];

  // Filter sections and items based on role permissions
  const navigationSections = rawNavigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.permission || hasPermission(adminRole, item.permission)
      ),
    }))
    .filter((section) => section.items.length > 0);

  const NavContent = (
    <div className="flex flex-col h-full justify-between bg-[#0F172A] text-slate-300 select-none">
      {/* Scrollable Upper Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1D4ED8] to-[#2563EB] flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Droplet className="w-5 h-5 text-white fill-white/20" />
            </div>
            <div className="flex flex-col">
              <span className="font-poppins font-bold text-base text-white tracking-tight leading-tight">
                Smart<span className="text-[#38BDF8]">Donor</span>
              </span>
              <span className="text-[10px] uppercase text-[#94A3B8] font-medium tracking-wider font-inter">
                ADMIN CONSOLE
              </span>
            </div>
          </Link>
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Section Groups */}
        <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-6">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-1.5">
              {/* Section Heading */}
              <div className="px-3 text-[10px] font-medium uppercase tracking-wider text-[#94A3B8] font-inter">
                {section.title}
              </div>

              {/* Navigation Items */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin/dashboard" &&
                      item.href !== "/admin" &&
                      pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-inter transition-all duration-150 group",
                        isActive
                          ? "bg-[#2563EB] text-white shadow-xs shadow-blue-500/25 font-medium"
                          : "text-[#94A3B8] hover:bg-white/[0.06] hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={cn(
                            "w-[18px] h-[18px] shrink-0 transition-colors",
                            isActive
                              ? "text-white"
                              : "text-[#94A3B8] group-hover:text-white"
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>

                      {/* Notification Count Badge */}
                      {item.badgeCount !== undefined && item.badgeCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-white bg-rose-600 rounded-full min-w-[18px] h-[18px] shadow-xs shrink-0">
                          {item.badgeCount > 99 ? "99+" : item.badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin User Profile at Bottom (Fixed) */}
      <div className="p-3.5 border-t border-slate-800/80 bg-[#0B1120] shrink-0">
        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              name={user.profile?.full_name || "Admin"}
              src={user.profile?.avatar_url || undefined}
              size="sm"
              className="ring-1 ring-white/10 shrink-0"
            />
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-semibold text-white truncate font-poppins leading-tight">
                {user.profile?.full_name || "System Operator"}
              </p>
              <p className="text-[10px] text-blue-400 font-medium truncate font-inter mt-0.5">
                {getRoleDisplayName(user.profile?.admin_role)}
              </p>
              <p className="text-[10px] text-[#94A3B8] truncate font-inter">
                {user.email}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <SignOutButton
              variant="ghost"
              redirectTo="/login"
              portalScope="admin"
              className="text-[#94A3B8] hover:text-rose-400 hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer !px-1.5 !py-1.5"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-[260px] h-full bg-[#0F172A] shadow-2xl animate-in slide-in-from-left duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {NavContent}
          </div>
        </div>
      )}

      {/* Desktop Permanently Expanded Sidebar */}
      <aside className="hidden md:flex w-[250px] flex-col flex-shrink-0 border-r border-slate-800/80 h-screen sticky top-0 bg-[#0F172A] z-30">
        {NavContent}
      </aside>
    </>
  );
};
