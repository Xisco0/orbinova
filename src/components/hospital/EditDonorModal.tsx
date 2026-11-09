"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  User,
  Mail,
  Phone,
  Droplet,
  MapPin,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  ShieldCheck,
  Heart,
  Globe,
  Ban,
} from "lucide-react";
import { BloodGroupCode, DonorEligibility } from "@/types/database";
import { updateHospitalDonorAction } from "@/actions/hospitalActions";
import { Button, TextField } from "@/components/ui";
import { LocationSelector, LocationSelectorValue } from "@/lib/location";

interface EditDonorModalProps {
  isOpen: boolean;
  onClose: () => void;
  donor: any | null;
  organizationId: string;
  onSuccess?: (updated: {
    id: string;
    userId: string;
    fullName: string;
    email?: string;
    phone?: string;
    bloodGroup: BloodGroupCode;
    country?: string;
    state?: string;
    city?: string;
    district?: string;
    eligibilityStatus: DonorEligibility;
    isActive: boolean;
  }) => void;
}

const BLOOD_GROUPS: BloodGroupCode[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const EditDonorModal: React.FC<EditDonorModalProps> = ({
  isOpen,
  onClose,
  donor,
  organizationId,
  onSuccess,
}) => {
  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroupCode>("O+");
  const [eligibilityStatus, setEligibilityStatus] = useState<DonorEligibility>("eligible");
  const [isActive, setIsActive] = useState(true);

  // International Donor Residence Location
  const [locationValue, setLocationValue] = useState<LocationSelectorValue>({
    country: "Nigeria",
    countryCode: "NG",
    state: "Lagos",
    city: "Ikeja",
    district: "",
    latitude: 6.5244,
    longitude: 3.3792,
    locationConsent: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (donor) {
      setFullName(donor.profile?.full_name || donor.fullName || "");
      setEmail(donor.profile?.email || donor.email || "");
      setPhone(donor.profile?.phone || donor.phone || "");
      setBloodGroup(donor.blood_group || donor.bloodGroup || "O+");
      setEligibilityStatus(donor.eligibility_status || donor.eligibilityStatus || "eligible");
      setIsActive(donor.is_active && donor.profile?.is_active !== false);

      setLocationValue({
        country: donor.country || "Nigeria",
        countryCode: donor.countryCode || (donor.country === "Nigeria" ? "NG" : undefined),
        state: donor.state || "Lagos",
        city: donor.city || "Lagos",
        district: donor.district || "",
        postalCode: donor.postal_code || donor.postalCode || "",
        latitude: donor.latitude ?? null,
        longitude: donor.longitude ?? null,
        locationConsent: donor.location_consent !== undefined ? donor.location_consent : (donor.locationConsent ?? true),
      });

      setError(null);
      setSuccessMsg(null);
    }
  }, [donor, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !mounted || !donor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Please enter a valid donor name.");
      return;
    }

    setLoading(true);

    const resolvedEmail =
      email.trim() ||
      donor.profile?.email ||
      donor.email ||
      undefined;
    const resolvedPhone =
      phone.trim() ||
      donor.profile?.phone ||
      donor.phone ||
      undefined;

    const res = await updateHospitalDonorAction({
      donorId: donor.id,
      userId: donor.user_id,
      fullName: fullName.trim(),
      email: resolvedEmail,
      phone: resolvedPhone,
      bloodGroup,
      country: locationValue.country,
      countryCode: locationValue.countryCode,
      state: locationValue.state,
      city: locationValue.city,
      district: locationValue.district,
      postalCode: locationValue.postalCode,
      latitude: locationValue.latitude,
      longitude: locationValue.longitude,
      locationConsent: locationValue.locationConsent,
      eligibilityStatus,
      isActive,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to update donor profile.");
      return;
    }

    setSuccessMsg("Donor profile and location updated successfully.");

    if (onSuccess) {
      onSuccess({
        id: donor.id,
        userId: donor.user_id,
        fullName: fullName.trim(),
        email: resolvedEmail,
        phone: resolvedPhone,
        bloodGroup,
        country: locationValue.country,
        state: locationValue.state,
        city: locationValue.city,
        district: locationValue.district,
        eligibilityStatus,
        isActive,
      });
    }

    setTimeout(() => {
      onClose();
    }, 1100);
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

      {/* Drawer */}
      <div className="relative w-full sm:w-[460px] md:w-[480px] h-full bg-[#fcfcfc] border-l border-slate-200 shadow-2xl flex flex-col z-10 drawer-slide-in-right">
        {/* Header */}
        <div className="h-18 px-6 flex items-center justify-between p-4 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-xl bg-blood-50 text-blood-600 p-2.5 shrink-0 border border-blood-100">
              <Heart className="w-5 h-5 fill-blood-100" />
            </div>
            <div className="min-w-0">
              <h2 className="font-poppins font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                Edit Donor Profile
              </h2>
              <p className="text-[11px] text-slate-500 font-inter truncate">
                Update clinical eligibility, contact details &amp; location
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
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

          <form id="edit-donor-form" onSubmit={handleSubmit} className="space-y-4 font-inter text-xs">
            {/* Identity Card */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-secondary-600" />
                <span>Donor Contact &amp; Identity</span>
              </div>

              <div className="space-y-4">
                <TextField
                  id="edit-donor-name"
                  label="Full Name *"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Samuel Adeleke"
                />
                <TextField
                  id="edit-donor-email"
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="donor@domain.com"
                />
                <TextField
                  id="edit-donor-phone"
                  label="Contact Phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 802 345 6789"
                />
              </div>
            </div>

            {/* Blood Group & Clinical Eligibility */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
                <Droplet className="w-4 h-4 text-blood-600" />
                <span>Clinical &amp; Transfusion Clearance</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Blood Group</label>
                <div className="grid grid-cols-4 gap-2">
                  {BLOOD_GROUPS.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setBloodGroup(bg)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        bloodGroup === bg
                          ? "bg-blood-600 border-blood-600 text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Eligibility</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEligibilityStatus("eligible")}
                    className={`p-2 rounded-xl border text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${
                      eligibilityStatus === "eligible"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Eligible</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEligibilityStatus("pending_verification")}
                    className={`p-2 rounded-xl border text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${
                      eligibilityStatus === "pending_verification"
                        ? "bg-amber-50 border-amber-500 text-amber-800 font-bold shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pending</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEligibilityStatus("temporarily_ineligible")}
                    className={`p-2 rounded-xl border text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${
                      eligibilityStatus === "temporarily_ineligible"
                        ? "bg-rose-50 border-rose-500 text-rose-800 font-bold shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-600" />
                    <span>Deferred</span>
                  </button>
                </div>
              </div>

              {/* Active / Suspended toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Account Status</span>
                  <span className="text-[11px] text-slate-400">
                    Suspended donors will be excluded from emergency donor matching.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {isActive ? "Active" : "Suspended"}
                </button>
              </div>
            </div>

            {/* Section C: International Location */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
                <Globe className="w-4 h-4 text-secondary-600" />
                <span>Donor Residential Location</span>
              </div>
              <LocationSelector
                mode="donor"
                value={locationValue}
                onChange={(val) => setLocationValue(val)}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-white border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="text-xs">
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-donor-form"
            variant="blood"
            isLoading={loading}
            className="text-xs px-5 shadow-xs"
          >
            Save Donor Profile
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
