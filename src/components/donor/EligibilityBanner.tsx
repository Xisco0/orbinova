import React from "react";
import { ShieldAlert, ShieldCheck, Info, Calendar, HeartPulse } from "lucide-react";
import { DonorEligibility } from "@/types/database";

interface EligibilityBannerProps {
  eligibilityStatus: DonorEligibility;
  lastDonationDate?: string | null;
  nextEligibleDate?: string | null;
}

const statusConfigs: Record<
  DonorEligibility,
  {
    title: string;
    description: string;
    badge: string;
    variant: "success" | "warning" | "danger" | "info";
    icon: typeof ShieldCheck;
  }
> = {
  eligible: {
    title: "You are Eligible to Donate",
    description:
      "Based on your recorded history, you meet the standard time intervals required between blood donations.",
    badge: "Eligible",
    variant: "success",
    icon: ShieldCheck,
  },
  temporarily_ineligible: {
    title: "Temporarily Ineligible (Recovery Period)",
    description:
      "You recently donated blood or have an active temporary recovery period. Whole blood donations require a minimum 90-day rest interval to replenish iron stores.",
    badge: "Rest Period Active",
    variant: "warning",
    icon: Calendar,
  },
  permanently_ineligible: {
    title: "Permanently Ineligible",
    description:
      "A medical or health condition prevents blood donation. We deeply appreciate your support for healthcare awareness.",
    badge: "Ineligible",
    variant: "danger",
    icon: ShieldAlert,
  },
  pending_verification: {
    title: "Verification in Progress",
    description:
      "Your donor profile is awaiting initial verification. You can still complete your profile and set your readiness.",
    badge: "Pending",
    variant: "info",
    icon: Info,
  },
};

export function EligibilityBanner({
  eligibilityStatus,
  lastDonationDate,
  nextEligibleDate,
}: EligibilityBannerProps) {
  const config = statusConfigs[eligibilityStatus] || statusConfigs.eligible;
  const Icon = config.icon;

  const bgStyles = {
    success: "bg-emerald-50/90 border-emerald-200 text-emerald-950",
    warning: "bg-amber-50/90 border-amber-200 text-amber-950",
    danger: "bg-rose-50/90 border-rose-200 text-rose-950",
    info: "bg-blue-50/90 border-blue-200 text-blue-950",
  }[config.variant];

  const badgeStyles = {
    success: "bg-emerald-600 text-white",
    warning: "bg-amber-600 text-white",
    danger: "bg-rose-600 text-white",
    info: "bg-blue-600 text-white",
  }[config.variant];

  return (
    <div className="space-y-6">
      {/* Main Status Banner */}
      <div className={`p-6 rounded-2xl border ${bgStyles} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${badgeStyles}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-poppins font-bold text-lg">{config.title}</h3>
              <p className="text-xs opacity-80 uppercase tracking-wider font-inter">
                Eligibility Tier
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${badgeStyles}`}
          >
            {config.badge}
          </span>
        </div>

        <p className="text-xs sm:text-sm leading-relaxed font-inter opacity-90">
          {config.description}
        </p>

        {/* Donation Timeline Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-black/10">
          <div className="bg-white/80 p-3 rounded-xl border border-black/5">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
              Last Recorded Donation
            </span>
            <span className="text-sm font-bold text-dark font-poppins">
              {lastDonationDate
                ? new Date(lastDonationDate).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "None recorded yet"}
            </span>
          </div>

          <div className="bg-white/80 p-3 rounded-xl border border-black/5">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
              Next Eligible Donation Date
            </span>
            <span className="text-sm font-bold text-dark font-poppins">
              {nextEligibleDate
                ? new Date(nextEligibleDate).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Immediate (Eligible now)"}
            </span>
          </div>
        </div>
      </div>

      {/* Mandatory Clinical Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-600 font-inter leading-relaxed">
        <HeartPulse className="w-5 h-5 text-blood-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-dark block">
            Medical & Clinical Disclaimer:
          </strong>
          <span>
            Final donation eligibility is determined on-site by certified healthcare professionals and blood bank staff during your physical screening (hemoglobin test, blood pressure, and wellness check). SmartDonor does not perform clinical diagnosis.
          </span>
        </div>
      </div>
    </div>
  );
}
