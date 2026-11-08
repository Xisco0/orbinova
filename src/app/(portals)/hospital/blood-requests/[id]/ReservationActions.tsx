"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BloodReservation } from "@/services/reservationStore";
import {
  prepareReservationAction,
  issueReservationAction,
  confirmDeliveryAction,
  rejectBloodBankRequestAction,
} from "@/actions/bloodBankActions";
import { Button, Modal, Input, Textarea, useToast } from "@/components/ui";
import { CheckCircle2, Truck, Package, XCircle, Loader2, Clock, AlertTriangle } from "lucide-react";

interface ReservationActionsProps {
  reservation: BloodReservation;
  currentOrgId: string;
  isSourceOrg: boolean;
  isRequestingHospital: boolean;
}

export function ReservationActions({
  reservation,
  currentOrgId,
  isSourceOrg,
  isRequestingHospital,
}: ReservationActionsProps) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal dialog states
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [transporterInput, setTransporterInput] = useState("Medical Dispatch Rider #4");
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [releaseReasonInput, setReleaseReasonInput] = useState("Emergency internal surgical requirement");

  const handlePrepare = async () => {
    setLoading(true);
    setError(null);
    const res = await prepareReservationAction(reservation.id);
    setLoading(false);
    if (!res.success) {
      setError(res.error || "Failed to prepare reservation");
      toast.error("Preparation Failed", res.error || "Failed to prepare reservation.");
    } else {
      toast.success("Units Prepared", `Blood reservation #${reservation.id.slice(0, 8)} is now marked as preparing.`);
      router.refresh();
    }
  };

  const executeIssue = async () => {
    setLoading(true);
    setError(null);
    const res = await issueReservationAction({
      reservationId: reservation.id,
      transporterDetails: transporterInput.trim() || undefined,
    });
    setLoading(false);
    if (!res.success) {
      setError(res.error || "Failed to issue reservation");
      toast.error("Dispatch Failed", res.error || "Failed to issue reservation.");
    } else {
      toast.success("Units Dispatched", `Blood units have been dispatched and marked in-transit.`);
      setIsIssueModalOpen(false);
      router.refresh();
    }
  };

  const handleConfirmDelivery = async () => {
    setLoading(true);
    setError(null);
    const res = await confirmDeliveryAction({
      reservationId: reservation.id,
      receivedNotes: "Confirmed received in good condition by clinical staff",
    });
    setLoading(false);
    if (!res.success) {
      setError(res.error || "Failed to confirm delivery");
      toast.error("Confirmation Failed", res.error || "Failed to confirm delivery.");
    } else {
      toast.success("Delivery Confirmed", "Blood units confirmed received and added to verified fulfillment.");
      router.refresh();
    }
  };

  const executeRelease = async () => {
    if (!releaseReasonInput.trim()) {
      setError("Please provide a reason for releasing units.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await rejectBloodBankRequestAction({
      requestId: reservation.blood_request_id || reservation.bloodRequestId || "",
      reservationId: reservation.id,
      reason: releaseReasonInput.trim(),
    });
    setLoading(false);
    if (!res.success) {
      setError(res.error || "Failed to decline");
      toast.error("Release Failed", res.error || "Failed to release reservation.");
    } else {
      toast.warning("Reservation Released", "Blood units released back to available facility stock.");
      setIsReleaseModalOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      <div className="flex flex-col items-end gap-1.5">
        {error && <span className="text-[11px] text-red-600 font-medium">{error}</span>}
        <div className="flex items-center gap-2">
          {/* Source Facility / Hospital-Owned Internal Facility Controls */}
          {isSourceOrg && reservation.status === "reserved" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrepare}
                disabled={loading}
                className="text-xs h-7 py-1 px-2.5"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Package className="w-3 h-3 mr-1 text-amber-600" />}
                Prepare Units
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsIssueModalOpen(true)}
                disabled={loading}
                className="text-xs h-7 py-1 px-2.5"
              >
                <Truck className="w-3 h-3 mr-1" />
                Issue & Dispatch
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReleaseModalOpen(true)}
                disabled={loading}
                className="text-xs h-7 py-1 px-2 text-slate-500 hover:text-red-600"
              >
                <XCircle className="w-3 h-3 mr-1" />
                Release
              </Button>
            </>
          )}

          {isSourceOrg && reservation.status === "preparing" && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsIssueModalOpen(true)}
                disabled={loading}
                className="text-xs h-7 py-1 px-2.5"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Truck className="w-3 h-3 mr-1" />}
                Issue & Dispatch
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReleaseModalOpen(true)}
                disabled={loading}
                className="text-xs h-7 py-1 px-2 text-slate-500 hover:text-red-600"
              >
                <XCircle className="w-3 h-3 mr-1" />
                Release
              </Button>
            </>
          )}

          {/* External Supplying Blood Bank Status when viewed by hospital */}
          {!isSourceOrg && reservation.status === "reserved" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Awaiting Blood Bank Issuance
            </span>
          )}

          {!isSourceOrg && reservation.status === "preparing" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200">
              <Package className="w-3.5 h-3.5 text-indigo-600" />
              Preparing for Dispatch
            </span>
          )}

          {/* Units Dispatched / In Transit -> Requesting Hospital confirms physical reception */}
          {(reservation.status === "issued" || reservation.status === "in_transit") && isRequestingHospital && (
            <Button
              variant="blood"
              size="sm"
              onClick={handleConfirmDelivery}
              disabled={loading}
              className="text-xs h-7 py-1 px-2.5 shadow-sm"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1 text-green-300" />}
              Confirm Receipt / Delivery
            </Button>
          )}

          {(reservation.status === "issued" || reservation.status === "in_transit") && !isRequestingHospital && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-700 bg-blue-50 rounded-md font-medium border border-blue-200">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              Dispatched / In Transit
            </span>
          )}

          {/* Completed Delivery & Confirmed Receipt */}
          {(reservation.status === "received" || reservation.status === "delivered") && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-800 bg-emerald-50 rounded-md font-medium border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Received & Confirmed
            </span>
          )}

          {reservation.status === "cancelled" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 bg-slate-50 rounded-md border border-slate-200">
              <XCircle className="w-3.5 h-3.5 text-slate-400" />
              Released / Cancelled
            </span>
          )}

          {reservation.status === "expired" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-red-600 bg-red-50 rounded-md border border-red-200">
              Expired
            </span>
          )}
        </div>
      </div>

      {/* React Modal: Issue & Dispatch Transporter Details */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => !loading && setIsIssueModalOpen(false)}
        title="Issue & Dispatch Blood Units"
        description="Record transporter or dispatch rider details for chain-of-custody tracking."
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Courier / Transporter Name or Vehicle Ref"
            value={transporterInput}
            onChange={(e) => setTransporterInput(e.target.value)}
            placeholder="e.g. Medical Dispatch Rider #4, Cold Van B"
            disabled={loading}
          />
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsIssueModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={executeIssue}
              isLoading={loading}
              loadingText="Dispatching..."
              leftIcon={<Truck className="w-4 h-4" />}
            >
              Confirm & Dispatch
            </Button>
          </div>
        </div>
      </Modal>

      {/* React Confirmation Modal: Release Reservation */}
      <Modal
        isOpen={isReleaseModalOpen}
        onClose={() => !loading && setIsReleaseModalOpen(false)}
        title="Release Blood Reservation"
        description="Are you sure you want to release these reserved units back into available facility stock?"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              This will cancel the allocation for this request and return the units to available inventory for other requests.
            </span>
          </div>

          <Textarea
            label="Reason for Release"
            value={releaseReasonInput}
            onChange={(e) => setReleaseReasonInput(e.target.value)}
            placeholder="Enter medical or operational justification..."
            rows={2}
            disabled={loading}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReleaseModalOpen(false)}
              disabled={loading}
            >
              Keep Reservation
            </Button>
            <Button
              variant="blood"
              size="sm"
              onClick={executeRelease}
              isLoading={loading}
              loadingText="Releasing..."
              leftIcon={<XCircle className="w-4 h-4" />}
            >
              Confirm Release
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
