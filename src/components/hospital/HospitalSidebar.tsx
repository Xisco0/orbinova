"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Droplet,
  History,
  FilePlus,
  HeartHandshake,
  Heart,
  Settings,
  Menu,
  X,
  ShieldCheck,
  Scan,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  KeyRound,
  ClipboardList,
} from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { SignOutButton } from "@/components/shared/SignOutButton";
import { ChangePasswordModal } from "@/components/shared/ChangePasswordModal";
import { canAccessModule, getRolePermissions, SystemPermission } from "@/lib/auth/rbac";

interface HospitalSidebarProps {
  user: {
    email: string;
    profile?: {
      full_name: string | null;
      avatar_url?: string | null;
      role?: string | null;
    } | null;
  };
  organization: {
    id: string;
    name: string;
    organization_type: string;
    verification_status: string;
  };
  memberRole: string;
  permissions?: SystemPermission[];
  isOwner?: boolean;
  isManager?: boolean;
}

interface SubItem {
  name: string;
  href: string;
}

interface NavItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: SubItem[];
}

interface NavSection {
  category: string;
  links: NavItem[];
}

const navSections: NavSection[] = [
  {
    category: "Overview",
    links: [
      { name: "Dashboard", href: "/hospital/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    category: "Blood Operations",
    links: [
      { name: "Blood Requests", href: "/hospital/blood-requests", icon: FilePlus },
      {
        name: "Blood Inventory",
        icon: Droplet,
        href: "/hospital/inventory",
        subItems: [
          { name: "Current Stock", href: "/hospital/inventory" },
          { name: "Stock Ledger", href: "/hospital/inventory/transactions" },
        ],
      },
      {
        name: "Donor Management",
        icon: Heart,
        href: "/hospital/donors",
        subItems: [
          { name: "Manage Donors", href: "/hospital/donors" },
          { name: "Candidate Matches", href: "/hospital/donor-requests" },
          { name: "Donations Ledger", href: "/hospital/donations" },
        ],
      },
    ],
  },
  {
    category: "Organization",
    links: [
      { name: "Facility Profile", href: "/hospital/organization", icon: Building2 },
      { name: "Staff & Members", href: "/hospital/members", icon: Users },
      { name: "Audit Logs", href: "/hospital/audit-logs", icon: ClipboardList },
    ],
  },
  {
    category: "System",
    links: [
      { name: "Facility Settings", href: "/hospital/settings", icon: Settings },
    ],
  },
];

export function HospitalSidebar({
  user,
  organization,
  memberRole,
  permissions,
  isOwner,
  isManager,
}: HospitalSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Accordion state for collapsible menus (closed by default)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const isBloodBank = organization.organization_type === "blood_bank";

  const resolvedPermissions: SystemPermission[] =
    permissions ||
    getRolePermissions(user.profile?.role || (isBloodBank ? "blood_bank" : "hospital"), memberRole);

  const userIsOwner = isOwner ?? (memberRole === "owner");
  const userIsManager = isManager ?? (memberRole === "manager" || memberRole === "administrator" || userIsOwner);

  // Granular authorization filter per subItem
  const isSubItemAuthorized = (sub: SubItem): boolean => {
    if (sub.href === "/hospital/inventory") {
      return (
        userIsOwner ||
        userIsManager ||
        resolvedPermissions.includes("inventory.view") ||
        resolvedPermissions.includes("blood_inventory.view")
      );
    }
    if (sub.href === "/hospital/inventory/transactions") {
      return (
        userIsOwner ||
        userIsManager ||
        resolvedPermissions.includes("inventory.view_reports") ||
        resolvedPermissions.includes("inventory.update") ||
        resolvedPermissions.includes("blood_inventory.manage")
      );
    }
    if (sub.href === "/hospital/donors") {
      return (
        userIsOwner ||
        userIsManager ||
        resolvedPermissions.includes("donors.view") ||
        resolvedPermissions.includes("donors.register") ||
        resolvedPermissions.includes("donors.view_records")
      );
    }
    if (sub.href === "/hospital/donor-requests") {
      return (
        userIsOwner ||
        userIsManager ||
        resolvedPermissions.includes("donors.match") ||
        resolvedPermissions.includes("donors.verify") ||
        resolvedPermissions.includes("blood_requests.view_donor_matching") ||
        resolvedPermissions.includes("donors.view_records") ||
        resolvedPermissions.includes("donors.register")
      );
    }
    if (sub.href === "/hospital/donations") {
      return (
        userIsOwner ||
        userIsManager ||
        resolvedPermissions.includes("donors.record_donation") ||
        resolvedPermissions.includes("donors.view") ||
        resolvedPermissions.includes("donors.view_records")
      );
    }
    return false;
  };

  // Granular authorization filter per top-level link
  const isLinkAuthorized = (link: NavItem, authorizedSubItems?: SubItem[]): boolean => {
    if (link.href === "/hospital/dashboard") {
      return resolvedPermissions.includes("dashboard.view") || userIsOwner;
    }
    if (link.href === "/hospital/blood-requests") {
      return (
        userIsOwner ||
        userIsManager ||
        resolvedPermissions.includes("blood_requests.view") ||
        resolvedPermissions.includes("blood_requests.create") ||
        resolvedPermissions.includes("blood_requests.manage")
      );
    }
    if (link.name === "Blood Inventory") {
      return Boolean(authorizedSubItems && authorizedSubItems.length > 0);
    }
    if (link.name === "Donor Management") {
      return Boolean(authorizedSubItems && authorizedSubItems.length > 0);
    }
    if (link.href === "/hospital/organization") {
      return (
        userIsOwner ||
        userIsManager ||
        resolvedPermissions.includes("facility.view") ||
        resolvedPermissions.includes("facility.update")
      );
    }
    if (link.href === "/hospital/members") {
      return (
        userIsOwner ||
        userIsManager ||
        resolvedPermissions.includes("staff.view") ||
        resolvedPermissions.includes("staff.invite") ||
        resolvedPermissions.includes("staff.manage") ||
        resolvedPermissions.includes("staff.assign_roles")
      );
    }
    if (link.href === "/hospital/audit-logs") {
      return (
        userIsOwner ||
        resolvedPermissions.includes("audit_logs.view")
      );
    }
    if (link.href === "/hospital/settings") {
      return (
        userIsOwner ||
        userIsManager ||
        resolvedPermissions.includes("facility_settings.view") ||
        resolvedPermissions.includes("facility_settings.update")
      );
    }
    return false;
  };

  // Dynamically filter sections and prune empty sections and restricted items
  const dynamicSections: NavSection[] = navSections
    .map((section) => {
      const authorizedLinks: NavItem[] = [];
      for (const link of section.links) {
        const authorizedSubItems = link.subItems
          ? link.subItems.filter(isSubItemAuthorized)
          : undefined;
        if (isLinkAuthorized(link, authorizedSubItems)) {
          authorizedLinks.push({
            ...link,
            subItems: authorizedSubItems,
          });
        }
      }
      return {
        ...section,
        links: authorizedLinks,
      };
    })
    .filter((section) => section.links.length > 0);

  // Auto-expand accordion if current route belongs to a group
  useEffect(() => {
    if (pathname.startsWith("/hospital/inventory")) {
      setExpandedGroups((prev) => ({ ...prev, "Blood Inventory": true }));
    }
    if (
      pathname.startsWith("/hospital/donors") ||
      pathname.startsWith("/hospital/donor-requests") ||
      pathname.startsWith("/hospital/donations")
    ) {
      setExpandedGroups((prev) => ({ ...prev, "Donor Management": true }));
    }
    // Close mobile drawer on route transition
    setMobileOpen(false);
  }, [pathname]);

  // Listen for mobile header open/close and change password modal events
  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    const handleClose = () => setMobileOpen(false);
    const handleOpenChangePassword = () => setIsChangePasswordOpen(true);

    window.addEventListener("toggle-hospital-sidebar", handleToggle);
    window.addEventListener("close-hospital-sidebar", handleClose);
    window.addEventListener("open-change-password-modal", handleOpenChangePassword);

    return () => {
      window.removeEventListener("toggle-hospital-sidebar", handleToggle);
      window.removeEventListener("close-hospital-sidebar", handleClose);
      window.removeEventListener("open-change-password-modal", handleOpenChangePassword);
    };
  }, []);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const isActiveLink = (href: string) => {
    if (href === "/hospital/dashboard") {
      return pathname === "/hospital/dashboard" || pathname === "/hospital";
    }
    return pathname === href;
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <Link href="/hospital/dashboard" className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
                isBloodBank ? "bg-secondary-600" : "bg-primary-600"
              }`}
            >
              {isBloodBank ? (
                <Droplet className="w-5 h-5 text-white" />
              ) : (
                <Building2 className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <span className="font-poppins font-bold text-base text-dark tracking-tight">
                Smart<span className="text-secondary-600">Donor</span>
              </span>
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider">
                {isBloodBank ? "Blood Bank Portal" : "Hospital Portal"}
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

        {/* Facility Info Card */}
        <div className="m-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Facility Node
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                organization.verification_status === "verified"
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {organization.verification_status}
            </span>
          </div>
          <p className="text-xs font-bold text-dark truncate font-poppins">
            {organization.name}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-inter">
            <span>Your Role:</span>
            <span className="text-slate-700 capitalize">
              {memberRole}
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        {memberRole === "radiologist" ? (
          <div className="p-3 space-y-3">
            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-inter space-y-2">
              <span className="font-bold block">Diagnostic Workspace</span>
              <p className="text-[11px] text-teal-700 leading-relaxed">
                As a designated Radiologist, your clinical workflow is hosted within the dedicated ORBINOVA Imaging diagnostic portal.
              </p>
            </div>
            <a
              href={process.env.NEXT_PUBLIC_IMAGING_APP_URL || "/imaging"}
              className="flex items-center justify-between p-3 rounded-xl bg-primary-600 text-white font-medium text-xs hover:bg-primary-700 transition-colors shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <Scan className="w-4 h-4" />
                <span>Launch ORBINOVA Imaging</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <nav className="p-3 space-y-3.5">
            {dynamicSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {section.category}
                </p>

                {section.links.map((link) => {
                  const Icon = link.icon;
                  const hasSubItems = link.subItems && link.subItems.length > 0;

                  if (hasSubItems) {
                    const isExpanded = !!expandedGroups[link.name];
                    const hasActiveChild = link.subItems!.some((sub) => pathname === sub.href);

                    return (
                      <div key={link.name} className="space-y-1">
                        {/* Parent Item Header */}
                        <button
                          type="button"
                          onClick={() => toggleGroup(link.name)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                            hasActiveChild
                              ? "text-slate-900 bg-slate-100 font-semibold"
                              : "text-slate-600 hover:text-dark hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon
                              className={`w-4 h-4 ${
                                hasActiveChild
                                  ? isBloodBank ? "text-secondary-600" : "text-primary-600"
                                  : "text-slate-400"
                              }`}
                            />
                            <span>{link.name}</span>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform duration-150" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 transition-transform duration-150" />
                          )}
                        </button>

                        {/* Nested Sub-links */}
                        {isExpanded && (
                          <div className="ml-4 pl-3 py-1 space-y-1 border-l-2 border-slate-100">
                            {link.subItems!.map((sub) => {
                              const isSubActive = pathname === sub.href;

                              return (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  onClick={() => setMobileOpen(false)}
                                  className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-inter transition-all ${
                                    isSubActive
                                      ? isBloodBank
                                        ? "bg-secondary-600 text-white font-bold shadow-2xs"
                                        : "bg-primary-600 text-white font-bold shadow-2xs"
                                      : "text-slate-600 hover:text-dark hover:bg-slate-100 font-medium"
                                  }`}
                                >
                                  <span>{sub.name}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Standard Top-level Link
                  const active = isActiveLink(link.href!);
                  return (
                    <Link
                      key={link.href}
                      href={link.href!}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                        active
                          ? isBloodBank
                            ? "bg-secondary-600 text-white shadow-xs font-bold"
                            : "bg-primary-600 text-white shadow-xs font-bold"
                          : "text-slate-600 hover:text-dark hover:bg-slate-100"
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

            {/* Module Integration: ORBINOVA Imaging (Restricted to Authorized Clinical Personnel) */}
            {canAccessModule(user.profile?.role || "hospital", "imaging", memberRole) && (
              <div className="pt-2">
                <span className="block px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-poppins">
                  Diagnostic Modules
                </span>
                <a
                  href={process.env.NEXT_PUBLIC_IMAGING_APP_URL || "https://smart-donor-imaging.vercel.app/login"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-dark hover:bg-slate-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Scan className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span>ORBINOVA Imaging</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="success" size="sm" className="text-[9px] px-1 py-0">
                      AI Active
                    </Badge>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </div>
                </a>
              </div>
            )}
          </nav>
        )}
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-2.5">
          <Avatar
            name={user.profile?.full_name || organization.name}
            src={user.profile?.avatar_url || undefined}
            size="sm"
          />
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-dark truncate">
              {user.profile?.full_name || "Facility Officer"}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setIsChangePasswordOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-dark hover:bg-white hover:shadow-xs transition-all border border-transparent hover:border-slate-200 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-secondary-600 shrink-0" />
            <span>Change Password</span>
          </button>

          <SignOutButton
            variant="menu"
            redirectTo="/login"
            portalScope="hospital"
            className="text-slate-600 hover:text-blood-600 hover:bg-slate-100 text-xs py-2"
          />
        </div>
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

      {/* Change Password Modal accessible across all facility roles */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        userEmail={user.email}
      />
    </>
  );
}
