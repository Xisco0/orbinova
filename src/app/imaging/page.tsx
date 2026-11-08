import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Scan,
  ExternalLink,
  ShieldCheck,
  Building2,
  Activity,
  FileCheck2,
  Sparkles,
  ArrowRight,
  LogOut,
  Stethoscope,
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { canAccessModule } from "@/lib/auth/rbac";
import { Button, Badge } from "@/components/ui";
import { SignOutButton } from "@/components/shared/SignOutButton";
import { staffStore } from "@/services/staffStore";

export default async function ImagingPortalPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirect=/imaging");
  }

  // Mandatory password change check on first login
  const staffRecord = staffStore.get(user.id) || (user.email ? staffStore.get(user.email) : undefined);
  const mustChangePassword =
    (user.profile as any)?.must_change_password === true ||
    (user as any).user_metadata?.must_change_password === true ||
    staffRecord?.mustChangePassword === true;

  if (mustChangePassword) {
    redirect("/reset-password?first_login=true");
  }

  const context = await hospitalService.getHospitalContext(user.id);
  const memberRole = context?.membership?.member_role || ((user.profile?.role as any) === "radiologist" ? "radiologist" : "doctor");

  const hasAccess = canAccessModule(user.profile?.role || "hospital", "imaging", memberRole);
  if (!hasAccess) {
    redirect("/unauthorized?required=imaging");
  }

  const imagingUrl = process.env.NEXT_PUBLIC_IMAGING_APP_URL || "https://smart-donor-imaging.vercel.app/login";

  return (
    <div className="min-h-screen bg-slate-900 text-white font-inter flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-teal-500/20">
            <Scan className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-poppins font-bold text-base text-white tracking-tight">
                ORBINOVA <span className="text-teal-400">Imaging</span>
              </span>
              <Badge variant="success" size="sm" className="text-[10px] px-1.5 py-0 bg-teal-950 text-teal-300 border-teal-800">
                AI Diagnostic Engine
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {context?.organization?.name || "Lagos University Teaching Hospital (LUTH)"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {memberRole !== "radiologist" && (
            <Link
              href="/hospital/dashboard"
              className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Return to Hospital Portal
            </Link>
          )}
          <SignOutButton
            variant="menu"
            redirectTo="/login"
            portalScope="hospital"
            className="text-xs text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800/80 transition-colors"
          />
        </div>
      </header>

      {/* Main Diagnostic Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8 animate-fadeIn">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-800 via-slate-800/90 to-teal-950/60 border border-slate-700/60 p-6 sm:p-10 shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Specialized Diagnostic Imaging Portal</span>
            </div>
            <h1 className="font-poppins text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              AI-Powered Diagnostic Radiology &amp; Clinical Decision Support
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Welcome, <strong>{user.profile?.full_name || "Specialist"}</strong>. You are authenticated with dedicated imaging clearance for {context?.organization?.name || "your healthcare facility"}. Access real-time DICOM viewer, chest X-ray triage, and AI diagnostic annotation.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href={imagingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-teal-500/25 active:scale-95"
              >
                <span>Launch ORBINOVA Imaging Cloud</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              {memberRole !== "radiologist" && (
                <Link
                  href="/hospital/blood-requests"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs sm:text-sm border border-slate-700 transition-all"
                >
                  <span>Hospital Blood Operations</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Diagnostic Feature Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
              <Scan className="w-5 h-5" />
            </div>
            <h3 className="font-poppins font-bold text-sm sm:text-base text-white">
              Zero-Footprint DICOM Review
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Stream ultra-high resolution CT, MRI, and X-ray studies directly in browser with multi-planar reconstruction and windowing.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-poppins font-bold text-sm sm:text-base text-white">
              AI Pathology Highlighting
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated computer-vision detection for pneumonia, pneumothorax, pulmonary nodules, and cardiomegaly prior to specialist sign-off.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="font-poppins font-bold text-sm sm:text-base text-white">
              Direct Clinical Annotation
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export verified radiologist diagnostic impressions directly to patient case files and emergency transfusion workflows.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
