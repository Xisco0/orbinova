"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, ShieldCheck, ArrowRight, UserCheck, Eye, EyeOff, Mail, ArrowLeft, Droplet, Crown, HeartPulse, Activity } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/text-field";
import { authService } from "@/services/authService";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/constants/theme";
import { PortalScope } from "@/lib/auth/portalAuth";

// Default credentials for the three required roles
const ROLE_ACCOUNTS = {
  hospital: {
    role: "hospital",
    label: "Hospital",
    icon: Building2,
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    email: "hospital@orbinova.com",
    password: "HospitalPassword2026!",
    description: "Accredited hospitals & surgical care teams",
  },
  admin: {
    role: "admin",
    label: "Super Admin",
    icon: Crown,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    email: "superadmin@orbinova.com",
    password: "SuperAdminPassword2026!",
    description: "System administrators & audit managers",
  },
  blood_bank: {
    role: "blood_bank",
    label: "Blood Bank",
    icon: Droplet,
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    email: "bloodbank@orbinova.com",
    password: "BloodBankPassword2026!",
    description: "Certified blood banks & inventory logisticians",
  },
  donor: {
    role: "donor",
    label: "Donor",
    icon: HeartPulse,
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    email: "donor@orbinova.com",
    password: "DonorPassword2026!",
    description: "Voluntary donors & healthcare heroes",
  },
} as const;

