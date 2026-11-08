import React from "react";
import { getCurrentUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { SettingsClient } from "./SettingsClient";

export const revalidate = 0;

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Configurations"
        description="Manage and configure dashboard settings, role permissions, platform policies, and user access."
      />

      <SettingsClient user={user} />
    </div>
  );
}
