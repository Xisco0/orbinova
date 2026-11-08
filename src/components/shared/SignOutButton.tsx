"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authService } from "@/services/authService";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

import { PortalScope } from "@/lib/auth/portalAuth";

export interface SignOutButtonProps {
  className?: string;
  redirectTo?: string;
  variant?: "ghost" | "button" | "menu";
  portalScope?: PortalScope;
}

export const SignOutButton: React.FC<SignOutButtonProps> = ({
  className,
  redirectTo = "/login",
  variant = "ghost",
  portalScope,
}) => {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirmSignOut = async () => {
    setIsLoading(true);
    try {
      await authService.signOut(portalScope);
      setIsModalOpen(false);
      router.push(redirectTo);
      router.refresh();
    } catch {
      setIsModalOpen(false);
      router.push(redirectTo);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerButton =
    variant === "menu" ? (
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-medium text-blood-600 hover:bg-blood-50 rounded-lg transition-colors text-left cursor-pointer",
          className
        )}
      >
        <LogOut className="w-4 h-4 shrink-0" />
        <span>Sign Out</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-blood-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer",
          className
        )}
        aria-label="Sign out of your account"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    );

  return (
    <>
      {triggerButton}

      {/* Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isLoading) setIsModalOpen(false);
        }}
        size="sm"
      >
        <div className="text-center p-2">
          {/* Warning Icon Badge */}
          <div className="w-12 h-12 rounded-2xl bg-blood-50 text-blood-600 flex items-center justify-center mx-auto mb-4 border border-blood-100 shadow-2xs">
            <LogOut className="w-6 h-6 stroke-[2.2]" />
          </div>

          <h3 className="font-poppins text-lg font-bold text-slate-900">
            Confirm Sign Out
          </h3>

          <p className="mt-2 text-sm text-slate-500 font-inter leading-relaxed max-w-sm mx-auto">
            Are you sure you want to sign out of your account? You will need to sign in again to access patient records and clinical workflows.
          </p>

          <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              Stay Signed In
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleConfirmSignOut}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blood-600 hover:bg-blood-700 active:bg-blood-800 text-white font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Yes, Sign Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
