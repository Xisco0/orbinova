"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  EmptyState,
  useToast,
} from "@/components/ui";
import {
  OnboardOrgModal,
  UnboardConfirmModal,
  OrganizationStatusBadge,
} from "@/components/admin";
import { unboardOrganizationAction, updateOrganizationStatusAction } from "@/actions/adminActions";
import { Organization, OrgType } from "@/types/database";
import { Building2, PlusCircle, Eye, MapPin, Mail, Phone, Ban, RotateCcw } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface OrganizationsClientProps {
  organizations: (Organization & { profiles?: { full_name: string | null } | null })[];
}

export function OrganizationsClient({ organizations }: OrganizationsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [unboardingOrg, setUnboardingOrg] = useState<Organization | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const currentType = searchParams.get("type") || "all";
  const currentStatus = searchParams.get("status") || "all";

  const handleTabChange = (typeVal: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (typeVal === "all") {
      current.delete("type");
    } else {
      current.set("type", typeVal);
    }
    current.delete("page");
    const qs = current.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  };

  const handleUnboardConfirm = async (reason: string) => {
    if (!unboardingOrg) return;
    const res = await unboardOrganizationAction(unboardingOrg.id, reason);
    if (!res.success) {
      toast.error("Unboarding Failed", res.error || "Failed to unboard facility.");
    } else {
      toast.success("Facility Unboarded", `${unboardingOrg.name} has been set to unboarded.`);
      router.refresh();
    }
  };

  const handleReactivate = async (org: Organization) => {
    setProcessingId(org.id);
    try {
      const res = await updateOrganizationStatusAction(org.id, "verified", "Re-activated by administrator");
      if (!res.success) {
        toast.error("Reactivation Failed", res.error || "Failed to reactivate facility.");
      } else {
        toast.success("Facility Reactivated", `${org.name} has been restored to verified status.`);
        router.refresh();
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      {/* Top Action Bar & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Quick Facility Type Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => handleTabChange("all")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              currentType === "all"
                ? "bg-white text-dark font-medium shadow-xs"
                : "text-slate-600 hover:text-dark"
            }`}
          >
            All Facilities
          </button>
          <button
            onClick={() => handleTabChange("hospital")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              currentType === "hospital"
                ? "bg-primary-600 text-white font-medium shadow-xs"
                : "text-slate-600 hover:text-dark"
            }`}
          >
            Hospitals Only
          </button>
          <button
            onClick={() => handleTabChange("blood_bank")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              currentType === "blood_bank"
                ? "bg-secondary-600 text-white font-medium shadow-xs"
                : "text-slate-600 hover:text-dark"
            }`}
          >
            Blood Banks Only
          </button>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsOnboardModalOpen(true)}
          leftIcon={<PlusCircle className="w-4 h-4" />}
          className="shadow-sm"
        >
          Onboard Facility Node
        </Button>
      </div>

      {/* Organizations Table */}
      <Card className="p-0 overflow-hidden mt-6">
        {organizations.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No organizations found"
              description="No healthcare facilities match your current search or filter criteria."
              icon={<Building2 className="w-8 h-8 text-primary-500" />}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Operational Status</TableHead>
                <TableHead>Registered Date</TableHead>
                <TableHead className="text-right">Manage Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => {
                const isUnboarded = org.verification_status === "unboarded";
                const isSuspended = org.verification_status === "suspended";

                return (
                  <TableRow key={org.id} className={isUnboarded ? "bg-slate-50/60 opacity-80" : ""}>
                    <TableCell className="text-dark text-xs">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="hover:text-primary-600 hover:underline flex items-center gap-1.5 font-medium"
                      >
                        <span>{org.name}</span>
                      </Link>
                      {org.license_number && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Lic: {org.license_number}
                        </span>
                      )}
                      {isUnboarded && org.offboarding_reason && (
                        <span className="block text-[10px] text-amber-700 italic">
                          Reason: {org.offboarding_reason}
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={org.organization_type === "blood_bank" ? "secondary" : "primary"}
                        size="sm"
                      >
                        {org.organization_type === "blood_bank" ? "Blood Bank" : "Hospital"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{org.city || "—"}, {org.state || "Nigeria"}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-600">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{org.email}</span>
                        </div>
                        {org.phone && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{org.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <OrganizationStatusBadge status={org.verification_status} size="sm" />
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={org.is_active ? "success" : isUnboarded ? "emergency" : "default"}
                        size="sm"
                      >
                        {isUnboarded ? "Unboarded" : org.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-[11px] text-slate-500">
                      {formatDate(org.created_at)}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/organizations/${org.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </Link>

                        {!isUnboarded ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[11px] text-blood-600 hover:bg-blood-50 px-2 py-1 h-auto"
                            onClick={() => setUnboardingOrg(org)}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            Unboard
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[11px] text-emerald-700 hover:bg-emerald-50 px-2 py-1 h-auto"
                            onClick={() => handleReactivate(org)}
                            isLoading={processingId === org.id}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Re-activate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <OnboardOrgModal
        isOpen={isOnboardModalOpen}
        onClose={() => setIsOnboardModalOpen(false)}
        defaultType={(currentType === "blood_bank" ? "blood_bank" : "hospital") as OrgType}
        onSuccess={() => router.refresh()}
      />

      {unboardingOrg && (
        <UnboardConfirmModal
          isOpen={!!unboardingOrg}
          onClose={() => setUnboardingOrg(null)}
          entityType={unboardingOrg.organization_type}
          entityName={unboardingOrg.name}
          onConfirm={handleUnboardConfirm}
        />
      )}
    </>
  );
}
