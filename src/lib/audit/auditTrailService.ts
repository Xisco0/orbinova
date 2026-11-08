import fs from "fs";
import path from "path";
import crypto from "crypto";
import { auditLogger, AuditEventPayload } from "../audit/auditLogger";

export interface AuditTrailEntry {
  id: string;
  transaction_id: string;
  actor_id: string;
  organization_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  reason?: string | null;
  ip_address?: string | null;
  created_at: string;
  checksum: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DETAILED_AUDIT_FILE = path.join(DATA_DIR, "detailed_audit_trail.json");

function ensureStoreDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function readAuditTrail(): AuditTrailEntry[] {
  ensureStoreDir();
  if (!fs.existsSync(DETAILED_AUDIT_FILE)) return [];
  try {
    const raw = fs.readFileSync(DETAILED_AUDIT_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAuditTrail(logs: AuditTrailEntry[]) {
  ensureStoreDir();
  try {
    fs.writeFileSync(DETAILED_AUDIT_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write detailed audit trail:", e);
  }
}

/**
 * Strips confidential credentials before recording state changes
 */
function sanitizeState(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeState);

  const clean: Record<string, any> = {};
  const REDACTED_KEYS = new Set([
    "password",
    "temporarypassword",
    "passwordhash",
    "token",
    "resettokan",
    "sessionversion",
    "secret",
  ]);

  for (const [key, value] of Object.entries(obj)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitizeState(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function computeChecksum(entry: Omit<AuditTrailEntry, "checksum">): string {
  const payload = `${entry.id}|${entry.transaction_id}|${entry.actor_id}|${entry.organization_id}|${entry.action}|${entry.entity_type}|${entry.entity_id}|${entry.created_at}|${JSON.stringify(entry.previous_state)}|${JSON.stringify(entry.new_state)}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export const auditTrailService = {
  /**
   * Tamper-evident recording of critical system mutations
   */
  async recordMutation(params: {
    actorId: string;
    organizationId: string;
    action: string;
    entityType: string;
    entityId: string;
    previousState?: Record<string, unknown> | null;
    newState?: Record<string, unknown> | null;
    reason?: string | null;
    transactionId?: string | null;
    ipAddress?: string | null;
  }): Promise<AuditTrailEntry> {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const txId = params.transactionId || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const sanitizedPrev = sanitizeState(params.previousState || null);
    const sanitizedNext = sanitizeState(params.newState || null);

    const baseEntry: Omit<AuditTrailEntry, "checksum"> = {
      id,
      transaction_id: txId,
      actor_id: params.actorId,
      organization_id: params.organizationId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      previous_state: sanitizedPrev,
      new_state: sanitizedNext,
      reason: params.reason || null,
      ip_address: params.ipAddress || null,
      created_at: nowIso,
    };

    const checksum = computeChecksum(baseEntry);
    const fullEntry: AuditTrailEntry = { ...baseEntry, checksum };

    // 1. Store in detailed tamper-evident audit ledger
    const trail = readAuditTrail();
    trail.unshift(fullEntry);
    writeAuditTrail(trail);

    // 2. Also forward to global auditLogger
    await auditLogger.log({
      userId: params.actorId,
      organizationId: params.organizationId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: {
        transactionId: txId,
        reason: params.reason,
        checksum,
      },
      ipAddress: params.ipAddress,
    });

    return fullEntry;
  },

  /**
   * Verifies the tamper-evident integrity of the audit trail
   */
  verifyAuditIntegrity(): { isValid: boolean; corruptedCount: number } {
    const trail = readAuditTrail();
    let corruptedCount = 0;

    for (const entry of trail) {
      const { checksum, ...rest } = entry;
      const expected = computeChecksum(rest);
      if (checksum !== expected) {
        corruptedCount++;
      }
    }

    return {
      isValid: corruptedCount === 0,
      corruptedCount,
    };
  },

  /**
   * Retrieves mutations by entity ID
   */
  getByEntity(entityId: string): AuditTrailEntry[] {
    const trail = readAuditTrail();
    return trail.filter((e) => e.entity_id === entityId);
  },

  /**
   * Retrieves mutations by organization ID
   */
  getByOrg(orgId: string): AuditTrailEntry[] {
    const trail = readAuditTrail();
    return trail.filter((e) => e.organization_id === orgId);
  },
};
