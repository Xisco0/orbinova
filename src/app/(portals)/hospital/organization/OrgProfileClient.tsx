"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, Phone, ShieldCheck, Save, FileBadge, Globe } from "lucide-react";
import { Organization } from "@/types/database";
import { updateOrganizationProfileAction } from "@/actions";
import { Button, Input, Card, Badge } from "@/components/ui";
import { LocationSelector, LocationSelectorValue } from "@/lib/location";

interface OrgProfileClientProps {
  organization: Organization;
  canManage: boolean;
}

export function OrgProfileClient({ organization, canManage }: OrgProfileClientProps) {
  const router = useRouter();

  const [phone, setPhone] = useState(organization.phone || "");
  const [licenseNumber, setLicenseNumber] = useState(organization.license_number || "");

  // International Location Management State
  const [locationValue, setLocationValue] = useState<LocationSelectorValue>({
    country: organization.country || "Nigeria",
    countryCode: "NG",
    state: organization.state || "Lagos",
    city: organization.city || "Ikeja",
    streetAddress: organization.address || "",
    postalCode: organization.postal_code || "",
    latitude: organization.latitude ?? 6.5244,
    longitude: organization.longitude ?? 3.3792,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    setIsLoading(true);
    setMessage(null);

    const res = await updateOrganizationProfileAction(organization.id, {
      phone: phone.trim() || undefined,
      licenseNumber: licenseNumber.trim() || undefined,
      country: locationValue.country,
      state: locationValue.state?.trim() || undefined,
      city: locationValue.city?.trim() || undefined,
      address: locationValue.streetAddress?.trim() || undefined,
      postalCode: locationValue.postalCode?.trim() || undefined,
      latitude: locationValue.latitude,
      longitude: locationValue.longitude,
    });

    setIsLoading(false);

    if (res.success) {
      setMessage({ type: "success", text: "Organization profile and global location updated successfully." });
      router.refresh();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to update profile." });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border animate-fadeIn ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Overview & Verification Pill */}
      <Card className="p-6 bg-white border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary-50 border border-secondary-100 text-secondary-600 flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-poppins font-bold text-xl text-dark">
                {organization.name}
              </h2>
              <span className="text-xs text-slate-500 font-inter capitalize">
                {organization.organization_type.replace("_", " ")} Network Facility
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={
                organization.verification_status === "verified"
                  ? "success"
                  : organization.verification_status === "pending"
                  ? "warning"
                  : "secondary"
              }
              size="md"
            >
              Status: {organization.verification_status.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm font-inter">
          <Input
            label="Facility Official Email"
            type="email"
            value={organization.email}
            disabled
            helperText="Organization root identifier"
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Contact Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={!canManage}
            leftIcon={<Phone className="w-4 h-4" />}
          />

          <div className="sm:col-span-2">
            <Input
              label="Medical License / Institutional Registration ID"
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              disabled={!canManage}
              helperText="Official National / State Health Authority accreditation number"
              leftIcon={<FileBadge className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Global Facility Location Management */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-secondary-600" />
            <h3 className="font-poppins font-bold text-sm text-slate-900">
              Institutional Location &amp; Geospatial Coordinates
            </h3>
          </div>
          <LocationSelector
            mode="institution"
            disabled={!canManage}
            value={locationValue}
            onChange={(val) => setLocationValue(val)}
          />
        </div>
      </Card>

      {canManage && (
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            isLoading={isLoading}
            loadingText="Updating..."
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Facility Changes
          </Button>
        </div>
      )}
    </form>
  );
}
