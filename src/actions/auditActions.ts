"use server";

import { getCurrentUser } from "@/lib/supabase/server";
import { centralizedAuditService, StoredAuditLog } from "@/services/centralizedAuditService";
import { KNOWN_ORGANIZATIONS } from "@/services/facilityRelationships";
import { getRolePermissions } from "@/lib/auth/rbac";
import { UserRole } from "@/types/database";
import { hospitalService } from "@/services/hospitalService";

/**
 * Ensures authenticated institutional Owner or authorized staff clearance for Hospital/Blood Bank audit logs
 */
async function requireInstitutionalAuditClearance() {
  const user = await getCurrentUser("hospital");
  if (!user || !user.profile?.is_active) {
    throw new Error("Unauthorized: Please sign in to access institutional audit logs.");
  }

  // Resolve organization context
  const orgContext = await hospitalService.getHospitalContext(user.id);
  if (!orgContext || !orgContext.organization) {
    throw new Error("Forbidden: You are not assigned to an active institution.");
  }

  const memberRole = orgContext.membership.member_role;
  const isOwner = orgContext.isOwner || memberRole === "owner";

  // Check role-based permissions
  const permissions = getRolePermissions(
    user.profile.role,
    memberRole,
    (orgContext.membership as any)?.permissions as string[] | undefined
  );

  const canViewAudit = isOwner || permissions.includes("audit_logs.view");
  if (!canViewAudit) {
    throw new Error(
      "Access Denied: Only the Institution Owner (or explicitly delegated auditors) can access institutional audit logs."
    );
  }

  return {
    user,
    organization: orgContext.organization,
    isOwner,
    memberRole,
  };
}

/**
 * Ensures authenticated Super Admin clearance for platform-wide audit logs
 */
async function requireSuperAdminAuditClearance() {
  const user = await getCurrentUser("admin");
  if (!user || user.profile?.role !== "admin" || !user.profile?.is_active) {
    throw new Error("Unauthorized: Platform administrator clearance required.");
  }
  return user;
}

/**
 * Fetches institutional audit logs for the authenticated Hospital or Blood Bank Owner
 * Multi-Tenant Enforced: Strictly scoped to the caller's institution ID derived from session.
 */
export async function getHospitalAuditLogsAction(filters?: {
  search?: string;
  category?: string;
  action?: string;
  role?: string;
  entityType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    const { organization } = await requireInstitutionalAuditClearance();

    // STRICT MULTI-TENANT ISOLATION: The organization ID is derived securely from the backend session
    const logsResult = await centralizedAuditService.getLogsForOrganization(organization.id, filters);
    const metrics = centralizedAuditService.getAuditMetrics(organization.id);

    return {
      success: true,
      logs: logsResult.data,
      totalCount: logsResult.totalCount,
      page: logsResult.page,
      pageSize: logsResult.pageSize,
      totalPages: logsResult.totalPages,
      metrics,
      organizationName: organization.name,
      organizationType: organization.organization_type,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to load institutional audit logs.",
      logs: [],
      totalCount: 0,
      page: 1,
      pageSize: 15,
      totalPages: 0,
    };
  }
}

/**
 * Fetches platform-wide audit logs for the Super Administrator
 */
export async function getAdminAuditLogsAction(filters?: {
  organizationId?: string;
  search?: string;
  category?: string;
  action?: string;
  role?: string;
  entityType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    await requireSuperAdminAuditClearance();

    const logsResult = await centralizedAuditService.getLogsForSuperAdmin(filters);
    const metrics = centralizedAuditService.getAuditMetrics(
      filters?.organizationId && filters.organizationId !== "all" ? filters.organizationId : undefined
    );

    return {
      success: true,
      logs: logsResult.data,
      totalCount: logsResult.totalCount,
      page: logsResult.page,
      pageSize: logsResult.pageSize,
      totalPages: logsResult.totalPages,
      metrics,
      knownOrganizations: KNOWN_ORGANIZATIONS,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to load platform audit logs.",
      logs: [],
      totalCount: 0,
      page: 1,
      pageSize: 15,
      totalPages: 0,
      knownOrganizations: KNOWN_ORGANIZATIONS,
    };
  }
}

/**
 * Exports audit logs as a downloadable CSV
 * Audits the export action itself for complete accountability.
 */
export async function exportAuditLogsAction(scope: "hospital" | "admin", filters?: Record<string, string>) {
  try {
    let logs: StoredAuditLog[] = [];
    let actorId = "";
    let actorOrgId = "";
    let exportScopeName = "";

    if (scope === "hospital") {
      const { user, organization } = await requireInstitutionalAuditClearance();
      actorId = user.id;
      actorOrgId = organization.id;
      exportScopeName = organization.name;

      // Strictly query this hospital's records (page: 1, pageSize: 10000 to get full dataset)
      const res = await centralizedAuditService.getLogsForOrganization(organization.id, {
        ...filters,
        page: 1,
        pageSize: 10000,
      });
      logs = res.data;
    } else {
      const user = await requireSuperAdminAuditClearance();
      actorId = user.id;
      exportScopeName = "Platform Wide";

      const res = await centralizedAuditService.getLogsForSuperAdmin({
        ...filters,
        page: 1,
        pageSize: 10000,
      });
      logs = res.data;
    }

    const csvData = centralizedAuditService.exportToCsv(logs);
    const filename = `orbinova_audit_${scope}_${new Date().toISOString().slice(0, 10)}.csv`;

    // Audit the export action itself
    await centralizedAuditService.record({
      userId: actorId,
      organizationId: actorOrgId || null,
      action: "AUDIT_LOGS_EXPORTED",
      category: "system_security",
      entityType: "audit_logs",
      description: `Exported ${logs.length} audit records (${exportScopeName}) to CSV format`,
      status: "success",
      metadata: {
        recordsCount: logs.length,
        exportScope: scope,
        filename,
        appliedFilters: filters || null,
      },
    });

    return {
      success: true,
      csvData,
      filename,
      recordsCount: logs.length,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to export audit logs.",
    };
  }
}

/**
 * Verifies the cryptographic tamper-evident hash chain
 */
export async function verifyAuditChainAction() {
  try {
    const report = centralizedAuditService.verifyChainIntegrity();
    return {
      success: true,
      report,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}
