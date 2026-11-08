"use client";

import React from "react";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Droplet,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Building2,
} from "lucide-react";
import { BloodGroupCode, Profile, DonorProfile } from "@/types/database";
import { Input, Card, Badge } from "@/components/ui";

interface ProfileFormProps {
  user: Profile;
  donorProfile: DonorProfile;
  registeringOrganizationName?: string;
}

const bloodGroups: { value: BloodGroupCode; label: string }[] = [
  { value: "A+", label: "A+ (A Positive)" },
  { value: "A-", label: "A- (A Negative)" },
  { value: "B+", label: "B+ (B Positive)" },
  { value: "B-", label: "B- (B Negative)" },
  { value: "AB+", label: "AB+ (AB Positive - Universal Plasma Recipient)" },
  { value: "AB-", label: "AB- (AB Negative)" },
  { value: "O+", label: "O+ (O Positive - Most Common)" },
  { value: "O-", label: "O- (O Negative - Universal Red Cell Donor)" },
];

export function ProfileForm({
  user,
  donorProfile,
  registeringOrganizationName = "Lagos University Teaching Hospital (LUTH)",
}: ProfileFormProps) {
  const bloodGroupLabel =
    bloodGroups.find((bg) => bg.value === donorProfile.blood_group)?.label ||
    donorProfile.blood_group ||
    "O+";

  return (
    <div className="space-y-6">
      {/* Protected Institutional Notice Alert */}
      <div className="p-5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 flex items-start gap-3.5 shadow-xs">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-poppins font-bold text-sm text-amber-950">
              Institutional Donor Record (Protected)
            </h4>
            <Badge variant="warning" size="sm" className="border-amber-300 bg-amber-100/70 text-amber-800 text-[10px] font-mono">
              Managed Institutionally
            </Badge>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed font-inter">
            This donor record is officially registered and maintained by{" "}
            <strong className="text-amber-950 font-semibold">{registeringOrganizationName}</strong>.
            To guarantee clinical safety, blood verification integrity, and secure patient matching,
            profile details cannot be updated directly by donors. Only authorized staff at{" "}
            <span className="font-semibold text-amber-950">{registeringOrganizationName}</span> or an
            ORBINOVA Super Administrator are authorized to update your record.
          </p>
        </div>
      </div>

      {/* Section 1: Personal Contact Information */}
      <Card className="p-6 space-y-5 bg-white border-slate-200 shadow-xs">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-poppins font-bold text-base text-dark">
                Personal Information
              </h3>
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 font-inter">
              Verified donor identity registered with your facility.
            </p>
          </div>
          <User className="w-5 h-5 text-blood-600" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            type="text"
            value={user.full_name || "Volunteer Hero Donor"}
            disabled
            helperText="Managed by your registering institution"
            leftIcon={<User className="w-4 h-4 text-slate-400" />}
          />

          <Input
            label="Email Address (Account ID)"
            type="email"
            value={user.email || ""}
            disabled
            helperText="Official sign-in email"
            leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
          />

          <Input
            label="Phone Number"
            type="tel"
            value={user.phone || "Not provided"}
            disabled
            helperText="Used only by your registering facility for urgent matching"
            leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 font-inter">
              Gender
            </label>
            <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 capitalize">
              {donorProfile.gender || "Not specified"}
            </div>
          </div>

          <Input
            label="Date of Birth"
            type="text"
            value={donorProfile.date_of_birth || "Recorded during verification"}
            disabled
            helperText="Verified donor age requirement (18 - 65 years)"
            leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </Card>

      {/* Section 2: Blood & Clinical Reference */}
      <Card className="p-6 space-y-5 bg-white border-slate-200 shadow-xs">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-poppins font-bold text-base text-dark">
                Blood & Clinical Verification
              </h3>
              <ShieldCheck className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xs text-slate-500 font-inter">
              Clinically confirmed blood typing and medical donation readiness.
            </p>
          </div>
          <Droplet className="w-5 h-5 text-blood-600" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 font-inter">
              Blood Group & Rh Factor
            </label>
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="font-poppins font-bold text-base text-blood-700">
                {donorProfile.blood_group || "O+"}
              </span>
              <span className="text-xs text-slate-500 font-inter">
                {bloodGroupLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Verified by laboratory screening at {registeringOrganizationName}.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs font-inter">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Eligibility Status:</span>
              <span className="font-bold text-green-700 capitalize">
                {(donorProfile.eligibility_status || "eligible").replace("_", " ")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Last Donation:</span>
              <span className="font-medium text-slate-800">
                {donorProfile.last_donation_date || "No recorded donations"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Verification Status:</span>
              <span className="font-bold text-teal-700 capitalize">
                {donorProfile.verification_status || "verified"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Section 3: Registered Matching Location */}
      <Card className="p-6 space-y-5 bg-white border-slate-200 shadow-xs">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-poppins font-bold text-base text-dark">
                Location & Matching Area
              </h3>
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 font-inter">
              General geographic jurisdiction used for location-based blood request coordination.
            </p>
          </div>
          <MapPin className="w-5 h-5 text-secondary-600" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="City / Town"
            type="text"
            value={donorProfile.city || "Lagos"}
            disabled
            helperText="Managed by your registering institution"
            leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 font-inter">
              State / Province / Region
            </label>
            <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50">
              {donorProfile.state || "Lagos"}
            </div>
          </div>
        </div>
      </Card>

      {/* Institutional Read-Only Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
        <div className="flex items-center gap-2 font-medium">
          <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
          <span>
            Registered by: <strong className="text-slate-800">{registeringOrganizationName}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-200/80 text-slate-700 font-semibold text-[11px]">
            <Lock className="w-3 h-3 text-slate-500" />
            Protected Institutional Record
          </span>
        </div>
      </div>
    </div>
  );
}
