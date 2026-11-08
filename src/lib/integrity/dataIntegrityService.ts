import { BloodGroupCode, BloodInventory, CompatibilityType } from "@/types/database";
import { StoredBloodRequestRecord } from "@/services/bloodRequestStore";
import { BloodReservation } from "@/services/reservationStore";
import { StoredDonorOverride } from "@/services/donorStore";
import { isHospitalParentOf, getLinkedBloodBank, KNOWN_ORGANIZATIONS } from "@/services/facilityRelationships";

export interface TransactionStep<T = any> {
  name: string;
  execute: () => Promise<T> | T;
  rollback: () => Promise<void> | void;
}

class IntegrityMutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const run = () => {
        this.locked = true;
        resolve(() => {
          this.locked = false;
          const next = this.queue.shift();
          if (next) {
            next();
          }
        });
      };

      if (this.locked) {
        this.queue.push(run);
      } else {
        run();
      }
    });
  }
}

const globalMutex = new IntegrityMutex();
const idempotencyRegistry = new Map<string, { result: any; timestamp: number }>();

export class DataIntegrityViolationError extends Error {
  constructor(message: string, public code: string = "DATA_INTEGRITY_VIOLATION") {
    super(`[${code}] ${message}`);
    this.name = "DataIntegrityViolationError";
  }
}

export class MultiTenantIsolationViolationError extends Error {
  constructor(actorOrgId: string, targetOrgId: string) {
    super(`[MULTI_TENANT_VIOLATION] Actor organization '${actorOrgId}' is not authorized to access or mutate records belonging to institution '${targetOrgId}'.`);
    this.name = "MultiTenantIsolationViolationError";
  }
}

