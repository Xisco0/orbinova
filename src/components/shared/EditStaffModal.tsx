"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  User,
  Mail,
  Phone,
  Shield,
  Stethoscope,
  Scan,
  HeartHandshake,
  HeartPulse,
  Building,
  CheckCircle2,
  AlertCircle,
  UserCog,
  ShieldCheck,
  PauseCircle,
} from "lucide-react";
import {
  GranularMemberRole,
  OrgType,
  OrganizationMember,
  Profile,
} from "@/types/database";
import { updateStaffMemberAction } from "@/actions/staffActions";
import { Button, TextField } from "@/components/ui";

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: (OrganizationMember & { profile: Profile }) | null;
  organizationId: string;
  organizationType: OrgType;
  onSuccess?: (updatedData: {
    id: string;
    userId: string;
    fullName: string;
    phone?: string;
    memberRole: GranularMemberRole;
    isActive: boolean;
  }) => void;
}

const ROLE_OPTIONS = [
  {
    value: "administrator" as GranularMemberRole,
    label: "Hospital Administrator",
    description: "Delegated management over staff roster, requests, inventory & settings",
    icon: Shield,
  },
  {
    value: "donor_coordinator" as GranularMemberRole,
    label: "Donor Coordinator",
    description: "Voluntary donor registration, screening, matching & scheduling",
    icon: HeartHandshake,
  },
  {
    value: "clinical_staff" as GranularMemberRole,
    label: "Clinical Staff",
    description: "Clinical blood requests, transfusion tracking, and healthcare workflows",
    icon: Stethoscope,
  },
  {
    value: "radiologist" as GranularMemberRole,
    label: "Radiologist",
    description: "Diagnostic imaging, scan uploads, and AI annotation in ORBINOVA Imaging",
    icon: Scan,
  },
];

export const EditStaffModal: React.FC<EditStaffModalProps> = ({
  isOpen,
  onClose,
  member,
  organizationId,
  organizationType,
  onSuccess,
}) => {
  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<GranularMemberRole>("doctor");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync state whenever member changes
  useEffect(() => {
    if (member) {
      setFullName(member.profile?.full_name || "");
      setPhone(member.profile?.phone || "");
      const rawRole = (member.member_role || (member as any).role || "clinical_staff") as string;
      const normalizedRole: GranularMemberRole =
        rawRole === "doctor" || rawRole === "nurse" || rawRole === "hospital_staff" || rawRole === "staff"
          ? "clinical_staff"
          : rawRole === "manager" || rawRole === "hospital_admin"
          ? "administrator"
          : (rawRole as GranularMemberRole);
      setSelectedRole(normalizedRole);
      setIsActive(member.is_active ?? true);
      setError(null);
      setSuccessMsg(null);
    }
  }, [member, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !mounted || !member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Please enter a valid full name.");
      return;
    }

    setLoading(true);

    let res: any;
    try {
      res = await updateStaffMemberAction({
        userId: member.user_id,
        memberId: member.id,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        memberRole: selectedRole,
        isActive,
      });
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Failed to update staff member.");
      return;
    }

    setLoading(false);

    if (!res || !res.success) {
      setError(res?.error || "Failed to update staff member.");
      return;
    }

    setSuccessMsg(res.message || "Profile updated successfully.");
    if (onSuccess) {
      onSuccess({
        id: member.id,
        userId: member.user_id,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        memberRole: selectedRole,
        isActive,
      });
    }

    // Auto-close after brief delay to show success
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={() => {
          if (!loading) onClose();
        }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel (Right Side) */}
      <div className="relative w-full sm:w-[520px] md:w-[450px] h-full bg-[#fcfcfc] border-l border-slate-200/80 shadow-2xl flex flex-col z-10 drawer-slide-in-right">
        {/* Header */}
        <div className="h-18 px-5 sm:px-7 flex items-center justify-between bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0 p-4">
            <div className="rounded-xl bg-secondary-50 text-secondary-600 p-2.5 shrink-0">
              <UserCog className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-poppins font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                Edit Staff Profile
              </h2>
              <p className="text-[11px] text-slate-500 font-inter truncate">
                Update personnel details and clinical role clearance
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors duration-200 cursor-pointer shrink-0"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice Banner */}
        <div className="px-5 sm:px-7 py-3 bg-secondary-50/80 border-b border-secondary-100/90 flex items-start gap-2.5 shrink-0">
          <ShieldCheck className="w-4 h-4 text-secondary-600 shrink-0 mt-0.5" />
          <p className="text-xs text-secondary-900 font-inter leading-relaxed">
            Modify any mistakes in staff name, contact details, or assigned clinical clearance.
          </p>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-4 sm:space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form id="edit-staff-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* 1. Full Name */}
            <div>
              <TextField
                id="edit-staff-name"
                label="Full Name *"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            {/* 2. Official Email (Read-Only) */}
            <div>
              <TextField
                id="edit-staff-email"
                label="Official Email Address"
                type="email"
                disabled
                readOnly
                value={member.profile?.email || ""}
                helperText="Official login email is immutable for security clearance."
              />
            </div>

            {/* 3. Phone Number */}
            <div>
              <TextField
                id="edit-staff-phone"
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* 4. Clinical / Institutional Role */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 font-inter">
                Assigned Clinical Role &amp; Clearance <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {ROLE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedRole === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setSelectedRole(opt.value)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected
                          ? "bg-secondary-50/70 border-secondary-500 shadow-2xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                          isSelected
                            ? "bg-secondary-500 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-poppins font-bold text-xs text-slate-800">
                            {opt.label}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-secondary-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-inter line-clamp-1 mt-0.5">
                          {opt.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Account Status (Active vs Suspended) */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-2 font-inter">
                Account Status
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium font-inter transition-all ${
                    isActive
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Active</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive(false)}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium font-inter transition-all ${
                    !isActive
                      ? "bg-amber-50 border-amber-500 text-amber-800 font-bold shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Suspended</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Pinned Bottom Footer Action Bar */}
        <div className="p-4 sm:p-6 bg-white border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-staff-form"
            variant="primary"
            disabled={loading}
            className="text-xs gap-1.5 px-5 py-2.5"
          >
            <UserCog className="w-3.5 h-3.5" />
            <span>{loading ? "Saving Changes..." : "Save Changes"}</span>
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
