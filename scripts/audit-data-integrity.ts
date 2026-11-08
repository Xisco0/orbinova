/**
 * ORBINOVA DATA INTEGRITY AUDITOR
 * Scans all persistent data stores and reports any integrity, consistency, or relationship anomalies.
 */

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");

function readJsonFile<T>(filename: string, fallback: T): T {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch (err) {
    console.error(`Failed to parse ${filename}:`, err);
    return fallback;
  }
}

export interface AuditAnomaly {
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  recordId: string;
  description: string;
  details?: any;
}

export function runDataAudit(): { totalRecordsChecked: number; anomalies: AuditAnomaly[] } {
  const anomalies: AuditAnomaly[] = [];
  let totalRecordsChecked = 0;

  // 1. Audit Blood Inventory
  const inventory = readJsonFile<Record<string, any>>("blood_inventory.json", {});
  const inventoryKeys = Object.keys(inventory);
  totalRecordsChecked += inventoryKeys.length;

  for (const [key, item] of Object.entries(inventory)) {
    if (!item.organization_id) {
      anomalies.push({
        category: "INVENTORY",
        severity: "CRITICAL",
        recordId: key,
        description: "Inventory item missing organization_id association.",
      });
    }

    const qty = Number(item.quantity) || 0;
    const reserved = Number(item.reserved_quantity) || 0;
    const available = Number(item.available_quantity) || 0;

    if (qty < 0) {
      anomalies.push({
        category: "INVENTORY",
        severity: "CRITICAL",
        recordId: key,
        description: `Negative total quantity detected: ${qty}`,
        details: item,
      });
    }

    if (reserved < 0) {
      anomalies.push({
        category: "INVENTORY",
        severity: "CRITICAL",
        recordId: key,
        description: `Negative reserved quantity detected: ${reserved}`,
        details: item,
      });
    }

    if (reserved > qty) {
      anomalies.push({
        category: "INVENTORY",
        severity: "HIGH",
        recordId: key,
        description: `Over-reservation detected: reserved (${reserved}) > total quantity (${qty})`,
        details: item,
      });
    }

    if (available !== Math.max(0, qty - reserved)) {
      anomalies.push({
        category: "INVENTORY",
        severity: "MEDIUM",
        recordId: key,
        description: `Inconsistent available_quantity: stored ${available}, calculated ${Math.max(0, qty - reserved)}`,
        details: item,
      });
    }
  }

  // 2. Audit Blood Requests
  const requests = readJsonFile<Record<string, any>>("blood_requests.json", {});
  const requestKeys = Object.keys(requests);
  totalRecordsChecked += requestKeys.length;

  for (const [id, req] of Object.entries(requests)) {
    if (!req.organization_id && !req.hospital_id) {
      anomalies.push({
        category: "BLOOD_REQUESTS",
        severity: "CRITICAL",
        recordId: id,
        description: "Blood request record missing institutional owner.",
      });
    }

    const required = Number(req.units_required) || 0;
    const fulfilled = Number(req.units_fulfilled) || 0;

    if (required <= 0) {
      anomalies.push({
        category: "BLOOD_REQUESTS",
        severity: "HIGH",
        recordId: id,
        description: `Invalid units_required: ${required} (must be > 0)`,
      });
    }

    if (fulfilled < 0) {
      anomalies.push({
        category: "BLOOD_REQUESTS",
        severity: "CRITICAL",
        recordId: id,
        description: `Negative units_fulfilled: ${fulfilled}`,
      });
    }

    if (fulfilled > required) {
      anomalies.push({
        category: "BLOOD_REQUESTS",
        severity: "HIGH",
        recordId: id,
        description: `Over-fulfilled request: units_fulfilled (${fulfilled}) > units_required (${required})`,
      });
    }
  }

  // 3. Audit Blood Reservations
  const reservations = readJsonFile<Record<string, any>>("blood_reservations.json", {});
  const reservationKeys = Object.keys(reservations);
  totalRecordsChecked += reservationKeys.length;

  for (const [id, res] of Object.entries(reservations)) {
    const reqId = res.blood_request_id || res.bloodRequestId;
    const srcOrgId = res.source_organization_id || res.sourceOrgId;
    const reqOrgId = res.requesting_hospital_id || res.requestingHospitalId;

    if (!srcOrgId) {
      anomalies.push({
        category: "RESERVATIONS",
        severity: "CRITICAL",
        recordId: id,
        description: "Reservation missing source_organization_id.",
      });
    }

    if (!reqOrgId) {
      anomalies.push({
        category: "RESERVATIONS",
        severity: "CRITICAL",
        recordId: id,
        description: "Reservation missing requesting_hospital_id.",
      });
    }

    if (res.quantity <= 0) {
      anomalies.push({
        category: "RESERVATIONS",
        severity: "HIGH",
        recordId: id,
        description: `Invalid reservation quantity: ${res.quantity} (must be > 0)`,
      });
    }

    // Check if target blood request exists
    if (reqId && !requests[reqId]) {
      anomalies.push({
        category: "RESERVATIONS",
        severity: "MEDIUM",
        recordId: id,
        description: `Orphaned reservation: references non-existent blood_request_id ${reqId}`,
      });
    }
  }

  // 4. Audit Staff Roster
  const staffRoster = readJsonFile<Record<string, any>>("staff_roster.json", {});
  totalRecordsChecked += Object.keys(staffRoster).length;

  const emailsSeen = new Set<string>();
  for (const [key, staff] of Object.entries(staffRoster)) {
    if (!staff.userId) {
      anomalies.push({
        category: "STAFF_ROSTER",
        severity: "CRITICAL",
        recordId: key,
        description: "Staff member missing valid userId.",
      });
    }

    if (!staff.organizationId) {
      anomalies.push({
        category: "STAFF_ROSTER",
        severity: "CRITICAL",
        recordId: key,
        description: "Staff member missing organizationId association.",
      });
    }

    if (staff.email) {
      const normalized = staff.email.toLowerCase();
      if (emailsSeen.has(normalized)) {
        anomalies.push({
          category: "STAFF_ROSTER",
          severity: "MEDIUM",
          recordId: key,
          description: `Duplicate email entry in staff roster: ${normalized}`,
        });
      } else {
        emailsSeen.add(normalized);
      }
    }
  }

  return { totalRecordsChecked, anomalies };
}

// CLI execution
if (require.main === module) {
  console.log("================================================================================");
  console.log("ORBINOVA — DATA INTEGRITY AUDIT EXECUTION");
  console.log("================================================================================\n");

  const result = runDataAudit();
  console.log(`Audited ${result.totalRecordsChecked} total records across stores.`);
  console.log(`Detected ${result.anomalies.length} total anomalies.`);

  if (result.anomalies.length > 0) {
    console.log("\nDetected Anomalies:");
    for (const a of result.anomalies) {
      console.log(`  [${a.severity}] [${a.category}] Record ${a.recordId}: ${a.description}`);
    }
  } else {
    console.log("\n  ✓ [PASS] All stores and records satisfy data integrity rules with zero anomalies.");
  }
}
