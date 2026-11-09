"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  UserPlus,
  Mail,
  Shield,
  Check,
  AlertCircle,
  Stethoscope,
  Scan,
  HeartHandshake,
  Activity,
  Layers,
  X,
  ShieldCheck,
  User,
  Phone,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { Button, Badge, TextField, SelectField } from "@/components/ui";
import { GranularMemberRole, OrgType } from "@/types/database";
import { addStaffMemberAction } from "@/actions/staffActions";
import { getRolePermissions } from "@/lib/auth/rbac";

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationType: OrgType;
  onSuccess?: (newMember: {
    fullName: string;
    email: string;
    phone?: string;
    role: GranularMemberRole;
    isActive?: boolean;
  }) => void;
}

interface RoleOption {
  value: GranularMemberRole;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "Clinical" | "Diagnostic" | "Operational" | "Management";
}

const HOSPITAL_ROLE_OPTIONS: RoleOption[] = [
  {
    value: "administrator",
    label: "Hospital Administrator",
    description: "Manages delegated institutional operations, staff invitations, blood requests, inventory, and facility settings.",
    icon: Shield,
    category: "Management",
  },
  {
    value: "donor_coordinator",
    label: "Donor Coordinator",
    description: "Responsible for voluntary donor registration, eligibility verification, scheduling, and donation matching.",
    icon: HeartHandshake,
    category: "Operational",
  },
  {
    value: "clinical_staff",
    label: "Clinical Staff",
    description: "Authorized healthcare professional for clinical blood requests, transfusion tracking, and patient workflows.",
    icon: Stethoscope,
    category: "Clinical",
  },
  {
    value: "radiologist",
    label: "Radiologist",
    description: "Hospital-affiliated imaging specialist provisioned for the independently deployed ORBINOVA Imaging application.",
    icon: Scan,
    category: "Diagnostic",
  },
];

const BLOOD_BANK_ROLE_OPTIONS: RoleOption[] = [
  {
    value: "inventory_officer",
    label: "Inventory Officer",
    description: "Manages blood unit batches, storage freezers, expiration quarantines, and stock levels.",
    icon: Layers,
    category: "Operational",
  },
  {
    value: "blood_bank_technician",
    label: "Laboratory Technician",
    description: "Performs blood typing, cross-matching, screening tests, and unit preparation.",
    icon: Activity,
    category: "Operational",
  },
  {
    value: "distribution_officer",
    label: "Distribution Officer",
    description: "Coordinates logistics, cold-chain transport, and fulfillment of hospital requests.",
    icon: HeartHandshake,
    category: "Operational",
  },
  {
    value: "manager",
    label: "Blood Bank Manager",
    description: "Full oversight of laboratory staff, ledger adjustments, and facility operations.",
    icon: Shield,
    category: "Management",
  },
];

export const STAFF_TITLES = [
  "Dr.",
  "Prof.",
  "Nurse",
  "Pharm.",
  "Mr.",
  "Mrs.",
  "Ms.",
  "Chief",
] as const;

