import fs from "fs";
import path from "path";
import { BloodGroupCode, CompatibilityType } from "@/types/database";
import { inventoryStore } from "./inventoryStore";
import { getAuthoritativeInventoryOrgId, getLinkedBloodBank } from "./facilityRelationships";

export type ReservationStatus =
  | "pending"
  | "reserved"
  | "preparing"
  | "issued"
  | "in_transit"
  | "received"
  | "delivered"
  | "cancelled"
  | "expired";

export interface BloodReservation {
  id: string;
  blood_request_id: string;
  requesting_hospital_id: string;
  requesting_hospital_name?: string;
  source_organization_id: string; // The holding facility (hospital itself, internal blood bank, or external blood bank)
  source_organization_name?: string;
  blood_group: BloodGroupCode;
  component_type: CompatibilityType;
  quantity: number;
  status: ReservationStatus;
  expires_at: string;
  reserved_at: string;
  issued_at?: string | null;
  received_at?: string | null;
  received_notes?: string | null;
  transporter_details?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  idempotency_key?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Aliases for compatibility
  bloodRequestId?: string;
  requestingHospitalId?: string;
  requestingHospitalName?: string;
  sourceOrgId?: string;
  sourceOrgName?: string;
  bloodGroup?: BloodGroupCode;
  componentType?: CompatibilityType;
  expiresAt?: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const RESERVATIONS_FILE = path.join(DATA_DIR, "blood_reservations.json");

function ensureStoreDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function readReservations(): Record<string, BloodReservation> {
  ensureStoreDir();
  if (!fs.existsSync(RESERVATIONS_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(RESERVATIONS_FILE, "utf-8");
    const parsed: Record<string, BloodReservation> = JSON.parse(raw);
    let mutated = false;
    for (const key of Object.keys(parsed)) {
      const item = parsed[key];
      if (item.source_organization_id) {
        const authoritativeId = getAuthoritativeInventoryOrgId(item.source_organization_id);
        if (authoritativeId !== item.source_organization_id) {
          const linkedBB = getLinkedBloodBank(item.source_organization_id);
          item.source_organization_id = authoritativeId;
          if (linkedBB) {
            item.source_organization_name = linkedBB.name;
          }
          mutated = true;
        }
      }
    }
    if (mutated) {
      try {
        fs.writeFileSync(RESERVATIONS_FILE, JSON.stringify(parsed, null, 2), "utf-8");
      } catch {}
    }
    return parsed;
  } catch {
    return {};
  }
}

function writeReservations(data: Record<string, BloodReservation>) {
  ensureStoreDir();
  try {
    fs.writeFileSync(RESERVATIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write blood reservations store:", e);
  }
}

// In-process Mutex lock for atomic operations across concurrent async turns
let isProcessingReservationLock = false;
async function acquireLock(maxWaitMs = 5000): Promise<() => void> {
  const startTime = Date.now();
  while (isProcessingReservationLock) {
    if (Date.now() - startTime > maxWaitMs) {
      throw new Error("Concurrency lock timeout: simultaneous stock reservation in progress.");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  isProcessingReservationLock = true;
  return () => {
    isProcessingReservationLock = false;
  };
}

export const reservationStore = {
  getAll(): Record<string, BloodReservation> {
    return readReservations();
  },

  get(id: string): BloodReservation | undefined {
    if (!id) return undefined;
    const all = readReservations();
    const item = all[id];
    if (!item) return undefined;
    return {
      ...item,
      bloodRequestId: item.blood_request_id,
      requestingHospitalId: item.requesting_hospital_id,
      requestingHospitalName: item.requesting_hospital_name,
      sourceOrgId: item.source_organization_id,
      sourceOrgName: item.source_organization_name,
      bloodGroup: item.blood_group,
      componentType: item.component_type,
      expiresAt: item.expires_at,
    };
  },

  getReservation(id: string): BloodReservation | undefined {
    return this.get(id);
  },

  getByRequest(bloodRequestId: string): BloodReservation[] {
    if (!bloodRequestId) return [];
    const all = readReservations();
    const mapped = Object.values(all)
      .filter((r) => r.blood_request_id === bloodRequestId)
      .map((item) => ({
        ...item,
        bloodRequestId: item.blood_request_id,
        requestingHospitalId: item.requesting_hospital_id,
        requestingHospitalName: item.requesting_hospital_name,
        sourceOrgId: item.source_organization_id,
        sourceOrgName: item.source_organization_name,
        bloodGroup: item.blood_group,
        componentType: item.component_type,
        expiresAt: item.expires_at,
      }));

    // Deduplicate and consolidate duplicate allocations from the same authoritative facility
    const consolidatedMap = new Map<string, BloodReservation>();
    for (const res of mapped) {
      const key = `${res.sourceOrgId}_${res.bloodGroup}_${res.componentType}_${res.status}`;
      if (consolidatedMap.has(key)) {
        const existing = consolidatedMap.get(key)!;
        existing.quantity += res.quantity;
      } else {
        consolidatedMap.set(key, { ...res });
      }
    }

    return Array.from(consolidatedMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getReservationsByRequest(bloodRequestId: string): BloodReservation[] {
    return this.getByRequest(bloodRequestId);
  },

  getBySourceOrg(sourceOrgId: string): BloodReservation[] {
    if (!sourceOrgId) return [];
    const all = readReservations();
    return Object.values(all)
      .filter((r) => r.source_organization_id === sourceOrgId)
      .map((item) => ({
        ...item,
        bloodRequestId: item.blood_request_id,
        requestingHospitalId: item.requesting_hospital_id,
        requestingHospitalName: item.requesting_hospital_name,
        sourceOrgId: item.source_organization_id,
        sourceOrgName: item.source_organization_name,
        bloodGroup: item.blood_group,
        componentType: item.component_type,
        expiresAt: item.expires_at,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getReservationsBySourceOrg(sourceOrgId: string): BloodReservation[] {
    return this.getBySourceOrg(sourceOrgId);
  },

  updateReservationStatus(reservationId: string, status: ReservationStatus): boolean {
    const all = readReservations();
    const res = all[reservationId];
    if (!res) return false;
    res.status = status;
    res.updated_at = new Date().toISOString();
    all[reservationId] = res;
    writeReservations(all);
    return true;
  },

  getByHospital(hospitalId: string): BloodReservation[] {
    if (!hospitalId) return [];
    const all = readReservations();
    return Object.values(all)
      .filter((r) => r.requesting_hospital_id === hospitalId)
      .map((item) => ({
        ...item,
        bloodRequestId: item.blood_request_id,
        requestingHospitalId: item.requesting_hospital_id,
        requestingHospitalName: item.requesting_hospital_name,
        sourceOrgId: item.source_organization_id,
        sourceOrgName: item.source_organization_name,
        bloodGroup: item.blood_group,
        componentType: item.component_type,
        expiresAt: item.expires_at,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  /**
   * Atomically creates a stock reservation.
   * Verifies inventory strictly within the lock to prevent double-reservation.
   * Guarantees non-negative available stock.
   */
  async createReservation(params: {
    bloodRequestId: string;
    requestingHospitalId: string;
    requestingHospitalName?: string;
    sourceOrgId: string;
    sourceOrgName?: string;
    bloodGroup: BloodGroupCode;
    componentType?: CompatibilityType;
    quantity: number;
    expiryHours?: number;
    expiresInMinutes?: number;
    idempotencyKey?: string;
    notes?: string;
  }): Promise<{ success: boolean; reservation?: BloodReservation; error?: string }> {
    const release = await acquireLock();
    try {
      const {
        bloodRequestId,
        requestingHospitalId,
        requestingHospitalName,
        sourceOrgId,
        sourceOrgName,
        bloodGroup,
        componentType = "red_cells",
        quantity,
        expiryHours = 24,
        expiresInMinutes,
        idempotencyKey,
        notes,
      } = params;

      if (!quantity || quantity <= 0) {
        return { success: false, error: "Reservation quantity must be at least 1 unit." };
      }

      const all = readReservations();

      // Idempotency check: if already processed with this key, return existing
      if (idempotencyKey) {
        const existing = Object.values(all).find(
          (r) => r.idempotency_key === idempotencyKey
        );
        if (existing) {
          return { success: true, reservation: existing };
        }
      }

      // Step 1: Check available inventory under mutex
      const currentItem = inventoryStore.getItem(sourceOrgId, bloodGroup);
      const available = currentItem.available_quantity;

      if (available < quantity) {
        return {
          success: false,
          error: `Insufficient available inventory. Requested ${quantity} units, but only ${available} units available in ${sourceOrgName || "facility"}.`,
        };
      }

      // Step 2: Atomic Reservation
      const newReserved = currentItem.reserved_quantity + quantity;
      inventoryStore.setQuantity(sourceOrgId, bloodGroup, currentItem.quantity, newReserved);

      // Step 3: Record transaction in inventory audit ledger
      inventoryStore.recordTransaction({
        organization_id: sourceOrgId,
        blood_group: bloodGroup,
        transaction_type: "blood_reserved",
        quantity,
        reference_id: bloodRequestId,
        notes: `Reserved for ${requestingHospitalName || requestingHospitalId} (Req: ${bloodRequestId.slice(0, 8)})`,
        created_by: requestingHospitalId,
      });

      // Step 4: Create reservation record
      const now = new Date();
      const expiryMs =
        expiresInMinutes !== undefined
          ? expiresInMinutes * 60 * 1000
          : expiryHours * 60 * 60 * 1000;
      const expiresAt = new Date(now.getTime() + expiryMs).toISOString();
      const reservationId = `res-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const newReservation: BloodReservation = {
        id: reservationId,
        blood_request_id: bloodRequestId,
        requesting_hospital_id: requestingHospitalId,
        requesting_hospital_name: requestingHospitalName,
        source_organization_id: sourceOrgId,
        source_organization_name: sourceOrgName,
        blood_group: bloodGroup,
        component_type: componentType,
        quantity,
        status: "reserved",
        expires_at: expiresAt,
        reserved_at: now.toISOString(),
        idempotency_key: idempotencyKey || null,
        notes: notes || null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      all[reservationId] = newReservation;
      writeReservations(all);

      return { success: true, reservation: newReservation };
    } finally {
      release();
    }
  },

  /**
   * Advances status to 'preparing'
   */
  async prepareReservation(reservationId: string): Promise<{ success: boolean; reservation?: BloodReservation; error?: string }> {
    const release = await acquireLock();
    try {
      const all = readReservations();
      const res = all[reservationId];
      if (!res) return { success: false, error: "Reservation not found." };
      if (res.status !== "reserved") {
        return { success: false, error: `Cannot prepare reservation in '${res.status}' state.` };
      }

      res.status = "preparing";
      res.updated_at = new Date().toISOString();
      all[reservationId] = res;
      writeReservations(all);
      return { success: true, reservation: res };
    } finally {
      release();
    }
  },

  /**
   * Confirms stock issuance / dispatch by supplying blood bank.
   * Atomically decrements quantity and reserved_quantity.
   * Units can NEVER become available again.
   */
  async issueReservation(
    reservationId: string,
    notes?: string,
    transporterDetails?: string
  ): Promise<{ success: boolean; reservation?: BloodReservation; error?: string }> {
    const release = await acquireLock();
    try {
      const all = readReservations();
      const res = all[reservationId];
      if (!res) return { success: false, error: "Reservation not found." };
      if (res.status !== "reserved" && res.status !== "preparing") {
        return { success: false, error: `Cannot issue reservation in '${res.status}' status.` };
      }

      // Decrement both total quantity and reserved quantity
      const currentItem = inventoryStore.getItem(res.source_organization_id, res.blood_group);
      const newTotal = Math.max(0, currentItem.quantity - res.quantity);
      const newReserved = Math.max(0, currentItem.reserved_quantity - res.quantity);
      inventoryStore.setQuantity(res.source_organization_id, res.blood_group, newTotal, newReserved);

      // Record blood_issued transaction
      inventoryStore.recordTransaction({
        organization_id: res.source_organization_id,
        blood_group: res.blood_group,
        transaction_type: "blood_issued",
        quantity: res.quantity,
        reference_id: res.blood_request_id,
        notes: notes || `Issued to hospital ${res.requesting_hospital_name || res.requesting_hospital_id}${transporterDetails ? ` (Courier: ${transporterDetails})` : ""}`,
        created_by: res.source_organization_id,
      });

      const nowIso = new Date().toISOString();
      res.status = "issued";
      res.issued_at = nowIso;
      if (transporterDetails) res.transporter_details = transporterDetails;
      res.updated_at = nowIso;
      if (notes) res.notes = `${res.notes || ""} [Issued: ${notes}]`.trim();
      all[reservationId] = res;
      writeReservations(all);

      return { success: true, reservation: res };
    } finally {
      release();
    }
  },

  /**
   * Confirms physical receipt of issued units by the receiving hospital.
   * Advances status to 'received' (or 'delivered').
   */
  async confirmReceipt(
    reservationId: string,
    notes?: string
  ): Promise<{ success: boolean; reservation?: BloodReservation; error?: string }> {
    const release = await acquireLock();
    try {
      const all = readReservations();
      const res = all[reservationId];
      if (!res) return { success: false, error: "Reservation not found." };
      if (
        res.status !== "issued" &&
        res.status !== "in_transit" &&
        res.status !== "preparing" &&
        res.status !== "reserved"
      ) {
        return { success: false, error: `Cannot confirm receipt for reservation in '${res.status}' status.` };
      }

      // If confirming directly from reserved/preparing (e.g. hospital's own on-premise stock dispensed directly)
      if (res.status === "reserved" || res.status === "preparing") {
        const currentItem = inventoryStore.getItem(res.source_organization_id, res.blood_group);
        const newTotal = Math.max(0, currentItem.quantity - res.quantity);
        const newReserved = Math.max(0, currentItem.reserved_quantity - res.quantity);
        inventoryStore.setQuantity(res.source_organization_id, res.blood_group, newTotal, newReserved);

        inventoryStore.recordTransaction({
          organization_id: res.source_organization_id,
          blood_group: res.blood_group,
          transaction_type: "blood_issued",
          quantity: res.quantity,
          reference_id: res.blood_request_id,
          notes: notes || "Dispensed directly from internal hospital stock",
          created_by: res.requesting_hospital_id,
        });
      }

      const nowIso = new Date().toISOString();
      res.status = "received";
      res.received_at = nowIso;
      res.received_notes = notes || null;
      res.updated_at = nowIso;
      all[reservationId] = res;
      writeReservations(all);

      return { success: true, reservation: res };
    } finally {
      release();
    }
  },

  /**
   * Cancels a reservation and releases reserved units back to available stock.
   */
  async cancelReservation(
    reservationId: string,
    reason?: string
  ): Promise<{ success: boolean; reservation?: BloodReservation; error?: string }> {
    const release = await acquireLock();
    try {
      const all = readReservations();
      const res = all[reservationId];
      if (!res) return { success: false, error: "Reservation not found." };
      if (res.status !== "reserved" && res.status !== "preparing") {
        return { success: false, error: `Cannot cancel reservation in '${res.status}' status.` };
      }

      // Release reserved units back to available
      const currentItem = inventoryStore.getItem(res.source_organization_id, res.blood_group);
      const newReserved = Math.max(0, currentItem.reserved_quantity - res.quantity);
      inventoryStore.setQuantity(res.source_organization_id, res.blood_group, currentItem.quantity, newReserved);

      // Record transaction
      inventoryStore.recordTransaction({
        organization_id: res.source_organization_id,
        blood_group: res.blood_group,
        transaction_type: "reservation_released",
        quantity: res.quantity,
        reference_id: res.blood_request_id,
        notes: `Reservation cancelled: ${reason || "Released"}`,
        created_by: res.requesting_hospital_id,
      });

      const nowIso = new Date().toISOString();
      res.status = "cancelled";
      res.cancelled_at = nowIso;
      res.cancellation_reason = reason || "Cancelled by facility";
      res.updated_at = nowIso;
      all[reservationId] = res;
      writeReservations(all);

      return { success: true, reservation: res };
    } finally {
      release();
    }
  },

  /**
   * Background process to expire reservations past their deadline and release stock.
   */
  async processExpiredReservations(): Promise<{ expiredCount: number; releasedUnits: number }> {
    const release = await acquireLock();
    try {
      const all = readReservations();
      const now = new Date().getTime();
      let expiredCount = 0;
      let releasedUnits = 0;

      for (const res of Object.values(all)) {
        if ((res.status === "reserved" || res.status === "preparing") && new Date(res.expires_at).getTime() <= now) {
          // Release reserved units
          const currentItem = inventoryStore.getItem(res.source_organization_id, res.blood_group);
          const newReserved = Math.max(0, currentItem.reserved_quantity - res.quantity);
          inventoryStore.setQuantity(res.source_organization_id, res.blood_group, currentItem.quantity, newReserved);

          inventoryStore.recordTransaction({
            organization_id: res.source_organization_id,
            blood_group: res.blood_group,
            transaction_type: "reservation_released",
            quantity: res.quantity,
            reference_id: res.blood_request_id,
            notes: "Reservation expired automatically by system deadline.",
            created_by: "system_scheduler",
          });

          res.status = "expired";
          res.updated_at = new Date().toISOString();
          expiredCount++;
          releasedUnits += res.quantity;
        }
      }

      if (expiredCount > 0) {
        writeReservations(all);
      }

      return { expiredCount, releasedUnits };
    } finally {
      release();
    }
  },

  clear(): void {
    writeReservations({});
  },
};
