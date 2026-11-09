"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  ArrowLeft,
} from "lucide-react";
import { Button, TextField, Card, useToast, Logo } from "@/components/ui";
import { completeFirstLoginPasswordChangeAction } from "@/actions/staffActions";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const token = searchParams.get("token");
  const isFirstLogin = searchParams.get("first_login") === "true";

  // Token verification state
  const [isVerifyingToken, setIsVerifyingToken] = useState<boolean>(Boolean(token));
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);

  // Form states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Verify token on mount if token is provided
  useEffect(() => {
    if (!token) {
      setIsVerifyingToken(false);
      return;
    }

    let isMounted = true;
    async function verify() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token!)}`);
        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok || !data.valid) {
          setTokenError(
            data.error || "This password reset link is invalid, expired, or has already been used."
          );
        } else {
          setMaskedEmail(data.maskedEmail || null);
        }
      } catch {
        if (isMounted) {
          setTokenError("Unable to verify reset link. Please check your connection and try again.");
        }
      } finally {
        if (isMounted) {
          setIsVerifyingToken(false);
        }
      }
    }

    verify();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Password Strength Criteria Calculation
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const criteriaMetCount = [hasMinLength, hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
  const isPasswordValid = criteriaMetCount === 5;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

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

    if (!isPasswordValid) {
      setErrorMessage(
        "Please meet all password requirements: minimum 8 characters, with uppercase, lowercase, number, and special character."
      );
      toast.warning("Password Requirements Not Met", "Please strengthen your password.");
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      toast.error("Mismatch", "Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      if (token) {
        // TOKEN-BASED PASSWORD RESET WORKFLOW
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword: password }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.success) {
          const err = data.error || "Failed to reset password. Please try again.";
          setErrorMessage(err);
          toast.error("Reset Failed", err);
          setIsLoading(false);
          return;
        }

        setIsSuccess(true);
        toast.success("Password Updated", "Your password has been changed successfully. Please sign in.");
      } else {
        // FIRST-LOGIN / IN-SESSION TEMPORARY PASSWORD CHANGE
        const completeRes = await completeFirstLoginPasswordChangeAction(password);

        if (!completeRes?.success) {
          const err = completeRes?.error || "Failed to update temporary password.";
          setErrorMessage(err);
          toast.error("Update Failed", err);
          setIsLoading(false);
          return;
        }

        setIsSuccess(true);
        toast.success("Password Saved", "Your permanent password is now active.");
        const dest = completeRes?.redirectTo || "/hospital/dashboard";
        setTimeout(() => {
          window.location.href = dest;
        }, 1600);
      }
    } catch {
      setErrorMessage("An unexpected network error occurred. Please try again.");
      toast.error("Network Error", "Unable to complete password reset.");
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Loading verification state
  if (isVerifyingToken) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="p-8 text-center bg-white shadow-xl rounded-2xl border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 mx-auto flex items-center justify-center animate-spin">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="mt-4 font-poppins font-bold text-lg text-slate-900">
            Verifying Security Token...
          </h2>
          <p className="mt-1 text-xs text-slate-500 font-inter">
            Validating single-use cryptographic reset link...
          </p>
        </Card>
      </div>
    );
  }

  // 2. Token error state (Expired, Invalid, or Reused)
  if (token && tokenError) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-center mb-6">
          <Logo variant="horizontal" size="md" href="/" />
        </div>

        <Card className="p-6 sm:p-8 text-center bg-white shadow-xl rounded-2xl border-slate-200 space-y-5 animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="font-poppins font-bold text-xl text-slate-900">
              Invalid or Expired Link
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-inter leading-relaxed">
              {tokenError}
            </p>
            <p className="text-[11px] text-slate-400 font-inter pt-1">
              For your account security, password reset links expire after 20 minutes and can only be used once.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link href="/forgot-password" className="block w-full">
              <Button variant="primary" size="lg" fullWidth className="font-bold text-sm shadow-sm">
                Request New Reset Link
              </Button>
            </Link>

            <div>
              <Link
                href="/login"
                className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Return to Sign In
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // 3. Main Form or Success Screen
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-center mb-6">
        <Logo variant="horizontal" size="md" href="/" />
      </div>

      <Card className="shadow-xl border-slate-200/80 bg-white p-6 sm:p-8 rounded-2xl">
        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 mx-auto flex items-center justify-center font-bold shadow-xs">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="font-poppins text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {isFirstLogin ? "Change Temporary Password" : "Set New Password"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-inter leading-relaxed">
            {isFirstLogin
              ? "Welcome to ORBINOVA. For institutional security, you must replace your temporary password with a permanent password before continuing."
              : maskedEmail
              ? `Establish a new secure password for ${maskedEmail}.`
              : "Choose a secure password for your organization account."}
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-6 text-center animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="font-poppins text-base font-semibold text-slate-900">
                Password Reset Successfully
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-inter leading-relaxed">
                Your password has been changed. For your security, all active sessions on other devices have been signed out. Please sign in with your new password.
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  window.location.href = "/login";
                }}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="font-poppins font-bold text-sm shadow-sm py-2.5"
              >
                Sign In With New Password
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-blood-50 border border-blood-200 text-blood-700 text-xs sm:text-sm font-inter animate-fadeIn"
              >
                {errorMessage}
              </div>
            )}

            {/* New Password */}
            <div className="space-y-1">
              <div className="relative">
                <TextField
                  id="reset-password"
                  label="New Password *"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1 focus:outline-none z-10"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength Meter Bar */}
              {password.length > 0 && (
                <div className="space-y-1.5 pt-1 animate-fadeIn">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                    <span>Password Strength:</span>
                    <span
                      className={`font-semibold ${
                        criteriaMetCount === 5
                          ? "text-emerald-600"
                          : criteriaMetCount >= 3
                          ? "text-amber-600"
                          : "text-rose-600"
                      }`}
                    >
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${strengthColor}`}
                      style={{ width: `${(criteriaMetCount / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <TextField
                id="reset-confirm-password"
                label="Confirm New Password *"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1 focus:outline-none z-10"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Policy Criteria Checklist */}
            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1.5 text-[11px] text-slate-600 font-inter">
              <span className="font-semibold text-slate-700 block">Password must contain:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                <span className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
                  {hasMinLength ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                  At least 8 characters
                </span>
                <span className={`flex items-center gap-1.5 ${hasUpper ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
                  {hasUpper ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                  1 uppercase letter
                </span>
                <span className={`flex items-center gap-1.5 ${hasLower ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
                  {hasLower ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                  1 lowercase letter
                </span>
                <span className={`flex items-center gap-1.5 ${hasDigit ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
                  {hasDigit ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                  1 number (0-9)
                </span>
                <span className={`flex items-center gap-1.5 ${hasSpecial ? "text-emerald-600 font-medium" : "text-slate-400"} sm:col-span-2`}>
                  {hasSpecial ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                  1 special character (!@#$%^&*)
                </span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              loadingText="Updating password..."
              disabled={!isPasswordValid || !passwordsMatch || isLoading}
              className="font-poppins font-bold text-sm shadow-sm py-2.5"
            >
              {isFirstLogin ? "Save Permanent Password & Sign In" : "Update Password"}
            </Button>

            <div className="text-center pt-4 border-t border-slate-100">
              <Link
                href="/login"
                className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Return to Sign In
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500 font-inter text-sm">
          Loading security verification...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
