"use client";

import React, { useState } from "react";
import { Modal, Textarea, Button } from "@/components/ui";
import { AlertTriangle, ShieldAlert } from "lucide-react";

interface UnboardConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "hospital" | "blood_bank" | "donor";
  entityName: string;
  onConfirm: (reason: string) => Promise<void>;
}

export const UnboardConfirmModal: React.FC<UnboardConfirmModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityName,
  onConfirm,
}) => {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const title =
    entityType === "donor"
      ? "Unboard Donor Account?"
      : entityType === "blood_bank"
      ? "Unboard Blood Bank Center?"
      : "Unboard Hospital Node?";

  const description =
    entityType === "donor"
      ? "This donor will no longer be available for emergency blood matching runs."
      : "This facility node will no longer appear as active on the emergency blood network.";

  const handleExecute = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await onConfirm(reason.trim() || "Administrative unboarding");
      setIsLoading(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to unboard entity.");
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-blood-50 border border-blood-200 text-blood-700 text-xs animate-fadeIn">
            {errorMessage}
          </div>
        )}

        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="text-amber-900">
              You are about to unboard: <strong>{entityName}</strong>
            </p>
            <p>{description}</p>
            <p className="text-[11px] text-amber-700 pt-1 border-t border-amber-200/60 font-medium">
              ✓ All historical records (blood requests, donation ledger, and audit logs) will remain safely preserved in the database.
            </p>
          </div>
        </div>

        <Textarea
          label="Unboarding Reason / Administrative Notes"
          placeholder="e.g. Facility requested temporary suspension of transfusion operations, or donor moved abroad..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleExecute}
            isLoading={isLoading}
            loadingText="Unboarding..."
          >
            Confirm Unboard
          </Button>
        </div>
      </div>
    </Modal>
  );
};
