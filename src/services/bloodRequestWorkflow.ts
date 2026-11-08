import { BloodGroupCode, CompatibilityType, RequestUrgency, RequestStatus } from "@/types/database";
import { bloodRequestStore, StoredBloodRequestRecord } from "./bloodRequestStore";
import { inventoryStore } from "./inventoryStore";
import { reservationStore, BloodReservation } from "./reservationStore";
import { donorStore } from "./donorStore";
import { donorRequestStore } from "./donorRequestStore";
import { inAppNotificationStore } from "./inAppNotificationStore";
import { matchingEngine } from "@/lib/matching/matchingEngine";
import { orbinovaEmail } from "@/lib/email";

export interface ProcessBloodRequestParams {
  requestId: string;
  hospitalId: string;
  hospitalName: string;
  hospitalCity?: string | null;
  hospitalState?: string | null;
  bloodGroup: BloodGroupCode;
  componentType?: CompatibilityType;
  unitsRequired: number;
  urgency: RequestUrgency;
  requiredBy?: string | null;
  notes?: string | null;
  actorUserId?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface WorkflowExecutionResult {
  requestId: string;
  initialUnitsRequired: number;
  unitsFulfilled: number;
  remainingShortage: number;
  finalStatus: RequestStatus;
  reservations: BloodReservation[];
  donorMatchingInitiated: boolean;
  donorsNotifiedCount: number;
  summary: string;
}

import {
  KNOWN_ORGANIZATIONS,
  getLinkedBloodBank,
  isHospitalParentOf,
  getAuthoritativeInventoryOrgId,
  KnownFacility,
} from "./facilityRelationships";

export {
  KNOWN_ORGANIZATIONS,
  getLinkedBloodBank,
  isHospitalParentOf,
  getAuthoritativeInventoryOrgId,
};

export const bloodRequestWorkflow = {
  /**
   * Executes the complete Inventory-First Blood Request Workflow:
   * 1. Hospital's own inventory check (reserves on-premise stock)
   * 2. Hospital-owned internal blood bank check (reserves internal stock)
   * 3. External private blood banks check (reserves external stock)
   * 4. External standalone blood banks check (reserves external stock)
   * 5. Initiate donor matching ONLY for any remaining shortage
   *
   * CRITICAL REQUIREMENT:
   * A reservation ALONE must NEVER be treated as completed fulfillment.
   * Fulfilled quantity remains 0 until units are confirmed received by hospital.
   */
  async processHospitalRequest(params: ProcessBloodRequestParams): Promise<WorkflowExecutionResult> {
    const {
      requestId,
      hospitalId,
      hospitalName,
      hospitalCity,
      hospitalState,
      bloodGroup,
      componentType = "red_cells",
      unitsRequired,
      urgency,
      requiredBy,
      notes,
      actorUserId,
    } = params;

    let hospitalStockAllocated = 0;
    let internalBloodBankStockAllocated = 0;
    let externalBloodBankReserved = 0;
    let totalReserved = 0;
    const unitsFulfilled = 0; // Strictly 0 at reservation time
    let remainingShortage = unitsRequired;
    const reservations: BloodReservation[] = [];

    // STEP 1: Check linked hospital-owned internal blood bank inventory (when hospital operates one)
    // Rule: A hospital's blood inventory must be managed through its hospital-owned blood bank facility.
    // Duplicate inventory sources like "Hospital Own Stock" and "Internal Blood Bank" are strictly consolidated.
    const linkedBB = getLinkedBloodBank(hospitalId);
    if (linkedBB) {
      const bbInv = inventoryStore.getItem(linkedBB.id, bloodGroup);
      if (bbInv.available_quantity > 0) {
        const takeUnits = Math.min(bbInv.available_quantity, remainingShortage);
        const res = await reservationStore.createReservation({
          bloodRequestId: requestId,
          requestingHospitalId: hospitalId,
          requestingHospitalName: hospitalName,
          sourceOrgId: linkedBB.id,
          sourceOrgName: linkedBB.name,
          bloodGroup,
          componentType,
          quantity: takeUnits,
          idempotencyKey: `auto-${requestId}-bb-${linkedBB.id}`,
          notes: `Hospital blood stock allocated from linked internal blood bank facility (${linkedBB.name})`,
        });

        if (res.success && res.reservation) {
          reservations.push(res.reservation);
          internalBloodBankStockAllocated += takeUnits;
          hospitalStockAllocated += takeUnits;
          totalReserved += takeUnits;
          remainingShortage -= takeUnits;
        }
      }
    }

    // STEP 2: Search approved independent blood banks for any remaining shortage
    // (Used for hospitals without their own blood bank, or when internal blood bank has insufficient stock)
    if (remainingShortage > 0) {
      const independentBloodBanks = KNOWN_ORGANIZATIONS.filter(
        (org) =>
          org.type === "blood_bank" &&
          org.parent_hospital_id !== hospitalId && // independent / not hospital-owned by this hospital
          org.verification_status === "verified" &&
          org.is_active
      );

      for (const extBB of independentBloodBanks) {
        if (remainingShortage <= 0) break;

        const extInv = inventoryStore.getItem(extBB.id, bloodGroup);
        if (extInv.available_quantity > 0) {
          const takeUnits = Math.min(extInv.available_quantity, remainingShortage);
          const res = await reservationStore.createReservation({
            bloodRequestId: requestId,
            requestingHospitalId: hospitalId,
            requestingHospitalName: hospitalName,
            sourceOrgId: extBB.id,
            sourceOrgName: extBB.name,
            bloodGroup,
            componentType,
            quantity: takeUnits,
            idempotencyKey: `auto-${requestId}-extbb-${extBB.id}`,
            notes: `Coordinated blood bank allocation from ${extBB.name}`,
          });

          if (res.success && res.reservation) {
            reservations.push(res.reservation);
            externalBloodBankReserved += takeUnits;
            totalReserved += takeUnits;
            remainingShortage -= takeUnits;

            // In-App Notification to Blood Bank staff
            inAppNotificationStore.create({
              userId: extBB.id,
              organizationId: extBB.id,
              type: "blood_request",
              title: `Incoming Blood Request: ${takeUnits} Units ${bloodGroup}`,
              message: `${hospitalName} requested ${unitsRequired} units of ${bloodGroup}. ${takeUnits} units have been reserved from your inventory.`,
              data: {
                blood_request_id: requestId,
                reservation_id: res.reservation.id,
                quantity: takeUnits,
              },
            });
          }
        } else {
          // Send incoming request notice to this blood bank so they can prepare/acquire stock
          inAppNotificationStore.create({
            userId: extBB.id,
            organizationId: extBB.id,
            type: "blood_request",
            title: `Transfusion Demand Notice: Group ${bloodGroup}`,
            message: `${hospitalName} is seeking ${remainingShortage} units of ${bloodGroup} (${urgency} priority).`,
            data: { blood_request_id: requestId, urgency },
          });
        }
      }
    }

    // STEP 5: Determine Request Status based on independent stages
    let finalStatus: RequestStatus;
    if (totalReserved >= unitsRequired) {
      finalStatus = "fully_reserved";
    } else if (totalReserved > 0) {
      finalStatus = "partially_reserved";
    } else {
      finalStatus = "pending";
    }

    // Update Blood Request in store with granular tracking
    const storedRecord: StoredBloodRequestRecord = {
      id: requestId,
      organization_id: hospitalId,
      hospital_id: hospitalId,
      requested_by: actorUserId || hospitalId,
      blood_group: bloodGroup,
      units_required: unitsRequired,
      units_fulfilled: 0, // A reservation alone NEVER equals fulfillment
      hospital_stock_allocated: hospitalStockAllocated,
      internal_blood_bank_stock_allocated: internalBloodBankStockAllocated,
      external_blood_bank_reserved_quantity: externalBloodBankReserved,
      units_reserved: totalReserved,
      units_issued: 0,
      units_received: 0,
      remaining_shortage: remainingShortage,
      donor_support_quantity: remainingShortage > 0 ? remainingShortage : 0,
      urgency,
      status: finalStatus,
      required_by: requiredBy || null,
      notes: notes || null,
      latitude: null,
      longitude: null,
      closed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    bloodRequestStore.save(storedRecord);

    // STEP 6: Initiate Donor Matching ONLY for remaining shortage
    let donorMatchingInitiated = false;
    let donorsNotifiedCount = 0;

    if (remainingShortage > 0) {
      donorMatchingInitiated = true;
      try {
        const matchRes = await matchingEngine.executeMatchingRun(requestId, {
          batchSize: Math.max(3, remainingShortage * 2),
          actorUserId,
        });

        if (matchRes.success) {
          donorsNotifiedCount = matchRes.donorsNotified;
          finalStatus = "donor_matching";
          storedRecord.status = "donor_matching";
          bloodRequestStore.save(storedRecord);
        }
      } catch (err: any) {
        console.warn("Matching run execution notice:", err?.message);
      }
    }

    const summary =
      remainingShortage === 0
        ? `Request REQ-${requestId.slice(0, 8)} fully secured by reserved stock (${totalReserved}/${unitsRequired} units reserved). Awaiting issuance and clinical receipt. No donor broadcast required.`
        : `Request REQ-${requestId.slice(0, 8)} partially reserved (${totalReserved}/${unitsRequired} units). Remaining shortage of ${remainingShortage} units dispatched to ${donorsNotifiedCount} eligible voluntary donors.`;

    return {
      requestId,
      initialUnitsRequired: unitsRequired,
      unitsFulfilled: 0, // Strictly 0
      remainingShortage,
      finalStatus,
      reservations,
      donorMatchingInitiated,
      donorsNotifiedCount,
      summary,
    };
  },
};
