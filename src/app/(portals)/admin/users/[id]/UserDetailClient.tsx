"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Profile } from "@/types/database";
import { toggleUserStatusAction } from "@/actions";
import { Button, ConfirmDialog, Badge } from "@/components/ui";
import { ShieldAlert, CheckCircle2, Ban } from "lucide-react";

interface UserDetailClientProps {
  user: Profile;
}

export const UserDetailClient: React.FC<UserDetailClientProps> = ({ user }) => {
  const router = useRouter();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isCurrentlyActive = user.is_active;

  const handleToggle = async () => {
    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await toggleUserStatusAction(user.id, !isCurrentlyActive);

      if (!res.success) {
        setFeedback({ type: "error", text: res.error || "Failed to update status." });
      } else {
        setFeedback({ type: "success", text: res.message || "User status updated." });
        setIsDialogOpen(false);
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

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-inter">
            Account Status:
          </span>
          <Badge variant={isCurrentlyActive ? "success" : "default"} size="md">
            {isCurrentlyActive ? "Active Account" : "Deactivated"}
          </Badge>
        </div>

        <Button
          variant={isCurrentlyActive ? "outline" : "primary"}
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          className={
            isCurrentlyActive
              ? "text-blood-700 hover:bg-blood-50 hover:border-blood-300"
              : ""
          }
          leftIcon={
            isCurrentlyActive ? (
              <Ban className="w-3.5 h-3.5 text-blood-600" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )
          }
        >
          {isCurrentlyActive ? "Deactivate User Account" : "Activate User Account"}
        </Button>
      </div>

      <ConfirmDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={handleToggle}
        title={isCurrentlyActive ? "Deactivate User Account" : "Activate User Account"}
        message={
          isCurrentlyActive
            ? `Are you sure you want to deactivate ${user.full_name || user.email}? The user will be immediately blocked from signing in to all SmartDonor portals.`
            : `Reactivate ${user.full_name || user.email} and restore their portal access?`
        }
        variant={isCurrentlyActive ? "danger" : "primary"}
        confirmText={isCurrentlyActive ? "Deactivate Account" : "Activate Account"}
        isLoading={isLoading}
      />
    </div>
  );
};
