"use client";

import React from "react";
import Link from "next/link";
import {
  Heart,
  ShieldCheck,
  Building2,
  Stethoscope,
  ArrowRight,
  Info,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function DonorRegisterPage() {
  return (
    <Card className="shadow-xl border-slate-200/80 bg-white p-6 sm:p-8 max-w-lg mx-auto">
      {/* Header Badge & Title */}
      <div className="text-center space-y-3 mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary-50 text-secondary-600 mb-1 border border-secondary-100 shadow-xs">
          <ShieldCheck className="w-7 h-7 text-secondary-600" />
        </div>
        <div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wider font-inter mb-2">
            <Lock className="w-3 h-3 text-slate-500" />
            Institution-Managed Registry
          </span>
          <h1 className="font-poppins text-2xl font-bold text-slate-900 tracking-tight">
            Institutional Donor Registration
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 font-inter leading-relaxed max-w-md mx-auto">
          In accordance with ORBINOVA clinical safety and data integrity protocols, voluntary blood donors
          cannot independently self-register online.
        </p>
      </div>

      {/* Clinical Policy Notice Box */}
      <div className="p-4 rounded-2xl bg-secondary-50/70 border border-secondary-200/70 space-y-3 mb-6 font-inter text-xs text-secondary-900">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-secondary-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs">
              Why must donors be registered by a healthcare institution?
            </h4>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Every blood donation requires mandatory in-person clinical pre-screening, verified blood typing
              (ABO &amp; Rh status), infection markers screening, and physical fitness evaluation conducted by
              authorized medical officers.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-secondary-100 grid grid-cols-1 gap-2 text-[11px] text-slate-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Registration performed by verified hospital staff or blood banks</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Strict multi-tenant privacy safeguarding donor residential location</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Secure credentials issued directly to the donor upon hospital enrollment</span>
          </div>
        </div>
      </div>

      {/* How to Enroll as a Donor */}
      <div className="space-y-3 mb-6 font-inter">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          How to get registered:
        </h4>

        <div className="space-y-2">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-6 h-6 rounded-lg bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">Visit an Approved Facility</span>
              <span className="text-[11px] text-slate-500">
                Walk into any verified hospital or blood bank on the ORBINOVA network.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-6 h-6 rounded-lg bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">Complete Clinical Assessment</span>
              <span className="text-[11px] text-slate-500">
                A certified donor coordinator will verify your eligibility and record your blood group.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-6 h-6 rounded-lg bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">Receive Access Credentials</span>
              <span className="text-[11px] text-slate-500">
                The facility provisions your private donor portal credentials with your consent.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <Link href="/donor/login" className="block w-full">
          <Button variant="primary" size="md" className="w-full flex items-center justify-center gap-2">
            <span>Already registered by a hospital? Sign in</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>

        <div className="text-center">
          <Link
            href="/login"
            className="text-xs text-slate-500 hover:text-slate-800 font-inter transition-colors"
          >
            Hospital or Blood Bank Staff?{" "}
            <span className="text-secondary-600 font-bold underline">Staff Sign In</span>
          </Link>
        </div>
      </div>
    </Card>
  );
}
