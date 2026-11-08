"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  UserPlus,
  Search,
  Building2,
  Clock,
  CheckCircle2,
  PauseCircle,
  AlertCircle,
  ShieldCheck,
  Droplet,
  UserCog,
  Edit3,
  Calendar,
  MapPin,
  PlusCircle,
} from "lucide-react";
import { BloodGroupCode, DonorEligibility, OrgType } from "@/types/database";
import { toggleDonorActiveAction } from "@/actions/hospitalActions";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  Avatar,
} from "@/components/ui";
import { RegisterDonorModal } from "@/components/hospital/RegisterDonorModal";
import { EditDonorModal } from "@/components/hospital/EditDonorModal";
import { RecordDonationModal } from "@/components/hospital/RecordDonationModal";

interface DonorsClientProps {
  donors: any[];
  canManage: boolean;
  organizationId: string;
  organizationType: OrgType;
  organizationName?: string;
}

export function DonorsClient({
  donors,
  canManage,
  organizationId,
  organizationType,
  organizationName = "Facility Registry",
}: DonorsClientProps) {
  const router = useRouter();
  const [donorList, setDonorList] = useState<any[]>(donors);
  const [loadingDonorId, setLoadingDonorId] = useState<string | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDonorForEdit, setSelectedDonorForEdit] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");

  // State for recording donation directly from table
  const [selectedDonorForDonation, setSelectedDonorForDonation] = useState<{
    id: string;
    bloodGroup: BloodGroupCode;
  } | null>(null);

  useEffect(() => {
    setDonorList(donors);
  }, [donors]);

  const handleOpenEdit = (d: any) => {
    setSelectedDonorForEdit(d);
    setIsEditModalOpen(true);
  };

  const handleDonorUpdated = (updated: {
    id: string;
    userId: string;
    fullName: string;
    email?: string;
    phone?: string;
    bloodGroup: BloodGroupCode;
    city?: string;
    eligibilityStatus: DonorEligibility;
    isActive: boolean;
  }) => {
    setDonorList((prev) =>
      prev.map((d) => {
        if (d.id === updated.id || d.user_id === updated.userId) {
          return {
            ...d,
            blood_group: updated.bloodGroup,
            city: updated.city || d.city,
            eligibility_status: updated.eligibilityStatus,
            is_active: updated.isActive,
            profile: {
              ...d.profile,
              full_name: updated.fullName,
              email: updated.email || d.profile?.email,
              phone: updated.phone !== undefined && updated.phone !== "" ? updated.phone : d.profile?.phone,
              is_active: updated.isActive,
            },
          };
        }
        return d;
      })
    );
    router.refresh();
  };

  const handleDonorRegistered = (newDonor: any) => {
    setDonorList((prev) => {
      const filtered = prev.filter(
        (d) => d.profile?.email?.toLowerCase() !== newDonor.email.toLowerCase()
      );
      return [
        {
          id: newDonor.id,
          user_id: newDonor.userId,
          blood_group: newDonor.bloodGroup,
          city: newDonor.city,
          eligibility_status: newDonor.eligibilityStatus,
          is_active: true,
          created_at: new Date().toISOString(),
          profile: {
            id: newDonor.userId,
            full_name: newDonor.fullName,
            email: newDonor.email,
            phone: newDonor.phone || null,
            role: "donor",
            is_active: true,
          },
        },
        ...filtered,
      ];
    });
    router.refresh();
  };

  const handleToggleActive = async (donorId: string, currentActive: boolean) => {
    setLoadingDonorId(donorId);
    const newActive = !currentActive;

    // Instant optimistic update in table
    setDonorList((prev) =>
      prev.map((d) => {
        const matches =
          d.id === donorId ||
          d.user_id === donorId ||
          `donor-${d.user_id}` === donorId ||
          d.id === `donor-${donorId}`;

        if (matches) {
          return {
            ...d,
            is_active: newActive,
            profile: {
              ...d.profile,
              is_active: newActive,
            },
          };
        }
        return d;
      })
    );

    const res = await toggleDonorActiveAction(donorId, newActive);
    setLoadingDonorId(null);

    if (!res.success) {
      // Revert if action failed
      setDonorList((prev) =>
        prev.map((d) => {
          const matches =
            d.id === donorId ||
            d.user_id === donorId ||
            `donor-${d.user_id}` === donorId ||
            d.id === `donor-${donorId}`;

          if (matches) {
            return {
              ...d,
              is_active: currentActive,
              profile: {
                ...d.profile,
                is_active: currentActive,
              },
            };
          }
          return d;
        })
      );
    }

    router.refresh();
  };

  const activeCount = donorList.filter((d) => d.is_active && d.profile?.is_active !== false).length;
  const suspendedCount = donorList.filter((d) => !d.is_active || d.profile?.is_active === false).length;
  const eligibleCount = donorList.filter((d) => d.eligibility_status === "eligible").length;

  const filteredDonors = donorList.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    const name = d.profile?.full_name?.toLowerCase() || "";
    const email = d.profile?.email?.toLowerCase() || "";
    const phone = d.profile?.phone?.toLowerCase() || "";
    const bg = (d.blood_group || "").toLowerCase();
    const city = (d.city || "").toLowerCase();
    const matchesSearch = !q || name.includes(q) || email.includes(q) || phone.includes(q) || bg.includes(q) || city.includes(q);

    const isMemberActive = d.is_active && d.profile?.is_active !== false;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && isMemberActive) ||
      (statusFilter === "suspended" && !isMemberActive);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blood-50 text-blood-600 flex items-center justify-center font-bold shrink-0">
            <Heart className="w-5 h-5 fill-blood-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-poppins font-bold text-sm text-slate-900">
                Facility Voluntary Donors
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blood-50 text-blood-700 text-[11px] font-semibold font-inter">
                <Building2 className="w-3 h-3 text-blood-600" />
                {organizationName}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-inter">
              {donorList.length} registered donors &bull; {eligibleCount} clinically eligible
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-inter font-medium">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "all"
                  ? "bg-white text-dark shadow-2xs font-bold"
                  : "text-slate-600 hover:text-dark"
              }`}
            >
              All ({donorList.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "active"
                  ? "bg-white text-emerald-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-dark"
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Active ({activeCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("suspended")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "suspended"
                  ? "bg-white text-amber-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-dark"
              }`}
            >
              <PauseCircle className="w-3 h-3 text-amber-500" />
              <span>Suspended ({suspendedCount})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search donors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-dark focus:ring-1 focus:ring-blood-500 font-inter"
            />
          </div>

          {canManage && (
            <Button
              type="button"
              variant="blood"
              onClick={() => setIsRegisterModalOpen(true)}
              className="text-xs gap-1.5 shrink-0 shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Donor</span>
            </Button>
          )}
        </div>
      </div>

      {/* Donors Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Donor Details</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Blood Group</TableHead>
              <TableHead>Eligibility</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDonors.length > 0 ? (
              filteredDonors.map((d) => {
                const isDonorActive = d.is_active && d.profile?.is_active !== false;
                const isEligible = d.eligibility_status === "eligible";

                return (
                  <TableRow key={d.id}>
                    {/* Donor Details */}
                    <TableCell>
                      <div
                        onClick={() => canManage && handleOpenEdit(d)}
                        className={`flex items-center gap-3 ${canManage ? "cursor-pointer group select-none" : ""}`}
                        title={canManage ? "Click to view or edit donor profile" : undefined}
                      >
                        <Avatar
                          name={d.profile?.full_name || "Voluntary Donor"}
                          size="sm"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-dark text-xs block group-hover:text-blood-600 transition-colors">
                              {d.profile?.full_name || "Voluntary Donor"}
                            </span>
                            {canManage && (
                              <Edit3 className="w-3 h-3 text-slate-300 group-hover:text-blood-500 transition-colors opacity-0 group-hover:opacity-100" />
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ID: {d.id.substring(0, 10).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact Info */}
                    <TableCell>
                      <div className="space-y-0.5 text-xs font-inter">
                        <div className="text-slate-700">{d.profile?.email || "No email"}</div>
                        <div className="text-[11px] text-slate-400">{d.profile?.phone || "No phone"}</div>
                      </div>
                    </TableCell>

                    {/* Blood Group */}
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blood-50 text-blood-700 font-bold text-xs font-inter">
                        <Droplet className="w-3 h-3 fill-blood-600 text-blood-600" />
                        {d.blood_group || "O+"}
                      </span>
                    </TableCell>

                    {/* Eligibility */}
                    <TableCell className="whitespace-nowrap">
                      <Badge
                        variant={isEligible ? "success" : "warning"}
                        size="sm"
                        className="whitespace-nowrap"
                      >
                        {d.eligibility_status === "eligible"
                          ? "Eligible"
                          : d.eligibility_status === "temporarily_deferred"
                          ? "Deferred"
                          : "Ineligible"}
                      </Badge>
                    </TableCell>

                    {/* Account Status */}
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={isDonorActive ? "success" : "warning"} size="sm" className="whitespace-nowrap">
                        {isDonorActive ? "Active" : "Suspended"}
                      </Badge>
                    </TableCell>

                    {/* Location */}
                    <TableCell className="text-xs text-slate-500 font-inter whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>
                          {d.district ? `${d.district}, ${d.city || d.state}` : d.city || "Lagos"}
                          {d.country && d.country !== "Nigeria" ? ` (${d.country})` : ""}
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Record Donation */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setSelectedDonorForDonation({
                              id: d.id,
                              bloodGroup: d.blood_group || "O+",
                            })
                          }
                          className="text-xs py-1 px-2 text-blood-600 hover:bg-blood-50"
                          title="Record blood donation from this donor"
                        >
                          <Droplet className="w-3.5 h-3.5 mr-1" />
                          <span>Collect</span>
                        </Button>

                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(d)}
                              className="text-xs py-1 px-2 text-slate-600 hover:text-dark hover:bg-slate-100"
                              title="Edit donor details"
                            >
                              <UserCog className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              <span>Edit</span>
                            </Button>

                            <Button
                              variant={isDonorActive ? "outline" : "primary"}
                              size="sm"
                              onClick={() => handleToggleActive(d.id, isDonorActive)}
                              disabled={loadingDonorId === d.id}
                              className={`text-xs py-1 px-2.5 ${
                                isDonorActive ? "hover:border-red-300 hover:text-red-600" : ""
                              }`}
                            >
                              {isDonorActive ? "Suspend" : "Reactivate"}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blood-50 text-blood-600 flex items-center justify-center mx-auto">
                      <Clock className="w-6 h-6" />
                    </div>
                    <h4 className="font-poppins font-bold text-slate-800 text-sm">
                      No Donors Found
                    </h4>
                    <p className="text-xs text-slate-500 font-inter leading-relaxed">
                      {statusFilter === "suspended"
                        ? `All registered donors at ${organizationName} are currently active.`
                        : `No donor records match your search criteria.`}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Register Donor Modal */}
      <RegisterDonorModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        organizationId={organizationId}
        onSuccess={handleDonorRegistered}
      />

      {/* Edit Donor Modal */}
      <EditDonorModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedDonorForEdit(null);
        }}
        donor={selectedDonorForEdit}
        organizationId={organizationId}
        onSuccess={handleDonorUpdated}
      />

      {/* Record Donation Quick Modal */}
      {selectedDonorForDonation && (
        <RecordDonationModal
          initialDonorId={selectedDonorForDonation.id}
          initialBloodGroup={selectedDonorForDonation.bloodGroup}
          onClose={() => setSelectedDonorForDonation(null)}
        />
      )}
    </div>
  );
}
