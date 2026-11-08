"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  Droplet,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Eye,
  EyeOff,
  CalendarCheck,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/text-field";
import { authService } from "@/services/authService";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/constants/theme";

function DonorLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");

  const [email, setEmail] = useState("donor@orbinova.com");
  const [password, setPassword] = useState("DonorPassword2026!");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSessionUser, setActiveSessionUser] = useState<{ email?: string; role?: string } | null>(null);

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "signed_in_elsewhere" || reason === "session_expired" || reason === "expired") {
      setErrorMessage("Please sign in again.");
      setActiveSessionUser(null);
      return;
    }

    async function checkCurrentSession() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, full_name")
            .eq("id", user.id)
            .maybeSingle();

          const userProfile = profile as { role?: string; full_name?: string } | null;

          setActiveSessionUser({
            email: user.email,
            role: userProfile?.role || user.user_metadata?.role || "donor",
          });
        }
      } catch {
        // Ignore session check errors
      }
    }
    checkCurrentSession();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.loginDonor(email, password);

      if (!result.success) {
        const errorText =
          typeof result.error === "string" && result.error.trim() !== "{}" && result.error.trim().length > 0
            ? result.error
            : "Invalid credentials. Please verify your email and password or register a new donor profile.";
        setErrorMessage(errorText);
        setIsLoading(false);
        return;
      }

      const destination =
        redirectPath && redirectPath !== "/donor" && redirectPath !== "/donor/login"
          ? redirectPath
          : result.redirectTo || "/donor/dashboard";
      window.location.href = destination;
    } catch (err: any) {
      console.error("Donor login error:", err);
      const errMsg =
        typeof err?.message === "string" && err.message.trim() !== "{}" && err.message.trim().length > 0
          ? err.message
          : "An unexpected error occurred. Please check your network connection.";
      setErrorMessage(errMsg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-white lg:h-screen lg:max-h-screen lg:grid lg:grid-cols-12 lg:overflow-hidden lg:select-none">
      {/* =========================================================================
          LEFT SIDEBAR: DONOR PURPOSE & HEALTHCARE HERO STAGE (NO SCROLL)
          ========================================================================= */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-blood-950 text-white p-6 xl:p-8 2xl:p-10 flex-col justify-between relative overflow-hidden border-r border-slate-800 h-full">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blood-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-0 w-72 h-72 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 xl:space-y-5">
          <Logo variant="horizontal" size="md" href="/" inverted />

          <div className="pt-2 xl:pt-3 space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blood-950/80 border border-blood-800/80 text-blood-300 text-[11px] font-semibold">
              <Heart className="w-3 h-3 fill-blood-400 text-blood-400 animate-pulse" />
              <span>Voluntary Donor Network</span>
            </div>
            <h2 className="font-poppins text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-snug">
              Your Blood Donation Powers Critical Care.
            </h2>
            <p className="text-slate-300 font-inter text-xs xl:text-sm leading-relaxed">
              Log into your voluntary donor profile to verify eligibility, review donation history,
              and respond to regional emergency hospital blood requests.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blood-500/20 text-blood-400 flex items-center justify-center shrink-0 border border-blood-500/30">
                <Droplet className="w-4 h-4 fill-blood-400" />
              </div>
              <div className="text-xs">
                <div className="font-poppins font-bold text-white text-xs xl:text-sm">
                  Rapid Transfusion Response
                </div>
                <div className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">
                  Receive verified institutional alerts when your compatible blood type is needed nearby.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 border border-teal-500/30">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-poppins font-bold text-white text-xs xl:text-sm">
                  Clinical Eligibility Tracking
                </div>
                <div className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">
                  Track donation intervals and health guidelines to protect both donor and recipient wellness.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-500/20 text-primary-300 flex items-center justify-center shrink-0 border border-primary-500/30">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-poppins font-bold text-white text-xs xl:text-sm">
                  Confidential &amp; Protected Records
                </div>
                <div className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">
                  Personal phone numbers and health screening records are never published publicly.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300 font-inter">
          <div className="flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-blood-400 fill-blood-400" />
            <span>One donation can save up to three lives.</span>
          </div>
          <span className="text-slate-400">Thank you for being a lifesaver</span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT COLUMN: DONOR AUTH CONSOLE (NO SCROLL)
          ========================================================================= */}
      <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between min-h-[100dvh] lg:min-h-0 lg:h-full p-4 sm:p-6 xl:p-8 2xl:p-10 bg-white lg:overflow-hidden">
        <div className="flex items-center justify-between pb-3 xl:pb-4 border-b border-slate-100 shrink-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">Hospital or Blood Bank staff?</span>
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
            >
              Organization Portal &rarr;
            </Link>
          </div>
        </div>

        <div className="my-auto max-w-md w-full mx-auto py-2 xl:py-3">
          <div className="lg:hidden mb-4 flex justify-center">
            <Logo variant="horizontal" size="md" href="/" />
          </div>

          <div className="space-y-1 mb-4">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blood-50 text-blood-700 text-[10px] font-bold font-mono uppercase tracking-wide border border-blood-100">
              <Heart className="w-3 h-3 fill-blood-600" />
              <span>Voluntary Donor Access</span>
            </div>
            <h1 className="font-poppins text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Sign In to Donor Portal
            </h1>
            <p className="text-xs text-slate-500 font-inter">
              Access your donation records, blood group badges, and community response requests.
            </p>
          </div>

          {activeSessionUser && (
            <div className="mb-3 p-2.5 rounded-xl bg-blood-50 border border-blood-200 text-xs font-inter flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2 truncate">
                <UserCheck className="w-3.5 h-3.5 text-blood-600 shrink-0" />
                <span className="text-blood-800 text-[11px] truncate">
                  Signed in as <strong>{activeSessionUser.email}</strong>
                </span>
              </div>
              <Link
                href="/donor/dashboard"
                className="text-[11px] font-bold text-blood-700 hover:text-blood-900 bg-white px-2 py-0.5 rounded border border-blood-200 shrink-0"
              >
                Dashboard &rarr;
              </Link>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mb-3 p-2.5 rounded-lg bg-blood-50 border border-blood-200 text-blood-700 text-xs font-inter animate-in fade-in"
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <TextField
              id="donor-login-email"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <div className="space-y-1 relative">
              <TextField
                id="donor-login-password"
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-blood-600 focus:ring-blood-500 w-3.5 h-3.5"
                />
                <span>Remember this device</span>
              </label>

              <Link
                href="/donor/forgot-password"
                className="text-xs font-semibold text-blood-600 hover:text-blood-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                variant="blood"
                size="md"
                fullWidth
                isLoading={isLoading}
                loadingText="Signing in..."
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="font-bold shadow-xs py-2.5 text-sm"
              >
                Sign In as Donor
              </Button>
            </div>
          </form>

          <div className="mt-3.5 pt-2 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600 font-inter">
              Don&apos;t have a donor profile yet?{" "}
              <Link
                href="/donor/register"
                className="font-bold text-blood-600 hover:text-blood-700 hover:underline"
              >
                Hospital-managed donor registration &rarr;
              </Link>
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left text-[11px] text-slate-400 font-inter shrink-0">
          <span>&copy; {new Date().getFullYear()} {BRAND.name}. Voluntary blood donation network.</span>
          <span>Every blood donor is a hero.</span>
        </div>
      </div>
    </div>
  );
}

export default function DonorLoginPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-slate-900 flex items-center justify-center text-slate-400 font-inter">Loading donor portal...</div>}>
      <DonorLoginForm />
    </Suspense>
  );
}
