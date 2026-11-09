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
  Heart,
  ShieldCheck,
  Calendar,
  Globe,
  Ban,
} from "lucide-react";
import { BloodGroupCode, DonorEligibility } from "@/types/database";
import { registerHospitalDonorAction } from "@/actions/hospitalActions";
import { Button, TextField } from "@/components/ui";
import { LocationSelector, LocationSelectorValue } from "@/lib/location";

interface RegisterDonorModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onSuccess?: (newDonor: {
    id: string;
    userId: string;
    fullName: string;
    email: string;
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

export const RegisterDonorModal: React.FC<RegisterDonorModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  onSuccess,
}) => {
  const [mounted, setMounted] = useState(false);

  // 1. Personal Information
  const [firstName, setFirstName] = useState("");
  const [otherNames, setOtherNames] = useState("");
  const [surname, setSurname] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // 2. Clinical Information
  const [bloodGroup, setBloodGroup] = useState<BloodGroupCode>("O+");
  const [eligibilityStatus, setEligibilityStatus] = useState<DonorEligibility>("eligible");

  // 3. International Donor Location
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
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailBlur = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean) {
      setEmailError("Email address is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (clean.endsWith("@orbinova.local") || clean.endsWith(".local") || clean.endsWith("@example.com")) {
      setEmailError("Placeholder emails are not permitted. Please use a valid email address.");
      return;
    }
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !surname.trim()) {
      setError("Donor first name and surname are required.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setEmailError("Email address is required.");
      setError("Email address is required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setEmailError("Please enter a valid email address.");
      setError("Please enter a valid email address.");
      return;
    }

    if (cleanEmail.endsWith("@orbinova.local") || cleanEmail.endsWith(".local") || cleanEmail.endsWith("@example.com")) {
      setEmailError("Placeholder emails are not permitted. Please use a valid email address.");
      setError("Placeholder emails are not permitted. Please use a valid email address.");
      return;
    }

    if (emailError) {
      setError(emailError);
      return;
    }

    if (!locationValue.state || !locationValue.city) {
      setError("Donor state/province and city are required.");
      return;
    }

    setLoading(true);

    const fullName = [firstName.trim(), otherNames.trim(), surname.trim()]
      .filter(Boolean)
      .join(" ");

    const res = await registerHospitalDonorAction({
      firstName: firstName.trim(),
      otherNames: otherNames.trim() || undefined,
      surname: surname.trim(),
      fullName,
      email: email.trim().toLowerCase() || undefined,
      phone: phone.trim() || undefined,
      dateOfBirth: dateOfBirth || undefined,
      gender,
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
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to register donor.");
      return;
    }

    if (onSuccess) {
      onSuccess({
        id: res.donorId || `temp-${Date.now()}`,
        userId: res.donorId || `temp-${Date.now()}`,
        fullName,
        email: email.trim().toLowerCase() || "",
        phone: phone.trim() || undefined,
        bloodGroup,
        country: locationValue.country,
        state: locationValue.state,
        city: locationValue.city,
        district: locationValue.district,
        eligibilityStatus,
        isActive: true,
      });
    }

    // Reset and close
    setFirstName("");
    setOtherNames("");
    setSurname("");
    setDateOfBirth("");
    setEmail("");
    setPhone("");
    setBloodGroup("O+");
    setEligibilityStatus("eligible");
    onClose();
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
      <div className="relative w-full sm:w-[540px] md:w-[580px] h-full bg-[#fcfcfc] border-l border-slate-200 shadow-2xl flex flex-col z-10 drawer-slide-in-right">
        {/* Header */}
        <div className="h-18 px-6 flex p-4 items-center justify-between bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-xl bg-blood-50 text-blood-600 p-2.5 shrink-0 border border-blood-100">
              <Heart className="w-5 h-5 fill-blood-100" />
            </div>
            <div className="min-w-0">
              <h2 className="font-poppins font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                Register Voluntary Donor
              </h2>
              <p className="text-[11px] text-slate-500 font-inter truncate">
                Institutional clinical onboarding &amp; location registry
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

          <form id="register-donor-form" onSubmit={handleSubmit} className="space-y-4 font-inter text-xs">
            {/* Section A: Donor Personal Identity */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-secondary-600" />
                <span>Donor Personal Identification</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  id="donor-first-name"
                  label="First Name *"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Kelechi"
                />
                <TextField
                  id="donor-surname"
                  label="Surname *"
                  required
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="e.g. Okafor"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  id="donor-other-names"
                  label="Other Names (Optional)"
                  value={otherNames}
                  onChange={(e) => setOtherNames(e.target.value)}
                  placeholder="e.g. Emmanuel"
                />
                <TextField
                  id="donor-date-of-birth"
                  label="Date of Birth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  id="donor-email"
                  label="Email Address *"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  onBlur={handleEmailBlur}
                  issueText={emailError || undefined}
                  placeholder="donor@domain.com"
                  helperText="Required for clinical correspondence & verification"
                />
                <TextField
                  id="donor-phone"
                  label="Contact Phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 802 345 6789"
                />
              </div>
            </div>

            {/* Section B: Clinical & Blood Group */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
                <Droplet className="w-4 h-4 text-blood-600" />
                <span>Clinical &amp; Transfusion Screening</span>
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Blood Group (ABO &amp; Rh) <span className="text-red-500">*</span>
                </label>
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

              {/* Eligibility Status */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Initial Screening &amp; Eligibility
                </label>
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
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
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
                    <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Deferred</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Section C: International Donor Residence Location */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
                <Globe className="w-4 h-4 text-secondary-600" />
                <span>Donor Residential Vicinity (Not Hospital Location)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Record the donor&apos;s actual residential neighbourhood or district for accurate regional matching.
              </p>

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
            form="register-donor-form"
            variant="blood"
            isLoading={loading}
            className="text-xs px-5 shadow-xs"
          >
            Register Voluntary Donor
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
