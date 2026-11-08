import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { centralizedAuditService } from "@/services/centralizedAuditService";
import { KNOWN_ORGANIZATIONS } from "@/services/facilityRelationships";
import { AdminAuditLogsClient } from "./AdminAuditLogsClient";

export const revalidate = 0;

export default async function AuditLogsPage() {
  const user = await getCurrentUser("admin");
  if (!user || user.profile?.role !== "admin" || !user.profile?.is_active) {
    redirect("/login");
  }

  // Initial platform-wide logs
  const initialLogsResult = await centralizedAuditService.getLogsForSuperAdmin({
    page: 1,
    pageSize: 15,
  });

  const initialMetrics = centralizedAuditService.getAuditMetrics();

  return (
    <AdminAuditLogsClient
      initialLogs={initialLogsResult.data}
      initialTotalCount={initialLogsResult.totalCount}
      initialTotalPages={initialLogsResult.totalPages}
      initialMetrics={initialMetrics}
      knownOrganizations={KNOWN_ORGANIZATIONS}
    />
  );
}
