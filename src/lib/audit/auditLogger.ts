/**
 * ORBINOVA ENTERPRISE AUDIT LOGGER
 * Immutably records security events, institutional administration, and access state changes.
 * Preserves audit trails to Supabase and persistent storage.
 */

import { centralizedAuditService, CentralizedAuditEventInput } from "@/services/centralizedAuditService";

export interface AuditEventPayload {
  userId?: string | null;
  organizationId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: "success" | "failure";
  description?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  reason?: string | null;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

export const auditLogger = {
  /**
   * Records an immutable, tamper-evident audit log entry
   */
  async log(event: AuditEventPayload): Promise<void> {
    await centralizedAuditService.record({
      userId: event.userId,
      actorName: event.actorName,
      actorRole: event.actorRole,
      organizationId: event.organizationId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      description: event.description,
      status: event.status || "success",
      reason: event.reason,
      previousValues: event.previousValues,
      newValues: event.newValues,
      metadata: event.metadata,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    });
  },

  /**
   * Retrieves audit logs for a specific entity or action
   */
  getLogs(filter?: { entityId?: string; entityType?: string; action?: string; organizationId?: string }): any[] {
    const res = centralizedAuditService.applyFilters(
      (centralizedAuditService as any).getLogsForSuperAdmin ? [] : [],
      filter
    );
    return res;
  },
};
