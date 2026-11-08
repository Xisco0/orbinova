import fs from "fs";
import path from "path";
import { BloodGroupCode, CompatibilityType } from "@/types/database";

export type BloodTestingStatus = "untested" | "tested_safe" | "quarantined" | "discarded";
export type BloodUnitStatus = "available" | "reserved" | "issued" | "transfused" | "expired" | "discarded";

export interface PhysicalBloodUnit {
  id: string;
  unit_number: string; // Donation Identification Number (DIN) / Barcode
  organization_id: string; // The single holding facility that owns the physical unit
  blood_group: BloodGroupCode;
  rh_factor: "+" | "-";
  component_type: CompatibilityType;
  collection_date: string;
  expiry_date: string;
  testing_status: BloodTestingStatus;
  status: BloodUnitStatus;
  storage_location?: string | null;
  current_reservation_id?: string | null;
  donation_id?: string | null;
  donor_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const BLOOD_UNITS_FILE = path.join(DATA_DIR, "blood_units.json");

function ensureStoreDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function readUnits(): Record<string, PhysicalBloodUnit> {
  ensureStoreDir();
  if (!fs.existsSync(BLOOD_UNITS_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(BLOOD_UNITS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeUnits(data: Record<string, PhysicalBloodUnit>) {
  ensureStoreDir();
  try {
    fs.writeFileSync(BLOOD_UNITS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write physical blood units store:", e);
  }
}

export const bloodUnitStore = {
  /**
   * Generates a unique Donation Identification Number (DIN)
   * Format: NG-DIN-<YEAR>-<PREFIX>-<RANDOM>
   */
  generateDIN(prefix: string = "ORB"): string {
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `NG-DIN-${year}-${prefix.substring(0, 4).toUpperCase()}-${rand}`;
  },

  /**
   * Registers a new physical blood unit with strict validation.
   */
  registerUnit(unitData: Omit<PhysicalBloodUnit, "id" | "created_at" | "updated_at">): PhysicalBloodUnit {
    const all = readUnits();

    // 1. Enforce unique DIN (unit_number)
    const existing = Object.values(all).find((u) => u.unit_number === unitData.unit_number);
    if (existing) {
      throw new Error(`Data Integrity Error: Blood unit with DIN '${unitData.unit_number}' already exists in inventory.`);
    }

    // 2. Validate dates
    const collTime = new Date(unitData.collection_date).getTime();
    const expTime = new Date(unitData.expiry_date).getTime();
    if (isNaN(collTime) || isNaN(expTime)) {
      throw new Error("Data Integrity Error: Invalid collection or expiry date format.");
    }
    if (expTime <= collTime) {
      throw new Error("Data Integrity Error: Expiry date must be strictly after collection date.");
    }

    // 3. Verify single owner requirement
    if (!unitData.organization_id) {
      throw new Error("Data Integrity Error: Every physical blood unit must have exactly one inventory owner facility.");
    }

    const id = `unit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();

    // Auto-check expiry
    const isExpired = expTime < Date.now();
    const finalStatus: BloodUnitStatus = isExpired
      ? "expired"
      : unitData.status || "available";

    const newUnit: PhysicalBloodUnit = {
      ...unitData,
      id,
      status: finalStatus,
      created_at: nowIso,
      updated_at: nowIso,
    };

    all[id] = newUnit;
    writeUnits(all);
    return newUnit;
  },

  /**
   * Retrieves a unit by ID or DIN
   */
  getUnit(idOrDin: string): PhysicalBloodUnit | undefined {
    const all = readUnits();
    if (all[idOrDin]) return all[idOrDin];
    return Object.values(all).find((u) => u.unit_number === idOrDin);
  },

  /**
   * Retrieves all units owned by an institution
   */
  getUnitsByOrg(
    orgId: string,
    filter?: {
      bloodGroup?: BloodGroupCode;
      status?: BloodUnitStatus;
      testingStatus?: BloodTestingStatus;
    }
  ): PhysicalBloodUnit[] {
    const all = readUnits();
    return Object.values(all).filter((u) => {
      if (u.organization_id !== orgId) return false;
      if (filter?.bloodGroup && u.blood_group !== filter.bloodGroup) return false;
      if (filter?.status && u.status !== filter.status) return false;
      if (filter?.testingStatus && u.testing_status !== filter.testingStatus) return false;
      return true;
    });
  },

  /**
   * Atomically reserves specific physical blood units for a blood request.
   * Prohibits reserving expired, quarantined, or discarded units.
   */
  reserveUnits(
    orgId: string,
    bloodGroup: BloodGroupCode,
    quantity: number,
    reservationId: string
  ): PhysicalBloodUnit[] {
    if (quantity <= 0) {
      throw new Error(`Data Integrity Error: Reservation quantity must be greater than zero. Received: ${quantity}`);
    }

    const all = readUnits();
    const now = Date.now();

    // Find eligible units:
    // 1. Owned by orgId
    // 2. Matching blood group
    // 3. Status is available
    // 4. Testing status is tested_safe
    // 5. Expiry date > now
    const eligibleUnits = Object.values(all).filter((u) => {
      if (u.organization_id !== orgId) return false;
      if (u.blood_group !== bloodGroup) return false;
      if (u.status !== "available") return false;
      if (u.testing_status !== "tested_safe") return false;
      if (new Date(u.expiry_date).getTime() <= now) return false;
      return true;
    });

    if (eligibleUnits.length < quantity) {
      throw new Error(
        `Data Integrity Error: Insufficient safe available physical blood units for ${bloodGroup} at institution ${orgId}. Requested: ${quantity}, Available Safe: ${eligibleUnits.length}`
      );
    }

    const reservedList: PhysicalBloodUnit[] = [];
    const nowIso = new Date().toISOString();

    for (let i = 0; i < quantity; i++) {
      const unit = eligibleUnits[i];
      unit.status = "reserved";
      unit.current_reservation_id = reservationId;
      unit.updated_at = nowIso;
      all[unit.id] = unit;
      reservedList.push(unit);
    }

    writeUnits(all);
    return reservedList;
  },

  /**
   * Confirms issuance of reserved units.
   */
  issueUnits(reservationId: string): PhysicalBloodUnit[] {
    const all = readUnits();
    const nowIso = new Date().toISOString();
    const issuedUnits: PhysicalBloodUnit[] = [];

    for (const unit of Object.values(all)) {
      if (unit.current_reservation_id === reservationId && unit.status === "reserved") {
        unit.status = "issued";
        unit.updated_at = nowIso;
        issuedUnits.push(unit);
        all[unit.id] = unit;
      }
    }

    if (issuedUnits.length > 0) {
      writeUnits(all);
    }

    return issuedUnits;
  },

  /**
   * Releases units back to available (e.g., reservation expired or cancelled)
   */
  releaseReservation(reservationId: string): PhysicalBloodUnit[] {
    const all = readUnits();
    const nowIso = new Date().toISOString();
    const now = Date.now();
    const released: PhysicalBloodUnit[] = [];

    for (const unit of Object.values(all)) {
      if (unit.current_reservation_id === reservationId && unit.status === "reserved") {
        const isExpired = new Date(unit.expiry_date).getTime() <= now;
        unit.status = isExpired ? "expired" : "available";
        unit.current_reservation_id = null;
        unit.updated_at = nowIso;
        released.push(unit);
        all[unit.id] = unit;
      }
    }

    if (released.length > 0) {
      writeUnits(all);
    }

    return released;
  },

  /**
   * Quarantines or discards a physical unit (e.g. testing anomaly or contamination)
   */
  quarantineUnit(idOrDin: string, reason: string): PhysicalBloodUnit {
    const all = readUnits();
    const unit = Object.values(all).find((u) => u.id === idOrDin || u.unit_number === idOrDin);
    if (!unit) {
      throw new Error(`Data Integrity Error: Unit '${idOrDin}' not found.`);
    }

    unit.testing_status = "quarantined";
    unit.notes = `${unit.notes || ""} [QUARANTINE: ${reason}]`.trim();
    unit.updated_at = new Date().toISOString();
    all[unit.id] = unit;
    writeUnits(all);
    return unit;
  },

  /**
   * Validates whether a unit can be safely transfused or issued.
   */
  assertUnitSafety(unit: PhysicalBloodUnit): void {
    if (unit.testing_status !== "tested_safe") {
      throw new Error(`Data Integrity Violation: Blood unit ${unit.unit_number} has unsafe testing status '${unit.testing_status}'.`);
    }
    if (new Date(unit.expiry_date).getTime() <= Date.now()) {
      throw new Error(`Data Integrity Violation: Blood unit ${unit.unit_number} expired on ${unit.expiry_date}.`);
    }
  },

  /**
   * Returns count of physical units in all stores.
   */
  getAll(): Record<string, PhysicalBloodUnit> {
    return readUnits();
  },
};
