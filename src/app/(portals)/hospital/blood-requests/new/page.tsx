import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { hasPermission } from "@/lib/auth/rbac";
import { BloodRequestForm } from "@/components/hospital";
import { PageHeader } from "@/components/ui";

export default async function HospitalNewBloodRequestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await hospitalService.getHospitalContext(user.id);
  if (!context) redirect("/hospital");

  // Route Guard: Creating blood requests requires blood_requests.create clearance
  const canCreate =
    context.isOwner ||
    context.isManager ||
    hasPermission(user.profile?.role, "blood_requests.create", context.membership.member_role);
  if (!canCreate) {
    redirect("/hospital/dashboard");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/hospital/blood-requests"
        className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-dark transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Blood Requests</span>
      </Link>

      <PageHeader
        title="New Blood Request"
        description="Submit a patient transfusion requirement for multi-tier inventory allocation and voluntary donor matching."
      />

      <BloodRequestForm />
    </div>
  );
}
