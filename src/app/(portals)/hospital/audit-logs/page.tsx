import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { getRolePermissions } from "@/lib/auth/rbac";
import { centralizedAuditService } from "@/services/centralizedAuditService";
import { AuditLogsClient } from "./AuditLogsClient";

export const revalidate = 0;

export default async function HospitalAuditLogsPage() {
  const user = await getCurrentUser("hospital");
  if (!user || !user.profile?.is_active) {
    redirect("/login");
  }

  // 1. Resolve organization context
  const orgContext = await hospitalService.getHospitalContext(user.id);
  if (!orgContext || !orgContext.organization) {
    redirect("/hospital/dashboard");
  }

  const memberRole = orgContext.membership.member_role;
  const isOwner = orgContext.isOwner || memberRole === "owner";

  // 2. Strict Role & Ownership Authorization Guard:
  // Hospital Administrators, Donor Coordinators, Clinical Staff, Radiologists cannot access audit logs by default!
  const permissions = getRolePermissions(
    user.profile.role,
    memberRole,
    (orgContext.membership as any)?.permissions as string[] | undefined
  );

  const canAccessAudit = isOwner || permissions.includes("audit_logs.view");
  if (!canAccessAudit) {
    redirect("/hospital/dashboard");
  }

  // 3. Fetch initial scoped audit logs (strictly this organization)
  const orgId = orgContext.organization.id;
  const initialLogsResult = await centralizedAuditService.getLogsForOrganization(orgId, {
    page: 1,
    pageSize: 15,
  });

  const initialMetrics = centralizedAuditService.getAuditMetrics(orgId);

  return (
    <AuditLogsClient
      organizationId={orgId}
      organizationName={orgContext.organization.name}
      organizationType={orgContext.organization.organization_type}
      isOwner={isOwner}
      initialLogs={initialLogsResult.data}
      initialTotalCount={initialLogsResult.totalCount}
      initialTotalPages={initialLogsResult.totalPages}
      initialMetrics={initialMetrics}
    />
  );
}
