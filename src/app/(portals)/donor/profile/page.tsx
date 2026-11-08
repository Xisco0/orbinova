import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { donorService } from "@/services/donorService";
import { PageHeader } from "@/components/ui";
import { ProfileForm } from "./ProfileForm";

export default async function DonorProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/donor/login");

  const donorContext = await donorService.getDonorContext(user.id);
  if (!donorContext) redirect("/donor");

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Institutional Donor Record"
        description="View your verified personal details, registered blood group, and registering hospital affiliation."
      />

      <ProfileForm
        user={donorContext.user}
        donorProfile={donorContext.donorProfile}
        registeringOrganizationName={donorContext.registeringOrganizationName}
      />
    </div>
  );
}
