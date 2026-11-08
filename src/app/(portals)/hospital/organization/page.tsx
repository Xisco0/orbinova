import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { PageHeader } from "@/components/ui";
import { OrgProfileClient } from "./OrgProfileClient";

export default async function HospitalOrgPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await hospitalService.getHospitalContext(user.id);
  if (!context) redirect("/hospital");

  // Route Guard: Facility Profile restricted to Facility Owner and Managers
  if (!context.isOwner && !context.isManager) {
    redirect("/hospital/dashboard");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facility Profile & Accreditation"
        description="Manage hospital registration, licensing, and contact details."
      />

      <OrgProfileClient
        organization={context.organization}
        canManage={context.isManager}
      />
    </div>
  );
}
