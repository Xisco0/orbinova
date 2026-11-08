"use client";

import React, { useState } from "react";
import { Modal, Input, Select, Button } from "@/components/ui";
import { onboardOrganizationAction } from "@/actions/adminActions";
import { OrgType } from "@/types/database";
import { Building2, Mail, Phone, FileText, User, Lock, Globe } from "lucide-react";
import { LocationSelector, LocationSelectorValue } from "@/lib/location";

interface OnboardOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: OrgType;
  onSuccess?: () => void;
}

export const OnboardOrgModal: React.FC<OnboardOrgModalProps> = ({
  isOpen,
  onClose,
  defaultType = "hospital",
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [organizationType, setOrganizationType] = useState<OrgType>(defaultType);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  // International Location State
  const [locationValue, setLocationValue] = useState<LocationSelectorValue>({
    country: "Nigeria",
    countryCode: "NG",
    state: "Lagos",
    city: "Ikeja",
    streetAddress: "",
    postalCode: "",
    latitude: 6.5244,
    longitude: 3.3792,
  });

  // Initial staff account
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !email.trim()) {
      setErrorMessage("Facility name and contact email are required.");
      return;
    }

    if (!locationValue.state || !locationValue.city) {
      setErrorMessage("Facility state/province and city are required.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await onboardOrganizationAction({
        name: name.trim(),
        organizationType,
        email: email.trim(),
        phone: phone.trim() || undefined,
        country: locationValue.country,
        state: locationValue.state.trim() || undefined,
        city: locationValue.city.trim() || undefined,
        address: locationValue.streetAddress?.trim() || undefined,
        postalCode: locationValue.postalCode?.trim() || undefined,
        latitude: locationValue.latitude,
        longitude: locationValue.longitude,
        licenseNumber: licenseNumber.trim() || undefined,
        managerName: managerName.trim() || undefined,
        managerEmail: managerEmail.trim() || undefined,
        managerPassword: managerPassword || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to onboard facility.");
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      onClose();
      onSuccess?.();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Onboard Healthcare Facility`}
      description="Register an internationally verified Hospital or Blood Bank node on the ORBINOVA emergency transfusion network."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-blood-50 border border-blood-200 text-blood-700 text-xs animate-fadeIn">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Facility / Institution Name *"
              placeholder="e.g. Lagos University Teaching Hospital (LUTH)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              leftIcon={<Building2 className="w-4 h-4 text-slate-400" />}
            />
          </div>
          <div>
            <Select
              label="Facility Type *"
              value={organizationType}
              onChange={(e) => setOrganizationType(e.target.value as OrgType)}
              options={[
                { value: "hospital", label: "Hospital" },
                { value: "blood_bank", label: "Blood Bank Center" },
              ]}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Official Facility Email *"
              type="email"
              placeholder="bloodbank@facility.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
            />
          </div>
          <div>
            <Input
              label="Emergency Phone"
              type="tel"
              placeholder="+234 803 333 4444"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
            />
          </div>
        </div>

        <Input
          label="Medical License / Institutional Reg No."
          placeholder="e.g. FMOH/REG/2026/891 or JCI-2026-X"
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          leftIcon={<FileText className="w-4 h-4 text-slate-400" />}
        />

        {/* Global International Location Management */}
        <div className="pt-2 border-t border-slate-200/80">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-secondary-600" />
            <h4 className="text-xs font-semibold text-slate-900">
              Institutional Location &amp; Geospatial Coordinates
            </h4>
          </div>
          <LocationSelector
            mode="institution"
            value={locationValue}
            onChange={(val) => setLocationValue(val)}
          />
        </div>

        {/* Initial Staff Credentials */}
        <div className="pt-3 border-t border-slate-200/80">
          <h4 className="text-xs font-semibold text-slate-900 mb-1">
            Facility Officer Credentials (Optional)
          </h4>
          <p className="text-[11px] text-slate-500 mb-3">
            Provision the initial login account for the facility's Blood Bank Director or Chief Medical Officer.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Staff Officer Name"
              placeholder="Dr. Kelechi Okafor"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              leftIcon={<User className="w-4 h-4 text-slate-400" />}
            />
            <Input
              label="Staff Login Email"
              type="email"
              placeholder="cmo@facility.org"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
            />
            <Input
              label="Staff Password"
              type="password"
              placeholder="••••••••••••"
              value={managerPassword}
              onChange={(e) => setManagerPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading} loadingText="Onboarding...">
            Onboard Facility Node
          </Button>
        </div>
      </form>
    </Modal>
  );
};