export const dataIntegrityService = {
  /**
   * 1. Multi-Tenant Scoping & Isolation
   * Strictly enforces that an actor cannot view or mutate another tenant's records.
   * Special exception: hospital accessing its authorized hospital-owned blood bank facility.
   */
  assertTenantAccess(actorOrgId: string, targetOrgId: string): void {
    if (!actorOrgId || !targetOrgId) {
      throw new DataIntegrityViolationError("Both actorOrgId and targetOrgId are required for tenant verification.");
    }

    // Direct match: same tenant
    if (actorOrgId === targetOrgId) return;

    // Check if actor is parent hospital of target facility
    if (isHospitalParentOf(actorOrgId, targetOrgId)) return;

    // Check if target is linked blood bank of actor hospital
    const linkedBB = getLinkedBloodBank(actorOrgId);
    if (linkedBB && linkedBB.id === targetOrgId) return;

    // Unauthorized cross-tenant access attempt
    throw new MultiTenantIsolationViolationError(actorOrgId, targetOrgId);
  },

  /**
   * 2. Blood Inventory Invariants
   * Enforces:
   * - quantity >= 0
   * - reserved_quantity >= 0
   * - reserved_quantity <= quantity
   * - available_quantity == max(0, quantity - reserved_quantity)
   */
  validateInventoryInvariants(item: {
    quantity: number;
    reserved_quantity: number;
    available_quantity?: number;
    blood_group?: string;
  }): void {
    const qty = Number(item.quantity);
    const reserved = Number(item.reserved_quantity);

    if (isNaN(qty) || qty < 0) {
      throw new DataIntegrityViolationError(
        `Blood inventory quantity cannot be negative. Value: ${qty}`,
        "NEGATIVE_INVENTORY_PREVENTED"
      );
    }

    if (isNaN(reserved) || reserved < 0) {
      throw new DataIntegrityViolationError(
        `Blood inventory reserved_quantity cannot be negative. Value: ${reserved}`,
        "NEGATIVE_RESERVATION_PREVENTED"
      );
    }

    if (reserved > qty) {
      throw new DataIntegrityViolationError(
        `Over-reservation prevented: reserved_quantity (${reserved}) exceeds total quantity (${qty}).`,
        "OVER_RESERVATION_PREVENTED"
      );
    }

    const calculatedAvailable = Math.max(0, qty - reserved);
    if (item.available_quantity !== undefined && item.available_quantity !== calculatedAvailable) {
      throw new DataIntegrityViolationError(
        `Inconsistent available_quantity: stored ${item.available_quantity}, calculated ${calculatedAvailable}.`,
        "INVENTORY_CALCULATION_MISMATCH"
      );
    }
  },

  /**
   * 3. Blood Request & Fulfillment Lifecycle Math
   * Enforces:
   * - units_required > 0
   * - units_fulfilled >= 0
   * - units_fulfilled <= units_required (cannot over-fulfill)
   * - Reservations are NEVER treated as completed fulfillment
   */
  validateBloodRequestMath(params: {
    units_required: number;
    units_fulfilled: number;
    units_reserved?: number;
    units_issued?: number;
    remaining_shortage?: number;
  }): void {
    const required = Number(params.units_required);
    const fulfilled = Number(params.units_fulfilled);

    if (isNaN(required) || required <= 0) {
      throw new DataIntegrityViolationError(
        `Blood request units_required must be strictly positive. Value: ${required}`,
        "INVALID_UNITS_REQUIRED"
      );
    }

    if (isNaN(fulfilled) || fulfilled < 0) {
      throw new DataIntegrityViolationError(
        `Blood request units_fulfilled cannot be negative. Value: ${fulfilled}`,
        "NEGATIVE_FULFILLMENT_PREVENTED"
      );
    }

    if (fulfilled > required) {
      throw new DataIntegrityViolationError(
        `Over-fulfillment prevented: units_fulfilled (${fulfilled}) exceeds units_required (${required}).`,
        "OVER_FULFILLMENT_PREVENTED"
      );
    }

    // Mathematical balance check if detailed breakdown provided
    if (
      params.units_reserved !== undefined &&
      params.remaining_shortage !== undefined
    ) {
      const accountedFor = fulfilled + (params.units_reserved || 0) + (params.remaining_shortage || 0);
      if (accountedFor < required) {
        throw new DataIntegrityViolationError(
          `Request accounting discrepancy: units accounted for (${accountedFor}) is less than units required (${required}).`,
          "FULFILLMENT_ACCOUNTING_DISCREPANCY"
        );
      }
    }
  },

  /**
   * 4. Donor Medical Eligibility & Waiting Period Validation
   * Enforces:
   * - Age >= 18 and <= 65
   * - Active eligibility status ('eligible')
   * - Mandatory waiting period of at least 56 days (8 weeks) between whole blood donations
   */
  validateDonorEligibility(donor: {
    fullName: string;
    dateOfBirth?: string | null;
    eligibilityStatus: string;
    lastDonationDate?: string | null;
  }): void {
    // 1. Status check
    if (donor.eligibilityStatus !== "eligible") {
      throw new DataIntegrityViolationError(
        `Donor '${donor.fullName}' cannot be registered for donation due to medical deferral/status '${donor.eligibilityStatus}'.`,
        "DONOR_DEFERRED_OR_INELIGIBLE"
      );
    }

    // 2. Age check
    if (donor.dateOfBirth) {
      const dob = new Date(donor.dateOfBirth);
      if (!isNaN(dob.getTime())) {
        const now = new Date();
        let age = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
          age--;
        }

        if (age < 18) {
          throw new DataIntegrityViolationError(
            `Donor '${donor.fullName}' is ineligible: age (${age}) is below minimum requirement of 18 years.`,
            "DONOR_UNDERAGE"
          );
        }

        if (age > 65) {
          throw new DataIntegrityViolationError(
            `Donor '${donor.fullName}' is ineligible: age (${age}) exceeds maximum threshold of 65 years.`,
            "DONOR_OVERAGE"
          );
        }
      }
    }

    // 3. Mandatory 56-day waiting period
    if (donor.lastDonationDate) {
      const last = new Date(donor.lastDonationDate);
      if (!isNaN(last.getTime())) {
        const diffMs = Date.now() - last.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const MIN_INTERVAL_DAYS = 56; // 8 weeks for whole blood

        if (diffDays < MIN_INTERVAL_DAYS) {
          throw new DataIntegrityViolationError(
            `Donor '${donor.fullName}' is in mandatory waiting period: only ${diffDays} days elapsed since last donation on ${donor.lastDonationDate} (minimum required: ${MIN_INTERVAL_DAYS} days).`,
            "DONOR_WAITING_PERIOD_ACTIVE"
          );
        }
      }
    }
  },

  /**
   * 5. Privilege Escalation Prevention
   */
  assertRoleAssignmentPermitted(
    actorRole: string,
    targetRole: string
  ): void {
    const ROLE_WEIGHTS: Record<string, number> = {
      super_admin: 100,
      admin: 80,
      hospital_admin: 80,
      blood_bank_admin: 80,
      lab_tech: 40,
      nurse: 30,
      viewer: 10,
    };

    const actorWeight = ROLE_WEIGHTS[actorRole] || 0;
    const targetWeight = ROLE_WEIGHTS[targetRole] || 0;

    if (actorWeight < targetWeight) {
      throw new DataIntegrityViolationError(
        `Privilege escalation prevented: Actor with role '${actorRole}' (weight ${actorWeight}) cannot assign higher role '${targetRole}' (weight ${targetWeight}).`,
        "PRIVILEGE_ESCALATION_PREVENTED"
      );
    }
  },

  /**
   * 6. Atomic Transaction Runner with Rollback
   * Executes a series of steps inside an asynchronous Mutex lock.
   * If any step throws an error, all executed steps are rolled back in reverse order.
   */
  async executeAtomicTransaction<T>(
    transactionName: string,
    steps: TransactionStep[]
  ): Promise<T[]> {
    const release = await globalMutex.acquire();
    const executedSteps: TransactionStep[] = [];
    const results: any[] = [];

    try {
      for (const step of steps) {
        const res = await step.execute();
        results.push(res);
        executedSteps.push(step);
      }
      return results as T[];
    } catch (err) {
      console.warn(`[TRANSACTION_FAILED] Rolling back transaction '${transactionName}'... Error:`, err);
      // Rollback in reverse order
      for (let i = executedSteps.length - 1; i >= 0; i--) {
        try {
          await executedSteps[i].rollback();
        } catch (rollbackErr) {
          console.error(`[ROLLBACK_ERROR] Failed to rollback step '${executedSteps[i].name}':`, rollbackErr);
        }
      }
      throw err;
    } finally {
      release();
    }
  },

  /**
   * 7. Idempotency Guard
   * Prevents double processing of mutations upon network retries or duplicate clicks.
   */
  async withIdempotency<T>(
    key: string | undefined | null,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!key) return fn();

    const cached = idempotencyRegistry.get(key);
    if (cached) {
      // Return cached result within 1 hour window
      if (Date.now() - cached.timestamp < 3600 * 1000) {
        return cached.result as T;
      }
      idempotencyRegistry.delete(key);
    }

    const release = await globalMutex.acquire();
    try {
      // Recheck inside lock
      const doubleCheck = idempotencyRegistry.get(key);
      if (doubleCheck) return doubleCheck.result as T;

      const result = await fn();
      idempotencyRegistry.set(key, { result, timestamp: Date.now() });
      return result;
    } finally {
      release();
    }
  },

  /**
   * 8. Acquire global concurrency lock
   */
  async acquireLock(): Promise<() => void> {
    return globalMutex.acquire();
  },
};