type RoleKey = keyof typeof ROLE_ACCOUNTS;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");

  const [activeRole, setActiveRole] = useState<RoleKey>("hospital");
  const [email, setEmail] = useState<string>(ROLE_ACCOUNTS.hospital.email);
  const [password, setPassword] = useState<string>(ROLE_ACCOUNTS.hospital.password);
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
            role: userProfile?.role || user.user_metadata?.role || "hospital",
          });
        }
      } catch {
        // Ignore session check errors
      }
    }
    checkCurrentSession();
  }, [searchParams]);

  const handleRoleSelect = (roleKey: RoleKey) => {
    setActiveRole(roleKey);
    setEmail(ROLE_ACCOUNTS[roleKey].email);
    setPassword(ROLE_ACCOUNTS[roleKey].password);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const normalized = email.trim().toLowerCase();
      const scopeToUse: PortalScope =
        activeRole === "admin" || normalized === "superadmin@orbinova.com" || normalized.includes("admin")
          ? "admin"
          : activeRole === "donor" || normalized === "donor@orbinova.com" || normalized.includes("donor")
          ? "donor"
          : "hospital";

      const result = await authService.loginOrganization(email, password, scopeToUse);

      if (!result.success) {
        const errorText =
          typeof result.error === "string" && result.error.trim() !== "{}" && result.error.trim().length > 0
            ? result.error
            : "Invalid credentials. Please verify your email and password or use the role switcher above.";
        setErrorMessage(errorText);
        setIsLoading(false);
        return;
      }

      // Authoritative role and destination resolution
      const resolvedRole = (result.role || (scopeToUse === "admin" ? "admin" : activeRole)) as string;

      let destination: string;
      if (result.mustChangePassword || result.redirectTo?.includes("reset-password")) {
        destination = result.redirectTo;
      } else if (resolvedRole === "admin") {
        destination = redirectPath && redirectPath.startsWith("/admin") ? redirectPath : "/admin/dashboard";
      } else if (resolvedRole === "donor") {
        destination = redirectPath && redirectPath.startsWith("/donor") ? redirectPath : "/donor/dashboard";
      } else if (resolvedRole === "blood_bank" || activeRole === "blood_bank") {
        destination =
          redirectPath && redirectPath.startsWith("/hospital") && redirectPath !== "/hospital" && redirectPath !== "/hospital/"
            ? redirectPath
            : (result.redirectTo || "/hospital/dashboard");
      } else {
        destination =
          redirectPath && redirectPath.startsWith("/hospital") && redirectPath !== "/hospital" && redirectPath !== "/hospital/"
            ? redirectPath
            : (result.redirectTo || "/hospital/dashboard");
      }

      if (destination === "/hospital" || destination === "/hospital/") {
        destination = "/hospital/dashboard";
      }

      window.location.href = destination;
    } catch (err: any) {
      console.error("Login error:", err);
      const errMsg =
        typeof err?.message === "string" && err.message.trim() !== "{}" && err.message.trim().length > 0
          ? err.message
          : "An unexpected error occurred during authentication.";
      setErrorMessage(errMsg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-white lg:h-screen lg:max-h-screen lg:grid lg:grid-cols-12 lg:overflow-hidden lg:select-none">
      {/* =========================================================================
          LEFT SIDEBAR: HEALTHCARE INTELLIGENCE BRAND STAGE (NO SCROLL)
          ========================================================================= */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-primary-950 text-white p-6 xl:p-8 2xl:p-10 flex-col justify-between relative overflow-hidden border-r border-slate-800 h-full">
        {/* Soft Radial Ambient Lights */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-0 w-72 h-72 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand Header */}
        <div className="relative z-10 space-y-4 xl:space-y-5">
          <Logo variant="horizontal" size="md" href="/" inverted />

          <div className="pt-2 xl:pt-3 space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-teal-300 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span>Institutional Access Gateway</span>
            </div>
            <h2 className="font-poppins text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-snug">
              Intelligent Healthcare Coordination &amp; Logistics.
            </h2>
            <p className="text-slate-300 font-inter text-xs xl:text-sm leading-relaxed">
              Unified operational portal for accredited hospitals, licensed blood banks, and
              healthcare administrators.
            </p>
          </div>

          {/* 3 Value Proposition Glass Cards */}
          <div className="space-y-2.5 pt-2">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-500/20 text-primary-300 flex items-center justify-center shrink-0 border border-primary-500/30">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-poppins font-bold text-white text-xs xl:text-sm">
                  Hospital Surgical &amp; Transfusion Teams
                </div>
                <div className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">
                  Submit emergency blood requests and monitor real-time clinical matching status.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blood-500/20 text-blood-300 flex items-center justify-center shrink-0 border border-blood-500/30">
                <Droplet className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-poppins font-bold text-white text-xs xl:text-sm">
                  Blood Bank Inventory Architecture
                </div>
                <div className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">
                  Batch tracking, cold-chain expiry control, and ABO/Rh deterministic donor dispatch.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 border border-teal-500/30">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-poppins font-bold text-white text-xs xl:text-sm">
                  Role-Isolated Security &amp; Compliance
                </div>
                <div className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">
                  HttpOnly server-managed cookies, tamper-evident audit logs, and NDPR/HIPAA safeguards.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Human Touchpoint */}
        <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300 font-inter">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
            <span>Behind every request is a human life.</span>
          </div>
          <span className="text-slate-400">Connecting Care &bull; Saving Lives</span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT COLUMN: DISTRACTION-FREE AUTHENTICATION CONSOLE (NO SCROLL)
          ========================================================================= */}
      <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between min-h-[100dvh] lg:min-h-0 lg:h-full p-4 sm:p-6 xl:p-8 2xl:p-10 bg-white lg:overflow-hidden">
        {/* Top Controls: Return to Home & Donor Switcher */}
        <div className="flex items-center justify-between pb-3 xl:pb-4 border-b border-slate-100 shrink-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">Individual donor?</span>
            <Link
              href="/donor/login"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100 transition-colors"
            >
              Donor Portal &rarr;
            </Link>
          </div>
        </div>

        {/* Centered Form Area (Compact & Ergonomic) */}
        <div className="my-auto max-w-md w-full mx-auto py-2 xl:py-3">
          {/* Mobile Logo Only */}
          <div className="lg:hidden mb-4 flex justify-center">
            <Logo variant="horizontal" size="md" href="/" />
          </div>

          <div className="space-y-1 mb-4">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold font-mono uppercase tracking-wide">
              <span>Organization Gateway</span>
            </div>
            <h1 className="font-poppins text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Sign In to Your Portal
            </h1>
            <p className="text-xs text-slate-500 font-inter">
              Choose your authorized department role or enter your institutional credentials.
            </p>
          </div>

          {/* Active Session Notification */}
          {activeSessionUser && (
            <div className="mb-3 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-inter flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2 truncate">
                <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-blue-800 text-[11px] truncate">
                  Signed in as <strong>{activeSessionUser.email}</strong>
                </span>
              </div>
              <Link
                href={
                  activeSessionUser.role === "admin"
                    ? "/admin/dashboard"
                    : activeSessionUser.role === "donor"
                    ? "/donor/dashboard"
                    : "/hospital/dashboard"
                }
                className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200 shrink-0"
              >
                Dashboard &rarr;
              </Link>
            </div>
          )}

          {/* Role Tabs Switcher: Hospital, Superadmin, Blood Bank, Donor */}
          <div className="mb-3.5 space-y-1.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
              {(Object.keys(ROLE_ACCOUNTS) as RoleKey[]).map((key) => {
                const item = ROLE_ACCOUNTS[key];
                const Icon = item.icon;
                const isSelected = activeRole === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleRoleSelect(key)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold font-poppins transition-all duration-150 ${
                      isSelected
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200/70"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-primary-600" : "text-slate-400"}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] text-slate-500 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-0.5">
              <span className="truncate">{ROLE_ACCOUNTS[activeRole].description}</span>
              <span className="font-mono text-primary-700 font-bold shrink-0">{ROLE_ACCOUNTS[activeRole].email}</span>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-3 p-2.5 rounded-lg bg-blood-50 border border-blood-200 text-blood-700 text-xs font-inter animate-in fade-in"
            >
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <TextField
              id="login-email"
              label="Institutional Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <div className="space-y-1 relative">
              <TextField
                id="login-password"
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
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                />
                <span>Remember this device</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                isLoading={isLoading}
                loadingText="Verifying credentials..."
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="font-bold shadow-xs py-2.5 text-sm"
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Micro Demo Credentials Footnote */}
          <div className="mt-3.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-inter">
            <span className="flex items-center gap-1 text-slate-600">
              <Activity className="w-3 h-3 text-amber-500" />
              <span>Default password:</span>
            </span>
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-slate-700">
              {activeRole === "admin"
                ? "SuperAdminPassword2026!"
                : activeRole === "blood_bank"
                ? "BloodBankPassword2026!"
                : "HospitalPassword2026!"}
            </code>
          </div>
        </div>

        {/* Micro Footer */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left text-[11px] text-slate-400 font-inter shrink-0">
          <span>&copy; {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span>
          <span>Secured Institutional Infrastructure</span>
        </div>
      </div>
    </div>
  );
}

export default function OrganizationLoginPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-slate-900 flex items-center justify-center text-slate-400 font-inter">Loading portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
