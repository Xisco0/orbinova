import React from "react";
import { redirect } from "next/navigation";
import { ShieldCheck, CheckCircle2, AlertCircle, Heart } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { donorService } from "@/services/donorService";
import { EligibilityBanner } from "@/components/donor";
import { PageHeader, Card } from "@/components/ui";

export default async function DonorEligibilityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/donor/login");

  const donorContext = await donorService.getDonorContext(user.id);
  if (!donorContext) redirect("/donor");

  const { donorProfile } = donorContext;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Donation Eligibility & Medical Guidelines"
        description="Review your current recorded eligibility status and healthcare screening criteria."
      />

      {/* Main Status & Clinical Disclaimer Banner */}
      <EligibilityBanner
        eligibilityStatus={donorProfile.eligibility_status}
        lastDonationDate={donorProfile.last_donation_date}
        nextEligibleDate={donorProfile.next_eligible_date}
      />

      {/* Standard Nigerian National Blood Service Guidelines */}
      <Card className="p-6 space-y-4 bg-white border-slate-200">
        <h3 className="font-poppins font-bold text-base text-dark flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-secondary-600" />
          <span>General Voluntary Blood Donation Criteria</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm font-inter">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-dark block">Age Requirement</strong>
              <span className="text-slate-600">Between 18 and 65 years old.</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-dark block">Body Weight</strong>
              <span className="text-slate-600">Minimum of 50 kg (110 lbs).</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-dark block">Donation Frequency Interval</strong>
              <span className="text-slate-600">90 days (3 months) between whole blood donations.</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-dark block">General Wellness</strong>
              <span className="text-slate-600">Feeling healthy, no active fever, cold, or acute infections.</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
