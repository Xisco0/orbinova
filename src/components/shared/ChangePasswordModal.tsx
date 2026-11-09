"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Button, TextField } from "@/components/ui";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  userEmail,
}: ChangePasswordModalProps) {
  const [mounted, setMounted] = useState(false);

  // Form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Reset form when opening/closing
  const handleReset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setErrorMessage(null);
    setIsSuccess(false);
    setIsLoading(false);
  };

  const handleClose = () => {
    if (isLoading) return;
    handleReset();
    onClose();
  };

  // Password Strength Criteria Calculation
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const criteriaMetCount = [
    hasMinLength,
    hasUpper,
    hasLower,
    hasDigit,
    hasSpecial,
  ].filter(Boolean).length;

  const isPasswordValid = criteriaMetCount === 5;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isDifferentFromCurrent =
    newPassword.length > 0 && currentPassword.length > 0 && newPassword !== currentPassword;

  const strengthLabel =
    criteriaMetCount <= 2 ? "Weak" : criteriaMetCount <= 4 ? "Good" : "Strong";
  const strengthColor =
    criteriaMetCount <= 2
      ? "bg-rose-500"
      : criteriaMetCount <= 4
      ? "bg-amber-500"
      : "bg-emerald-500";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentPassword) {
      setErrorMessage("Please enter your current password.");
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage(
        "Please meet all password requirements: at least 8 characters, with uppercase, lowercase, number, and special character."
      );
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage("New password and confirmation do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage("Your new password must be different from your current password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to update password. Please check your credentials.");
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch {
      setErrorMessage("A network error occurred. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden transform transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary-50 text-secondary-600 flex items-center justify-center font-bold shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="change-password-title"
                className="font-poppins font-bold text-base sm:text-lg text-slate-900 leading-tight"
              >
                Change Account Password
              </h2>
              <p className="text-xs text-slate-500 font-inter">
                {userEmail
                  ? `Authenticated session: ${userEmail}`
                  : "Update your operational login credentials"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-5 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-poppins font-bold text-lg text-slate-900">
                Password Changed Successfully
              </h3>
              <p className="text-xs text-slate-600 font-inter max-w-sm mx-auto leading-relaxed">
                Your account password has been updated and synchronized. You can continue working safely with your updated credentials.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5 text-left">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                Your session remains active. The new password will be required next time you sign in.
              </span>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={handleClose}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Current Password */}
            <div className="relative">
              <TextField
                id="current-password"
                label="Current Password *"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1 focus:outline-none z-10"
                tabIndex={-1}
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <div className="relative">
                <TextField
                  id="new-password"
                  label="New Password *"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1 focus:outline-none z-10"
                  tabIndex={-1}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Strength Meter Bar */}
              {newPassword.length > 0 && (
                <div className="pt-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                    <span>Password Strength:</span>
                    <span
                      className={
                        criteriaMetCount <= 2
                          ? "text-rose-600 font-bold"
                          : criteriaMetCount <= 4
                          ? "text-amber-600 font-bold"
                          : "text-emerald-600 font-bold"
                      }
                    >
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strengthColor} transition-all duration-300`}
                      style={{ width: `${(criteriaMetCount / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <div className="relative">
                <TextField
                  id="confirm-new-password"
                  label="Confirm New Password *"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1 focus:outline-none z-10"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {confirmPassword.length > 0 && (
                <div className="text-[11px] pt-1">
                  {passwordsMatch ? (
                    <span className="text-emerald-600 flex items-center gap-1 font-medium">
                      <Check className="w-3.5 h-3.5" /> Passwords match
                    </span>
                  ) : (
                    <span className="text-rose-600 flex items-center gap-1 font-medium">
                      <X className="w-3.5 h-3.5" /> Passwords do not match
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Password Requirements Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-[11px] font-semibold text-slate-700 block uppercase tracking-wide">
                Security Requirements
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                <div
                  className={`flex items-center gap-1.5 ${
                    hasMinLength ? "text-emerald-700 font-medium" : "text-slate-500"
                  }`}
                >
                  {hasMinLength ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
                  )}
                  <span>At least 8 characters</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 ${
                    hasUpper ? "text-emerald-700 font-medium" : "text-slate-500"
                  }`}
                >
                  {hasUpper ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
                  )}
                  <span>One uppercase letter (A-Z)</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 ${
                    hasLower ? "text-emerald-700 font-medium" : "text-slate-500"
                  }`}
                >
                  {hasLower ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
                  )}
                  <span>One lowercase letter (a-z)</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 ${
                    hasDigit ? "text-emerald-700 font-medium" : "text-slate-500"
                  }`}
                >
                  {hasDigit ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
                  )}
                  <span>One number (0-9)</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 sm:col-span-2 ${
                    hasSpecial ? "text-emerald-700 font-medium" : "text-slate-500"
                  }`}
                >
                  {hasSpecial ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
                  )}
                  <span>One special symbol (e.g. !@#$%^&*)</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isLoading || !isPasswordValid || !passwordsMatch || !currentPassword}
                isLoading={isLoading}
              >
                Update Password
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
