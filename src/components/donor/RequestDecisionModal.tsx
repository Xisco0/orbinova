"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartHandshake, XCircle, AlertCircle, CheckCircle2 } from "lucide-react";
import { DonorRequestWithDetails } from "@/services/donorService";
import { acceptDonorRequestAction, declineDonorRequestAction, withdrawDonorInterestAction } from "@/actions";
import { Modal, Button } from "@/components/ui";

interface RequestDecisionModalProps {
  mode: "accept" | "decline" | "withdraw";
  request: DonorRequestWithDetails;
  onClose: () => void;
}

const declineReasons = [
  "I am temporarily busy or away",
  "The facility location is too far",
  "Feeling unwell / medical rest",
  "Recently donated elsewhere",
  "Other personal reason",
];

const withdrawReasons = [
  "Sudden schedule conflict",
  "Transportation issues",
  "Feeling unwell / medical rest",
  "Other personal emergency",
];

export function RequestDecisionModal({
  mode,
  request,
  onClose,
}: RequestDecisionModalProps) {
  const router = useRouter();
  const [selectedReason, setSelectedReason] = useState(mode === "withdraw" ? withdrawReasons[0] : declineReasons[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAccept = mode === "accept";
  const isWithdraw = mode === "withdraw";
  const bloodReq = request.blood_request;

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isAccept) {
        const res = await acceptDonorRequestAction(request.id);
        if (!res.success) {
          setError(res.error || "Failed to accept request.");
          setIsLoading(false);
          return;
        }
      } else if (isWithdraw) {
        const res = await withdrawDonorInterestAction(request.id, selectedReason);
        if (!res.success) {
          setError(res.error || "Failed to withdraw interest.");
          setIsLoading(false);
          return;
        }
      } else {
        const res = await declineDonorRequestAction(request.id, selectedReason);
        if (!res.success) {
          setError(res.error || "Failed to decline request.");
          setIsLoading(false);
          return;
        }
      }

      onClose();
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const modalTitle = isAccept
    ? "Confirm Blood Donation Interest"
    : isWithdraw
    ? "Withdraw Donation Interest"
    : "Mark Unavailable";

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={modalTitle}
      size="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {isAccept ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-xs sm:text-sm text-emerald-900 leading-relaxed font-inter">
              <HeartHandshake className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-dark mb-1">
                  You are confirming readiness to donate blood.
                </p>
                <p className="text-emerald-800">
                  The medical facility will be notified that you have expressed interest. You will be contacted to coordinate screening and appointment timing.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Blood Group:</span>
                <span className="font-bold text-dark">{bloodReq?.blood_group || "O+"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Facility:</span>
                <span className="font-bold text-dark">{bloodReq?.organization?.city || "Healthcare Facility"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Urgency:</span>
                <span className="font-bold text-blood-600 uppercase">{bloodReq?.urgency || "Normal"}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              * Note: Please make sure you are well-hydrated, have eaten recently, and bring a valid photo ID.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-600 font-inter">
              {isWithdraw
                ? "Please select a reason for withdrawing your interest:"
                : "We understand you may not be available right now. Please select a reason to help us optimize future match notifications:"}
            </p>

            <div className="space-y-2">
              {(isWithdraw ? withdrawReasons : declineReasons).map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition-colors ${
                    selectedReason === r
                      ? "border-blood-500 bg-blood-50/60 text-dark"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="declineReason"
                    value={r}
                    checked={selectedReason === r}
                    onChange={() => setSelectedReason(r)}
                    className="text-blood-600 focus:ring-blood-500"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>

            <p className="text-[11px] text-slate-400">
              Your response is recorded privately and will not negatively impact your donor score.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={isAccept ? "blood" : "primary"}
            size="sm"
            onClick={handleSubmit}
            isLoading={isLoading}
            className={!isAccept ? "bg-slate-800 text-white hover:bg-slate-900" : ""}
          >
            {isAccept ? "Confirm & I'm Interested" : isWithdraw ? "Confirm Withdrawal" : "Confirm Unavailable"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
