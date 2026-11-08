import fs from "fs";
import path from "path";
import { BloodGroupCode, RequestUrgency, RequestStatus, BloodRequest } from "@/types/database";
import { reservationStore } from "./reservationStore";

export interface StoredBloodRequestRecord {
  id: string;
  organization_id: string;
  hospital_id?: string;
  requested_by: string;
  blood_group: BloodGroupCode;
  units_required: number;
  units_fulfilled: number; // Strictly confirmed received / fulfilled units
  // Independent Multi-Stage Status Tracking (ORBINOVA Status & Fulfillment Pipeline)
  hospital_stock_allocated?: number;
  internal_blood_bank_stock_allocated?: number;
  external_blood_bank_reserved_quantity?: number;
  units_reserved?: number;
  units_issued?: number;
  units_received?: number;
  remaining_shortage?: number;
  donor_support_quantity?: number;
  urgency: RequestUrgency;
  status: RequestStatus;
  required_by: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "blood_requests.json");

function ensureStoreDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function readStore(): Record<string, StoredBloodRequestRecord> {
  ensureStoreDir();
  if (!fs.existsSync(STORE_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeStore(data: Record<string, StoredBloodRequestRecord>) {
  ensureStoreDir();
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write blood requests store:", e);
  }
}

export const bloodRequestStore = {
  getAll(): Record<string, StoredBloodRequestRecord> {
    return readStore();
  },

  get(id: string): StoredBloodRequestRecord | undefined {
    if (!id) return undefined;
    const store = readStore();
    return store[id];
  },

  getByOrg(orgId: string): StoredBloodRequestRecord[] {
    if (!orgId) return [];
    const store = readStore();
    return Object.values(store)
      .filter((r) => r.organization_id === orgId || r.hospital_id === orgId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  save(req: StoredBloodRequestRecord): void {
    const store = readStore();
    store[req.id] = {
      ...req,
      updated_at: new Date().toISOString(),
    };
    writeStore(store);
  },

  updateStatus(id: string, status: RequestStatus): void {
    const store = readStore();
    if (store[id]) {
      store[id].status = status;
      store[id].updated_at = new Date().toISOString();
      if (status === "fulfilled" || status === "cancelled" || status === "expired") {
        store[id].closed_at = new Date().toISOString();
      }
      writeStore(store);
    }
  },

  fulfillUnits(id: string, unitsFulfilled: number): void {
    const store = readStore();
    if (store[id]) {
      store[id].units_fulfilled = Math.min(
        store[id].units_required,
        (store[id].units_fulfilled || 0) + unitsFulfilled
      );
      if (store[id].units_fulfilled >= store[id].units_required) {
        store[id].status = "fulfilled";
        store[id].closed_at = new Date().toISOString();
      } else if (store[id].units_fulfilled > 0) {
        store[id].status = "partially_fulfilled";
      }
      store[id].updated_at = new Date().toISOString();
      writeStore(store);
      this.reconcileRequest(id);
    }
  },

  /**
   * Authoritative calculation and reconciliation of all independent stages:
   * requested_quantity, hospital_stock_allocated, internal_blood_bank_stock_allocated,
   * external_blood_bank_reserved_quantity, issued_quantity, received_quantity,
   * confirmed_fulfilled_quantity, remaining_quantity, donor_support_quantity.
   */
  reconcileRequest(id: string): StoredBloodRequestRecord | undefined {
    const store = readStore();
    const req = store[id];
    if (!req) return undefined;

    const reservations = reservationStore.getReservationsByRequest(id);

    let hospitalStockAllocated = 0;
    let internalBloodBankStockAllocated = 0;
    let externalBloodBankReserved = 0;
    let unitsReserved = 0;
    let unitsIssued = 0;
    let unitsReceived = 0;

    const hospitalId = req.hospital_id || req.organization_id;

    for (const r of reservations) {
      if (r.status === "cancelled" || r.status === "expired") continue;

      const srcId = r.source_organization_id || r.sourceOrgId || "";

      if (r.status === "reserved" || r.status === "preparing") {
        unitsReserved += r.quantity;
        if (srcId === hospitalId) {
          hospitalStockAllocated += r.quantity;
        } else if (srcId === "b2222222-2222-2222-2222-222222222222" || srcId.includes("internal")) {
          internalBloodBankStockAllocated += r.quantity;
        } else {
          externalBloodBankReserved += r.quantity;
        }
      } else if (r.status === "issued" || r.status === "in_transit") {
        unitsIssued += r.quantity;
      } else if (r.status === "received" || r.status === "delivered") {
        unitsReceived += r.quantity;
      }
    }

    // Crucial rule: fulfilled = strictly received units (reservations and mere issuance NEVER increase fulfilled)
    const confirmedFulfilled = Math.max(req.units_fulfilled || 0, unitsReceived);
    const totalSecured = unitsReserved + unitsIssued + confirmedFulfilled;
    const remainingShortage = Math.max(0, req.units_required - totalSecured);

    // Dynamic Request Status Determination
    let status: RequestStatus = req.status;

    if (req.status !== "cancelled" && req.status !== "expired") {
      if (confirmedFulfilled >= req.units_required) {
        status = "fulfilled";
        req.closed_at = req.closed_at || new Date().toISOString();
      } else if (confirmedFulfilled > 0) {
        if (confirmedFulfilled + unitsIssued >= req.units_required) {
          status = "partially_received";
        } else {
          status = "partially_fulfilled";
        }
      } else if (unitsIssued > 0) {
        if (unitsIssued >= req.units_required) {
          status = "fully_issued";
        } else {
          status = "partially_issued";
        }
      } else if (unitsReserved >= req.units_required) {
        status = "fully_reserved";
      } else if (unitsReserved > 0) {
        if (remainingShortage > 0) {
          status = "partially_reserved";
        } else {
          status = "fully_reserved";
        }
      } else {
        if (req.status === "matching" || req.status === "donor_matching") {
          status = "donor_matching";
        } else {
          status = "pending";
        }
      }
    }

    req.hospital_stock_allocated = hospitalStockAllocated;
    req.internal_blood_bank_stock_allocated = internalBloodBankStockAllocated;
    req.external_blood_bank_reserved_quantity = externalBloodBankReserved;
    req.units_reserved = unitsReserved;
    req.units_issued = unitsIssued;
    req.units_received = unitsReceived;
    req.units_fulfilled = confirmedFulfilled;
    req.remaining_shortage = remainingShortage;
    req.donor_support_quantity = remainingShortage > 0 ? remainingShortage : 0;
    req.status = status;
    req.updated_at = new Date().toISOString();

    store[id] = req;
    writeStore(store);
    return req;
  },

  recordReceipt(id: string, unitsReceived: number): StoredBloodRequestRecord | undefined {
    const store = readStore();
    if (!store[id]) return undefined;
    store[id].units_fulfilled = Math.min(
      store[id].units_required,
      (store[id].units_fulfilled || 0) + unitsReceived
    );
    writeStore(store);
    return this.reconcileRequest(id);
  },
};
