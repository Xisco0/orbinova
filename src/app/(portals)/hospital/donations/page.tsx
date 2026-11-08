import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { PageHeader } from "@/components/ui";
import { DonationsClient } from "./DonationsClient";

export default async function HospitalDonationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await hospitalService.getHospitalContext(user.id);
  if (!context) redirect("/hospital");

  const donations = await hospitalService.getDonations(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Donations & Collection Ledger"
        description="Manage and record certified blood donations collected at your healthcare facility."
      />

      <DonationsClient donations={donations} />
    </div>
  );
}
