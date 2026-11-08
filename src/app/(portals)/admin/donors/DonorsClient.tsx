"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  BloodGroupBadge,
  OnboardDonorModal,
  UnboardConfirmModal,
} from "@/components/admin";
import { unboardDonorAction, reactivateDonorAction } from "@/actions/adminActions";
import { Heart, PlusCircle, Eye, MapPin, Ban, RotateCcw } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface DonorsClientProps {
  donors: any[];
}

export function DonorsClient({ donors }: DonorsClientProps) {
  const router = useRouter();
  const toast = useToast();

  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [unboardingDonor, setUnboardingDonor] = useState<any | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleUnboardConfirm = async (reason: string) => {
    if (!unboardingDonor) return;
    const res = await unboardDonorAction(unboardingDonor.id, reason);
    if (!res.success) {
      toast.error("Unboarding Failed", res.error || "Failed to unboard donor.");
    } else {
      toast.success("Donor Unboarded", `Donor has been safely removed from active matching.`);
      router.refresh();
    }
  };

  const handleReactivate = async (donor: any) => {
    setProcessingId(donor.id);
    try {
      const res = await reactivateDonorAction(donor.id);
      if (!res.success) {
        toast.error("Reactivation Failed", res.error || "Failed to reactivate donor.");
      } else {
        toast.success("Donor Reactivated", `Donor has been restored to active status.`);
        router.refresh();
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-slate-500 font-medium">
          Total Donors: <strong className="text-dark">{donors.length}</strong>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsOnboardModalOpen(true)}
          leftIcon={<PlusCircle className="w-4 h-4" />}
          className="shadow-sm"
        >
          Onboard Voluntary Donor
        </Button>
      </div>

      {/* Donors Table */}
      <Card className="p-0 overflow-hidden">
        {donors.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No donors found"
              description="No registered donors match your current search and filter selections."
              icon={<Heart className="w-8 h-8 text-blood-500" />}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor ID / Name</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Eligibility</TableHead>
                <TableHead>Account Status</TableHead>
                <TableHead>Last Donation</TableHead>
                <TableHead>Next Eligible</TableHead>
                <TableHead className="text-right">Manage Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donors.map((donor: any) => {
                const isUnboarded = donor.verification_status === "unboarded";
                const donorName = donor.profiles?.full_name || "Anonymous Donor";

                return (
                  <TableRow
                    key={donor.id}
                    className={isUnboarded ? "bg-slate-50/60 opacity-80" : ""}
                  >
                    <TableCell className="text-dark text-xs">
                      <Link
                        href={`/admin/donors/${donor.id}`}
                        className="hover:text-blood-600 hover:underline font-medium"
                      >
                        {donorName}
                      </Link>
                      <span className="block text-[10px] text-slate-400 font-mono">
                        REF: {donor.id.substring(0, 8).toUpperCase()}
                      </span>
                      {isUnboarded && donor.offboarding_reason && (
                        <span className="block text-[10px] text-amber-700 italic">
                          Reason: {donor.offboarding_reason}
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <BloodGroupBadge bloodGroup={donor.blood_group} size="sm" />
                    </TableCell>

                    <TableCell className="text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {donor.city || "—"}, {donor.state || "Nigeria"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          donor.availability_status === "available"
                            ? "success"
                            : "warning"
                        }
                        size="sm"
                      >
                        {donor.availability_status === "available"
                          ? "Available"
                          : "Unavailable"}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          donor.eligibility_status === "eligible"
                            ? "success"
                            : donor.eligibility_status === "temporarily_ineligible"
                            ? "warning"
                            : "default"
                        }
                        size="sm"
                      >
                        {donor.eligibility_status === "eligible"
                          ? "Eligible"
                          : donor.eligibility_status === "temporarily_ineligible"
                          ? "Resting (+90d)"
                          : donor.eligibility_status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          isUnboarded
                            ? "emergency"
                            : donor.profiles?.is_active
                            ? "success"
                            : "default"
                        }
                        size="sm"
                      >
                        {isUnboarded
                          ? "Unboarded"
                          : donor.profiles?.is_active
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-[11px] text-slate-500">
                      {formatDate(donor.last_donation_date)}
                    </TableCell>

                    <TableCell className="text-[11px] text-slate-500">
                      {formatDate(donor.next_eligible_date)}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/donors/${donor.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-blood-700 bg-blood-50 hover:bg-blood-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Profile</span>
                        </Link>

                        {!isUnboarded ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[11px] text-blood-600 hover:bg-blood-50 px-2 py-1 h-auto"
                            onClick={() => setUnboardingDonor(donor)}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            Unboard
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[11px] text-emerald-700 hover:bg-emerald-50 px-2 py-1 h-auto"
                            onClick={() => handleReactivate(donor)}
                            isLoading={processingId === donor.id}
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

      <OnboardDonorModal
        isOpen={isOnboardModalOpen}
        onClose={() => setIsOnboardModalOpen(false)}
        onSuccess={() => router.refresh()}
      />

      {unboardingDonor && (
        <UnboardConfirmModal
          isOpen={!!unboardingDonor}
          onClose={() => setUnboardingDonor(null)}
          entityType="donor"
          entityName={unboardingDonor.profiles?.full_name || "Voluntary Donor"}
          onConfirm={handleUnboardConfirm}
        />
      )}
    </>
  );
}