export const InviteStaffModal: React.FC<InviteStaffModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  organizationType,
  onSuccess,
}) => {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState<string>("Dr.");
  const [surname, setSurname] = useState("");
  const [firstName, setFirstName] = useState("");
  const [otherNames, setOtherNames] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const isBloodBank = organizationType === "blood_bank";
  const roleOptions = isBloodBank ? BLOOD_BANK_ROLE_OPTIONS : HOSPITAL_ROLE_OPTIONS;
  const [selectedRole, setSelectedRole] = useState<GranularMemberRole>(roleOptions[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state when staff member is created and emailed
  const [successData, setSuccessData] = useState<{
    fullName: string;
    email: string;
    roleName: string;
  } | null>(null);

  const [emailChecking, setEmailChecking] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailBlur = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@") || !clean.includes(".")) return;
    setEmailChecking(true);
    try {
      const res = await fetch(`/api/auth/check-email-unique?email=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!data.isUnique) {
        setEmailError(data.error || "This email address is already in use.");
      } else {
        setEmailError(null);
      }
    } catch {
      setEmailError(null);
    } finally {
      setEmailChecking(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        handleReset();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading]);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Compute active capabilities for selected role preview
  const activePermissions = getRolePermissions(
    isBloodBank ? "blood_bank" : "hospital",
    selectedRole
  );

  const handleRoleChange = (role: GranularMemberRole) => {
    setSelectedRole(role);
    if (role === "doctor" || role === "radiologist") {
      setTitle("Dr.");
    } else if (role === "nurse") {
      setTitle("Nurse");
    } else if (role === "inventory_officer" || role === "blood_bank_technician" || (role as string) === "technician" || role === "distribution_officer") {
      setTitle("Mr.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surname.trim()) {
      setError("Please enter the staff member's surname.");
      return;
    }
    if (!firstName.trim()) {
      setError("Please enter the staff member's first name.");
      return;
    }
    if (!phone.trim()) {
      setError("Please enter a phone number.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid official email address.");
      return;
    }
    if (emailError) {
      setError(emailError);
      return;
    }

    const cleanFullName = [surname.trim(), firstName.trim(), otherNames.trim()]
      .filter(Boolean)
      .join(" ");

    setLoading(true);
    setError(null);

    const res = await addStaffMemberAction({
      title: title,
      fullName: cleanFullName,
      surname: surname.trim(),
      firstName: firstName.trim(),
      otherNames: otherNames.trim() || undefined,
      phone: phone.trim(),
      email: email.trim(),
      memberRole: selectedRole,
      organizationId,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to add staff member.");
      return;
    }

    setSuccessData({
      fullName: res.fullName || cleanFullName,
      email: res.email || email.trim().toLowerCase(),
      roleName: res.roleName || selectedRole.replace("_", " "),
    });

    if (onSuccess) {
      onSuccess({
        fullName: res.fullName || cleanFullName,
        email: res.email || email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        role: selectedRole,
        isActive: true,
      });
    }
  };

  const handleReset = () => {
    setTitle("Dr.");
    setSurname("");
    setFirstName("");
    setOtherNames("");
    setPhone("");
    setEmail("");
    setSuccessData(null);
    setError(null);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={() => {
          if (!loading) handleReset();
        }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel (Right Side, AjoNova pattern) */}
      <div className="relative w-full sm:w-[520px] md:w-[430px] h-full bg-[#fcfcfc] border-l border-slate-200/80 shadow-2xl flex flex-col z-10 drawer-slide-in-right">
        {/* Header */}
        <div className="h-18 px-5 sm:px-7 flex items-center justify-between bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0 p-4">
            <div className="rounded-xl bg-secondary-50 text-secondary-600 p-2.5 shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-poppins font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                {successData ? "Staff Member Added" : "Add Staff Member"}
              </h2>
              <p className="text-[11px] text-slate-500 font-inter truncate">
                {successData
                  ? `Login credentials sent to ${successData.email}`
                  : `Add new personnel to ${isBloodBank ? "Blood Bank" : "Hospital"} roster`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-full hover:bg-slate-100 bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors duration-200 cursor-pointer shrink-0"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User-Friendly Notice Banner */}
        {!successData && (
          <div className="px-5 sm:px-7 py-3 bg-secondary-50/80 border-b border-secondary-100/90 flex items-start gap-2.5 shrink-0">
            <ShieldCheck className="w-4 h-4 text-secondary-600 shrink-0 mt-0.5" />
            <p className="text-xs text-secondary-900 font-inter leading-relaxed">
              Fill in the staff member&apos;s details below to create their account. They will automatically receive an email with their login details and temporary password.
            </p>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          {successData ? (
            <div className="py-2 space-y-3">
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-sm font-inter space-y-3.5 shadow-2xs">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Account Created &amp; Credentials Dispatched</span>
                </div>
                <p className="text-emerald-800 text-xs sm:text-sm leading-relaxed">
                  An onboarding email has been sent to <strong>{successData.email}</strong> with their official login details and default password.
                </p>
                <div className="p-2.5 bg-amber-50/80 border border-amber-200/70 rounded-xl flex items-start gap-2 text-amber-900 text-[11px]">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Mandatory Security: The staff member will be required to change their temporary password after their first successful sign-in.</span>
                </div>
              </div>
            </div>
          ) : (
            <form id="add-staff-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Title (Full Width & Stacked) */}
              <div>
                <SelectField
                  id="staff-title"
                  label="Title *"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  options={STAFF_TITLES.map((t) => ({ value: t, label: t }))}
                  required
                />
              </div>

              {/* 2. Surname, First Name, Other Names (Full Width & Stacked) */}
              <div>
                <TextField
                  id="staff-surname"
                  label="Surname *"
                  required
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                />
              </div>

              <div>
                <TextField
                  id="staff-first-name"
                  label="First Name *"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div>
                <TextField
                  id="staff-other-names"
                  label="Other Names (Optional)"
                  value={otherNames}
                  onChange={(e) => setOtherNames(e.target.value)}
                />
              </div>

              {/* 2. Phone Number */}
              <div>
                <TextField
                  id="staff-phone"
                  label="Phone Number *"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* 3. Official Email Address */}
              <div>
                <TextField
                  id="staff-email"
                  label="Official Email Address *"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  onBlur={handleEmailBlur}
                  issueText={emailError || undefined}
                  helperText={
                    emailChecking
                      ? "Verifying email uniqueness across ORBINOVA..."
                      : !emailError
                      ? "Login credentials will be sent to this email address. Must be globally unique."
                      : undefined
                  }
                />
              </div>

              {/* 4. Professional Role Selection Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 font-inter">
                  Select Role <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {roleOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selectedRole === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleRoleChange(opt.value)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? "border-secondary-500 bg-secondary-50/60 ring-1 ring-secondary-500 shadow-2xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected
                              ? "bg-secondary-500 text-white shadow-2xs"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-xs text-slate-900">
                              {opt.label}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              {opt.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-inter leading-relaxed">
                            {opt.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Granular Capabilities Live Preview */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/90 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-secondary-600" />
                  <span>Included Capabilities for this Role:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activePermissions.map((perm) => (
                    <span
                      key={perm}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-700 shadow-3xs"
                    >
                      <Check className="w-2.5 h-2.5 text-emerald-500" />
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Pinned Bottom Footer Action Bar */}
        <div className="p-4 sm:p-6 bg-white border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          {successData ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleReset}
              className="text-xs px-5 py-2.5"
            >
              Return to Staff Roster
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                disabled={loading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="add-staff-form"
                variant="primary"
                disabled={loading}
                className="text-xs gap-1.5 px-5 py-2.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{loading ? "Adding Staff Member..." : "Add Staff Member"}</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
