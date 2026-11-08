"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Loader2, CheckCircle, AlertCircle, Activity } from "lucide-react";
import { BloodRequest, BloodGroupCode } from "@/types/database";
import { cancelBloodRequestAction, triggerMatchingRunAction } from "@/actions";
import { Button, ConfirmDialog } from "@/components/ui";
import { RecordDonationModal } from "@/components/hospital";

interface RequestDetailActionsProps {
  request: BloodRequest;
  canManage: boolean;
}

export function RequestDetailActions({
  request,
  canManage,
}: RequestDetailActionsProps) {
  const router = useRouter();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [matchingFeedback, setMatchingFeedback] = useState<string | null>(null);

  const isActive =
    request.status !== "fulfilled" &&
    request.status !== "cancelled" &&
    request.status !== "expired";

  const handleRunMatching = async () => {
    setIsMatching(true);
    setMatchingFeedback(null);
    try {
      const res = await triggerMatchingRunAction(request.id);
      if (res.success) {
        setMatchingFeedback(res.message);
      } else {
        setMatchingFeedback(res.message || res.error || "Matching failed");
      }
      router.refresh();
    } catch (err: any) {
      setMatchingFeedback(err.message || "Failed to trigger matching");
    } finally {
      setIsMatching(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    await cancelBloodRequestAction(request.id, "Staff manual cancellation");
    setIsLoading(false);
    setShowCancelDialog(false);
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {isActive && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunMatching}
            disabled={isMatching}
            className="text-xs shadow-sm"
            leftIcon={
              isMatching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Activity className="w-3.5 h-3.5 text-amber-300" />
              )
            }
          >
            {isMatching ? "Matching Donors..." : "Find & Match Donors"}
          </Button>
        )}

        {isActive && (
          <Button
            variant="blood"
            size="sm"
            onClick={() => setShowRecordModal(true)}
            className="text-xs"
            leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
          >
            Record Donation
          </Button>
        )}

        {canManage && isActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCancelDialog(true)}
            className="text-xs text-slate-600 hover:text-blood-600"
          >
            Cancel Request
          </Button>
        )}
      </div>

      {matchingFeedback && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-white border border-slate-200 shadow-xl rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4">
          <Activity className="w-5 h-5 text-blood-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="text-slate-900">Matching Engine Result</p>
            <p className="text-slate-600 mt-0.5 leading-relaxed">{matchingFeedback}</p>
          </div>
          <button
            onClick={() => setMatchingFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}


      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancel}
        title="Cancel Blood Request?"
        message="Are you sure you want to cancel this blood request? Pending matched donors will no longer be prompted to respond."
        confirmText="Yes, Cancel Request"
        variant="danger"
        isLoading={isLoading}
      />

      {showRecordModal && (
        <RecordDonationModal
          initialRequestId={request.id}
          initialBloodGroup={request.blood_group}
          onClose={() => setShowRecordModal(false)}
        />
      )}
    </>
  );
}
