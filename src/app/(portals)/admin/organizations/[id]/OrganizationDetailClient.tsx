"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Organization, VerificationStatus } from "@/types/database";
import { updateOrganizationStatusAction } from "@/actions";
import { Button, ConfirmDialog, Badge } from "@/components/ui";
import { OrganizationStatusBadge } from "@/components/admin";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";

interface OrganizationDetailClientProps {
  organization: Organization;
}

export const OrganizationDetailClient: React.FC<OrganizationDetailClientProps> = ({
  organization,
}) => {
  const router = useRouter();

  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    targetStatus: VerificationStatus | null;
    title: string;
    message: string;
    variant: "danger" | "warning" | "primary";
    confirmText: string;
  }>({
    isOpen: false,
    targetStatus: null,
    title: "",
    message: "",
    variant: "primary",
    confirmText: "Confirm",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const openActionDialog = (targetStatus: VerificationStatus) => {
    switch (targetStatus) {
      case "verified":
        setDialogState({
          isOpen: true,
          targetStatus: "verified",
          title: "Verify Healthcare Facility",
          message: `Are you sure you want to verify ${organization.name}? This will authorize the facility to post emergency blood requests and access donor matching.`,
          variant: "primary",
          confirmText: "Verify Facility",
        });
        break;
      case "rejected":
        setDialogState({
          isOpen: true,
          targetStatus: "rejected",
          title: "Reject Facility Application",
          message: `Are you sure you want to reject the application for ${organization.name}? The facility will be notified and denied portal access.`,
          variant: "danger",
          confirmText: "Reject Application",
        });
        break;
      case "suspended":
        setDialogState({
          isOpen: true,
          targetStatus: "suspended",
          title: "Suspend Healthcare Organization",
          message: `Warning: Suspending ${organization.name} will immediately deactivate all staff accounts and halt active blood requests. This action is auditable.`,
          variant: "danger",
          confirmText: "Suspend Organization",
        });
        break;
      case "pending":
        setDialogState({
          isOpen: true,
          targetStatus: "pending",
          title: "Reset to Pending Review",
          message: `Reset verification status for ${organization.name} back to Pending Review?`,
          variant: "warning",
          confirmText: "Set to Pending",
        });
        break;
    }
  };

  const handleConfirm = async () => {
    if (!dialogState.targetStatus) return;

    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await updateOrganizationStatusAction(
        organization.id,
        dialogState.targetStatus
      );

      if (!res.success) {
        setFeedback({ type: "error", text: res.error || "Failed to update status." });
      } else {
        setFeedback({ type: "success", text: res.message || "Status updated successfully." });
        setDialogState((prev) => ({ ...prev, isOpen: false }));
        router.refresh();
      }
    } catch {
      setFeedback({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium animate-fadeIn ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : "bg-blood-50 text-blood-800 border-blood-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Action Control Panel */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-inter">
            Current Status:
          </span>
          <OrganizationStatusBadge status={organization.verification_status} size="sm" />
          <Badge variant={organization.is_active ? "success" : "default"} size="sm">
            {organization.is_active ? "Active" : "Deactivated"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {organization.verification_status !== "verified" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => openActionDialog("verified")}
              leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
            >
              Verify Facility
            </Button>
          )}

          {organization.verification_status === "verified" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openActionDialog("suspended")}
              className="text-blood-700 hover:bg-blood-50 hover:border-blood-300"
              leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-blood-600" />}
            >
              Suspend Organization
            </Button>
          )}

          {organization.verification_status === "pending" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openActionDialog("rejected")}
              className="text-blood-700 hover:bg-blood-50"
              leftIcon={<XCircle className="w-3.5 h-3.5 text-blood-600" />}
            >
              Reject Application
            </Button>
          )}

          {organization.verification_status === "suspended" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openActionDialog("verified")}
              leftIcon={<RefreshCw className="w-3.5 h-3.5 text-green-600" />}
            >
              Reactivate Facility
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        onClose={() => setDialogState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirm}
        title={dialogState.title}
        message={dialogState.message}
        variant={dialogState.variant}
        confirmText={dialogState.confirmText}
        isLoading={isLoading}
      />
    </div>
  );
};
