"use client";

import React, { useEffect, useRef } from "react";
import { ShieldAlert, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui";

export interface SessionExpiredModalProps {
  isOpen: boolean;
  portalScope?: "hospital" | "donor" | "admin" | "imaging";
  onSignInAgain?: () => void;
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  isOpen,
  portalScope = "hospital",
  onSignInAgain,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Focus lock and background scroll prevention
  useEffect(() => {
    if (!isOpen) return;

    // Lock body scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus primary action
    buttonRef.current?.focus();

    // Prevent escape key from closing
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = async () => {
    if (onSignInAgain) {
      onSignInAgain();
      return;
    }

    try {
      await fetch(`/api/auth/logout?portal=${portalScope}`, {
        method: "POST",
      });
    } catch {
      // Ignore network errors on logout
    }

    // Determine target login route based on portal scope
    const targetLogin = portalScope === "donor" ? "/donor/login" : "/login";
    window.location.href = `${targetLogin}?reason=signed_in_elsewhere`;
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-desc"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm select-none animate-fadeIn"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden transform transition-all p-6 sm:p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Security Shield Badge */}
        <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 mb-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-amber-100/80 animate-pulse" />
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/25">
            <ShieldAlert className="w-8 h-8 sm:w-9 sm:h-9" />
          </div>
        </div>

        {/* Title */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold font-mono uppercase tracking-wide mb-2">
          <Lock className="w-3 h-3 text-amber-600" />
          <span>Security Notice</span>
        </div>

        <h2
          id="session-expired-title"
          className="font-poppins text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
        >
          Session Expired
        </h2>

        {/* Message */}
        <p
          id="session-expired-desc"
          className="mt-3 text-xs sm:text-sm text-slate-600 font-inter leading-relaxed"
        >
          Please sign in again.
        </p>

        {/* Supporting text */}
        <p className="mt-2 text-[11px] text-slate-400 font-inter">
          Your account security is important to us.
        </p>

        {/* Action Button */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <Button
            ref={buttonRef}
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleAction}
            className="font-poppins font-bold text-sm shadow-md py-3 gap-2"
          >
            <span>Sign In Again</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
