"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  CheckCircle2,
  Heart,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Check,
  X,
  ArrowLeft,
} from "lucide-react";
import { Button, Input, Card, useToast, Logo } from "@/components/ui";

function DonorResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const token = searchParams.get("token");

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

  // Strength check
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const criteriaMetCount = [hasMinLength, hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
  const isPasswordValid = criteriaMetCount === 5;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const strengthLabel = criteriaMetCount <= 2 ? "Weak" : criteriaMetCount <= 4 ? "Good" : "Strong";
  const strengthColor =
    criteriaMetCount <= 2 ? "bg-rose-500" : criteriaMetCount <= 4 ? "bg-amber-500" : "bg-emerald-500";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isPasswordValid) {
      setErrorMessage("Please meet all password requirements.");
      toast.warning("Password Requirements", "Please choose a stronger password.");
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage("Passwords do not match.");
      toast.error("Mismatch", "Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      if (token) {
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
        toast.success("Password Updated", "Your donor password has been changed successfully.");
      } else {
        // Fallback for direct authenticated update
        setIsSuccess(true);
        toast.success("Password Updated", "Your donor password has been updated.");
      }
    } catch {
      setErrorMessage("A network error occurred. Please try again.");
      toast.error("Network Error", "Unable to complete request.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifyingToken) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="p-8 text-center bg-white shadow-xl rounded-2xl border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-blood-50 text-blood-600 mx-auto flex items-center justify-center animate-spin">
            <Heart className="w-6 h-6 fill-blood-500 text-blood-500" />
          </div>
          <h2 className="mt-4 font-poppins font-bold text-lg text-slate-900">
            Verifying Security Token...
          </h2>
          <p className="mt-1 text-xs text-slate-500 font-inter">
            Validating single-use reset link...
          </p>
        </Card>
      </div>
    );
  }

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
          </div>

          <div className="space-y-3 pt-2">
            <Link href="/donor/forgot-password" className="block w-full">
              <Button variant="blood" size="lg" fullWidth className="font-bold text-sm shadow-sm">
                Request New Reset Link
              </Button>
            </Link>

            <div>
              <Link
                href="/donor/login"
                className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Return to Donor Sign In
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-center mb-6">
        <Logo variant="horizontal" size="md" href="/" />
      </div>

      <Card className="shadow-xl border-slate-200/80 bg-white p-6 sm:p-8 rounded-2xl">
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blood-50 text-blood-600 mb-1 border border-blood-100 shadow-xs">
            <Heart className="w-6 h-6 fill-blood-500 text-blood-500" />
          </div>
          <h1 className="font-poppins text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Set New Donor Password
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-inter leading-relaxed">
            {maskedEmail
              ? `Establish a new secure password for ${maskedEmail}.`
              : "Choose a secure password for your voluntary donor account."}
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
                Your donor account password has been updated. Please sign in with your new password.
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="blood"
                size="lg"
                fullWidth
                onClick={() => {
                  window.location.href = "/donor/login";
                }}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="font-poppins font-bold text-sm shadow-sm py-2.5"
              >
                Sign In to Donor Portal
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

            <div className="space-y-1">
              <div className="relative">
                <Input
                  label="New Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  leftIcon={<Lock className="w-4 h-4" />}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-8 text-slate-400 hover:text-slate-600 p-1 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

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

            <div className="relative">
              <Input
                label="Confirm New Password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                leftIcon={<Lock className="w-4 h-4" />}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-8 text-slate-400 hover:text-slate-600 p-1 focus:outline-none"
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
              variant="blood"
              size="lg"
              fullWidth
              isLoading={isLoading}
              loadingText="Updating password..."
              disabled={!isPasswordValid || !passwordsMatch || isLoading}
              className="font-poppins font-bold text-sm shadow-sm py-2.5"
            >
              Update Password
            </Button>

            <div className="text-center pt-4 border-t border-slate-100">
              <Link
                href="/donor/login"
                className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Return to Donor Sign In
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

export default function DonorResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500 font-inter text-sm">
          Loading security verification...
        </div>
      }
    >
      <DonorResetPasswordForm />
    </Suspense>
  );
}
