import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { donorService } from "@/services/donorService";
import { PageHeader } from "@/components/ui";
import { SettingsClient } from "./SettingsClient";

export default async function DonorSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/donor/login");

  const donorContext = await donorService.getDonorContext(user.id);
  if (!donorContext) redirect("/donor");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Settings"
        description="Manage your personal credentials, communication preferences, and security."
      />

      <SettingsClient
        user={donorContext.user}
        donorProfile={donorContext.donorProfile}
      />
    </div>
  );
}
