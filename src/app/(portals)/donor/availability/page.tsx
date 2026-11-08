import React from "react";
import { redirect } from "next/navigation";
import { Clock, Info } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { donorService } from "@/services/donorService";
import { AvailabilitySelector } from "@/components/donor";
import { PageHeader } from "@/components/ui";

export default async function DonorAvailabilityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/donor/login");

  const donorContext = await donorService.getDonorContext(user.id);
  if (!donorContext) redirect("/donor");

  const currentStatus = donorContext.donorProfile.availability_status;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Donation Readiness & Availability"
        description="Control when you are ready to receive emergency and routine blood matching alerts."
      />

      {/* Main Selector */}
      <AvailabilitySelector currentStatus={currentStatus} />

      {/* Explanatory Guide */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 text-dark font-poppins font-bold text-sm">
          <Info className="w-4 h-4 text-blood-600" />
          <span>How SmartDonor Uses Your Availability</span>
        </div>
        <p className="text-xs text-slate-600 font-inter leading-relaxed">
          When an emergency blood request is broadcast by an accredited hospital or blood bank, our matching algorithm calculates compatibility, distance, and your real-time availability score. Marking yourself as <strong>Available</strong> ensures patients in critical conditions can be connected to you without delay.
        </p>
      </div>
    </div>
  );
}
