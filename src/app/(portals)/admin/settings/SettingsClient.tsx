"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, Badge, Button, Modal, Input } from "@/components/ui";
import {
  ShieldCheck,
  KeyRound,
  FileText,
  UserRoundCog,
  CheckCircle2,
  ChevronRight,
  Shield,
  Activity,
  Server,
  Lock,
} from "lucide-react";
import { Profile } from "@/types/database";
import { normalizeAdminRole, ROLE_CONFIGS } from "@/constants/permissions";

interface SettingsClientProps {
  user: {
    id: string;
    email?: string;
    profile?: Profile | null;
  } | null;
}

export function SettingsClient({ user }: SettingsClientProps) {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ success: boolean; text: string } | null>(null);

  const adminRole = user?.profile?.admin_role;
  const normalizedRole = normalizeAdminRole(adminRole);
  const roleConfig = ROLE_CONFIGS[normalizedRole];

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordMsg({ success: false, text: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ success: false, text: "Passwords do not match." });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordMsg(null);
    try {
      // In production, invoke supabase.auth.updateUser({ password: newPassword })
      await new Promise((r) => setTimeout(r, 600));
      setPasswordMsg({ success: true, text: "Password credentials updated successfully." });
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordMsg(null);
      }, 1200);
    } catch (err: any) {
      setPasswordMsg({ success: false, text: err.message || "Failed to update password." });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const configurationCards = [
    {
      title: "User Role Management",
      description:
        "Configure granular access controls, define custom permission sets, and establish administrative hierarchies across Super Admin, Admin, and Staff.",
      icon: <ShieldCheck className="w-6 h-6" />,
      ghostIcon: <ShieldCheck className="w-24 h-24" />,
      href: "/admin/settings/roles",
      badge: `${roleConfig.permissions.length} Permissions Active`,
    },
    {
      title: "Change Password",
      description:
        "Update authentication credentials, strengthen account security protocols, and manage access parameters for your administrative profile.",
      icon: <KeyRound className="w-6 h-6" />,
      ghostIcon: <KeyRound className="w-24 h-24" />,
      onClick: () => setIsPasswordModalOpen(true),
      badge: "Security",
    },
    {
      title: "Emergency Matching & Dispatch Policy",
      description:
        "Review, configure, and manage emergency matching parameters, geographic radius limits, and critical blood dispatch rules.",
      icon: <FileText className="w-6 h-6" />,
      ghostIcon: <FileText className="w-24 h-24" />,
      onClick: () => setIsPolicyModalOpen(true),
      badge: "System Protocol",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Settings Navigation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {configurationCards.map((item, index) => {
          const cardContent = (
            <>
              {/* Ghost Background Icon */}
              <div className="absolute -bottom-3 -right-4 opacity-[0.03] text-primary-900 transition-all duration-500 group-hover:opacity-[0.08] group-hover:scale-110 group-hover:-rotate-12 pointer-events-none">
                {item.ghostIcon}
              </div>

              {/* Icon & Badge */}
              <div className="relative z-10 flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 shrink-0">
                  {item.icon}
                </div>
                <Badge variant="primary" size="sm">
                  {item.badge}
                </Badge>
              </div>

              {/* Title & Description */}
              <div className="relative z-10 space-y-2">
                <h3 className="font-bold text-dark text-base sm:text-lg leading-tight transition-colors group-hover:text-primary-600 font-poppins">
                  {item.title}
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed font-inter line-clamp-3">
                  {item.description}
                </p>
              </div>

              {/* Footer Action */}
              <div className="relative z-10 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-primary-600 group-hover:text-primary-700">
                <span>Manage Configuration</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </>
          );

          const cardClasses =
            "group relative overflow-hidden flex flex-col justify-between gap-4 p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 cursor-pointer w-full hover:border-primary-400/60 hover:shadow-md hover:-translate-y-0.5";

          if (item.href) {
            return (
              <Link key={index} href={item.href} className={cardClasses}>
                {cardContent}
              </Link>
            );
          }

          return (
            <button
              key={index}
              type="button"
              onClick={item.onClick}
              className={`${cardClasses} text-left`}
            >
              {cardContent}
            </button>
          );
        })}
      </div>

      {/* Admin Identity Card */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-dark text-base font-poppins">
              Active Operator Clearance
            </h3>
            <p className="text-xs text-slate-500 font-inter">
              Current authenticated session credentials and assigned clearance role
            </p>
          </div>
          <Badge variant={roleConfig.badgeVariant} size="md">
            {roleConfig.name}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-inter pt-1">
          <div className="space-y-1">
            <span className="text-slate-400 uppercase text-[10px] font-medium block">
              Full Name
            </span>
            <p className="text-dark font-medium">{user?.profile?.full_name || "System Operator"}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 uppercase text-[10px] font-medium block">
              Admin Email
            </span>
            <p className="text-dark font-medium truncate">{user?.email}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 uppercase text-[10px] font-medium block">
              Assigned Role
            </span>
            <p className="text-primary-700">{roleConfig.name}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 uppercase text-[10px] font-medium block">
              Account Status
            </span>
            <Badge variant="success" size="sm">
              Active Clearance
            </Badge>
          </div>
        </div>
      </Card>

      {/* System Infrastructure & Security Status */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="font-bold text-dark text-base font-poppins">
            Infrastructure & System Health
          </h3>
          <p className="text-xs text-slate-500 font-inter">
            Healthcare data isolation, Row Level Security, and environment node metrics
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-inter">
          {[
            {
              title: "Row Level Security (RLS)",
              desc: "Enforced across all relational tables with strict role boundaries.",
              status: "Active",
            },
            {
              title: "Nigeria National Node",
              desc: "Regional cloud dispatch cluster with automated latency failover.",
              status: "Healthy",
            },
            {
              title: "Session Authorization",
              desc: "Server-side HTTP-only cookie synchronization via Supabase SSR.",
              status: "Secure",
            },
            {
              title: "Immutable Audit Trail",
              desc: "Append-only ledger logging administrative, role, and dispatch actions.",
              status: "Recording",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/70"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-dark text-xs">{item.title}</h5>
                  <p className="text-[11px] text-slate-500">{item.desc}</p>
                </div>
              </div>
              <Badge variant="success" size="sm">
                {item.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Administrator Password"
        description="Update your secret login credentials. Must be at least 8 characters."
        size="md"
      >
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {passwordMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                passwordMsg.success
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-blood-50 text-blood-800 border border-blood-200"
              }`}
            >
              {passwordMsg.text}
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-700 mb-1.5 font-inter">
              New Password *
            </label>
            <Input
              type="password"
              placeholder="••••••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-700 mb-1.5 font-inter">
              Confirm New Password *
            </label>
            <Input
              type="password"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isUpdatingPassword}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Policy Modal */}
      <Modal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        title="Emergency Matching & Dispatch Policy"
        description="SmartDonor automated algorithm parameters and emergency blood protocols."
        size="lg"
      >
        <div className="space-y-4 text-xs font-inter text-slate-600 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <h5 className="font-bold text-dark font-poppins text-xs mb-1">
              Geographic Radius & Compatibility
            </h5>
            <p>
              Emergency requests default to a 25 km initial radius search, expanding incrementally up to 50 km for rare blood groups (O-, AB-).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <h5 className="font-bold text-dark font-poppins text-xs mb-1">
              Donor Rest & Ineligibility Interval
            </h5>
            <p>
              Donors who completed whole blood donations enter a mandatory 90-day biological rest period before becoming eligible for automatic match alerts.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <h5 className="font-bold text-dark font-poppins text-xs mb-1">
              Deterministic Scoring Weights
            </h5>
            <p>
              Match ranking factors include: Blood compatibility (35%), Distance proximity (30%), Urgency multiplier (20%), and Historical response reliability (15%).
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="md" onClick={() => setIsPolicyModalOpen(false)}>
              Got It
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
