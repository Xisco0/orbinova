import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { DonorsClient } from "./DonorsClient";
import { hasPermission } from "@/lib/auth/rbac";

export const metadata = {
  title: "Manage Donors | Facility Donor Registry",
  description: "Register, monitor, verify, and manage voluntary blood donors at your facility.",
};

export default async function HospitalDonorsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const context = await hospitalService.getHospitalContext(user.id);
  if (!context) {
    redirect("/hospital/dashboard");
  }

  const canView =
    context.isOwner ||
    context.isManager ||
    hasPermission(user.profile?.role || "hospital", "donors.view", context.membership.member_role) ||
    hasPermission(user.profile?.role || "hospital", "donors.view_records", context.membership.member_role);

  if (!canView) {
    redirect("/hospital/dashboard");
  }

  const donors = await hospitalService.getHospitalDonors(context.organization.id);

  const canManage =
    context.isOwner ||
    context.isManager ||
    hasPermission(user.profile?.role || "hospital", "donors.register", context.membership.member_role);

  return (
    <div className="space-y-6">
      <DonorsClient
        donors={donors}
        canManage={canManage}
        organizationId={context.organization.id}
        organizationType={context.organization.organization_type}
        organizationName={context.organization.name}
      />
    </div>
  );
}
