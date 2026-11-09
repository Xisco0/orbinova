"use client";

import React, { useEffect, useRef } from "react";
import { Clock, ShieldCheck, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

export interface InactivityWarningModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onStaySignedIn: () => void;
  onSignOutNow: () => void;
}

export const InactivityWarningModal: React.FC<InactivityWarningModalProps> = ({
  isOpen,
  remainingSeconds,
  onStaySignedIn,
  onSignOutNow,
}) => {
  const stayButtonRef = useRef<HTMLButtonElement>(null);

  // Focus lock and background scroll prevention
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    stayButtonRef.current?.focus();

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

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="inactivity-warning-title"
      aria-describedby="inactivity-warning-desc"
      className="fixed inset-0 z-[99998] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm select-none animate-fadeIn"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden transform transition-all p-6 sm:p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon Badge */}
        <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 mb-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-amber-100/80 animate-pulse" />
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Clock className="w-8 h-8 sm:w-9 sm:h-9" />
          </div>
        </div>

        {/* Pill */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold font-mono uppercase tracking-wide mb-2">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Inactivity Warning</span>
        </div>

        <h2
          id="inactivity-warning-title"
          className="font-poppins text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
        >
          Still Working?
        </h2>

        {/* Message */}
        <p
          id="inactivity-warning-desc"
          className="mt-2 text-xs sm:text-sm text-slate-600 font-inter leading-relaxed"
        >
          You have been inactive for a while. For your account security, you will be automatically signed out in:
        </p>

        {/* Countdown Timer Display */}
        <div className="my-4 py-3 px-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 inline-block">
          <span className="font-mono text-2xl sm:text-3xl font-extrabold text-amber-900 tracking-wider">
            {timeFormatted}
          </span>
        </div>

        <p className="text-[11px] text-slate-400 font-inter">
          Click below to continue your session and reset the inactivity timer.
        </p>

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5">
          <Button
            ref={stayButtonRef}
            variant="primary"
            size="lg"
            fullWidth
            onClick={onStaySignedIn}
            className="font-poppins font-bold text-sm shadow-md py-3 gap-2 order-1 sm:order-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Stay Signed In</span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            fullWidth
            onClick={onSignOutNow}
            className="font-poppins text-xs py-3 gap-1.5 text-slate-600 hover:text-slate-900 border-slate-200 order-2 sm:order-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Now</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
