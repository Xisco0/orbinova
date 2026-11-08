"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui";
import { RequestDecisionModal } from "@/components/donor";
import { DonorRequestWithDetails } from "@/services/donorService";

interface RequestDetailActionsProps {
  request: DonorRequestWithDetails;
}

export function RequestDetailActions({ request }: RequestDetailActionsProps) {
  const [modalMode, setModalMode] = useState<"accept" | "decline" | "withdraw" | null>(null);

  const isPending = request.status === "pending" || request.status === "viewed";
  const isAccepted = request.status === "accepted" || (request.status as string) === "interested";
  const isCompleted = request.status === "completed";

  if (!isPending && !isAccepted && !isCompleted) return null;

  return (
    <>
      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
        <h4 className="font-poppins font-bold text-base text-dark">
          {isPending
            ? "Can you help with this request?"
            : isAccepted
            ? "Donation Interest Confirmed"
            : "Donation Completed"}
        </h4>

        {isPending ? (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              variant="blood"
              size="lg"
              fullWidth
              className="font-bold sm:flex-1 text-base shadow-sm"
              onClick={() => setModalMode("accept")}
            >
              I&apos;m Interested & Ready to Donate
            </Button>
            <Button
              variant="outline"
              size="lg"
              fullWidth
              className="sm:flex-none text-slate-600 hover:text-slate-800"
              onClick={() => setModalMode("decline")}
            >
              I&apos;m Unavailable
            </Button>
          </div>
        ) : isAccepted ? (
          <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-900 text-xs sm:text-sm font-inter space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-green-950">
                ✓ You have confirmed interest in this blood request.
              </p>
              <button
                type="button"
                onClick={() => setModalMode("withdraw")}
                className="text-xs text-rose-600 hover:text-rose-800 underline font-medium cursor-pointer"
              >
                Withdraw Interest
              </button>
            </div>
            <p className="text-slate-700">
              The healthcare facility has been notified. An authorized clinical coordinator will contact you for pre-donation screening and appointment timing.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs sm:text-sm font-inter">
            <p className="font-bold">
              ✓ Donation Verified &amp; Completed!
            </p>
            <p className="text-emerald-800 mt-1">
              Thank you for saving lives! Your donation record is permanently preserved in your impact ledger.
            </p>
          </div>
        )}
      </div>

      {modalMode && (
        <RequestDecisionModal
          mode={modalMode}
          request={request}
          onClose={() => setModalMode(null)}
        />
      )}
    </>
  );
}
