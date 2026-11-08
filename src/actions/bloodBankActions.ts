"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { reservationStore } from "@/services/reservationStore";
import { inventoryStore } from "@/services/inventoryStore";
import { bloodRequestStore } from "@/services/bloodRequestStore";
import { inAppNotificationStore } from "@/services/inAppNotificationStore";
import { matchingEngine } from "@/lib/matching/matchingEngine";
import { isHospitalParentOf } from "@/services/bloodRequestWorkflow";
import { hasPermission, assertApprovedInstitution } from "@/lib/auth/rbac";
import { revalidatePath } from "next/cache";

/**
 * Server-side clearance guard for blood bank operations
 */
async function requireBloodBankClearance(requiredPermission?: string) {
  const user = await getCurrentUser("hospital");
  if (!user || !user.profile?.is_active) {
    throw new Error("Unauthorized: Active user session required.");
  }

  const context = await hospitalService.getHospitalContext(user.id);
  if (!context) {
    throw new Error("Unauthorized: Organization membership required.");
  }

  // Institutional Verification Prerequisite
  assertApprovedInstitution(context.organization.verification_status);

  // Granular Permission Clearance (if specified)
  if (requiredPermission) {
    const authorized = hasPermission(
      user.profile.role,
      requiredPermission as any,
      context.membership.member_role
    );
    if (!authorized) {
      throw new Error(`Forbidden: Lacking clearance for [${requiredPermission}].`);
    }
  }

  return context;
}

/**
 * Accepts an incoming blood request, creating or confirming an atomic reservation
 */
export async function acceptBloodBankRequestAction(data: {
  requestId: string;
  reservationId?: string;
  offeredQuantity?: number;
  notes?: string;
}) {
  try {
    const { user, organization } = await requireBloodBankClearance("blood_requests.manage");
    const supabase = await createClient();

    const request = bloodRequestStore.get(data.requestId);
    if (!request) {
      return { success: false, error: "Blood request not found." };
    }

    let reservation = data.reservationId ? reservationStore.getReservation(data.reservationId) : null;

    if (!reservation) {
      // Find existing reservation for this org and request
      const existingRes = reservationStore.getReservationsByRequest(data.requestId)
        .find((r) => r.sourceOrgId === organization.id && (r.status === "reserved" || r.status === "preparing"));
      
      if (existingRes) {
        reservation = existingRes;
      }
    }

    const qtyToFulfill = data.offeredQuantity || (reservation ? reservation.quantity : request.units_required - request.units_fulfilled);

    if (!reservation) {
      // Create new atomic reservation
      const res = await reservationStore.createReservation({
        bloodRequestId: data.requestId,
        requestingHospitalId: request.hospital_id || request.organization_id || organization.id,
        requestingHospitalName: request.hospital_id === organization.id ? organization.name : "Requesting Hospital",
        sourceOrgId: organization.id,
        sourceOrgName: organization.name,
        bloodGroup: request.blood_group,
        componentType: (request as any).component_type || "red_cells",
        quantity: qtyToFulfill,
        idempotencyKey: `bb-accept-${data.requestId}-${organization.id}`,
        notes: data.notes || `Fulfillment accepted by ${organization.name}`,
      });

      if (!res.success || !res.reservation) {
        return { success: false, error: res.error || "Insufficient available stock to accept request." };
      }
      reservation = res.reservation;
    }

    // Transition reservation to preparing
    reservationStore.updateReservationStatus(reservation.id, "preparing");

    // Reconcile blood request status & quantities (reservation alone does NOT mark units as fulfilled)
    bloodRequestStore.reconcileRequest(data.requestId);

    // Notify requesting hospital
    inAppNotificationStore.create({
      userId: request.requested_by,
      organizationId: request.hospital_id,
      type: "blood_request",
      title: `Blood Request Accepted: ${qtyToFulfill} Units ${request.blood_group}`,
      message: `${organization.name} has accepted your request and is preparing ${qtyToFulfill} units of ${request.blood_group}.`,
      data: {
        blood_request_id: data.requestId,
        reservation_id: reservation.id,
        blood_bank_id: organization.id,
        quantity: qtyToFulfill,
      },
    });

    // Audit Log
    try {
      await (supabase.from("audit_logs") as any).insert({
        user_id: user.id,
        organization_id: organization.id,
        action: "BLOOD_BANK_REQUEST_ACCEPTED",
        entity_type: "blood_requests",
        entity_id: data.requestId,
        metadata: {
          reservation_id: reservation.id,
          quantity: qtyToFulfill,
          blood_group: request.blood_group,
        },
      });
    } catch {}

    revalidatePath("/hospital/blood-requests");
    revalidatePath(`/hospital/blood-requests/${data.requestId}`);
    revalidatePath("/hospital/inventory");

    return {
      success: true,
      reservationId: reservation.id,
      message: `Successfully accepted request. ${qtyToFulfill} units are now being prepared.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to accept blood request." };
  }
}

/**
 * Rejects an incoming blood request or releases allocated reservation
 */
export async function rejectBloodBankRequestAction(data: {
  requestId: string;
  reservationId?: string;
  reason: string;
}) {
  try {
    const { user, organization } = await requireBloodBankClearance("blood_requests.manage");
    const supabase = await createClient();

    if (!data.reason || !data.reason.trim()) {
      return { success: false, error: "A clinical or operational reason is required to reject a request." };
    }

    const request = bloodRequestStore.get(data.requestId);
    if (!request) {
      return { success: false, error: "Blood request not found." };
    }

    // If reservation exists, cancel and release stock back to available
    if (data.reservationId) {
      await reservationStore.cancelReservation(data.reservationId, data.reason);
    } else {
      const existingRes = reservationStore.getReservationsByRequest(data.requestId)
        .find((r) => r.sourceOrgId === organization.id && (r.status === "reserved" || r.status === "preparing"));
      if (existingRes) {
        await reservationStore.cancelReservation(existingRes.id, data.reason);
      }
    }

    // Reconcile blood request status & remaining shortage
    bloodRequestStore.reconcileRequest(data.requestId);

    // In-app notification to requesting hospital
    inAppNotificationStore.create({
      userId: request.requested_by,
      organizationId: request.hospital_id,
      type: "blood_request",
      title: `Blood Request Declined by ${organization.name}`,
      message: `${organization.name} was unable to fulfill your request: "${data.reason}". Other resources or donor matching will be utilized.`,
      data: {
        blood_request_id: data.requestId,
        reason: data.reason,
      },
    });

    // Check if remaining shortage now requires donor matching
    const currentShortage = request.units_required - request.units_fulfilled;
    if (currentShortage > 0) {
      try {
        await matchingEngine.executeMatchingRun(data.requestId, {
          batchSize: Math.max(3, currentShortage * 2),
        });
      } catch {}
    }

    // Audit Log
    try {
      await (supabase.from("audit_logs") as any).insert({
        user_id: user.id,
        organization_id: organization.id,
        action: "BLOOD_BANK_REQUEST_REJECTED",
        entity_type: "blood_requests",
        entity_id: data.requestId,
        metadata: { reason: data.reason },
      });
    } catch {}

    revalidatePath("/hospital/blood-requests");
    revalidatePath(`/hospital/blood-requests/${data.requestId}`);

    return { success: true, message: "Request declined and any reserved stock released." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to decline blood request." };
  }
}

/**
 * Transitions a reservation to 'preparing' (crossmatching, bag labeling)
 */
export async function prepareReservationAction(reservationId: string) {
  try {
    const { user, organization } = await requireBloodBankClearance("blood_inventory.manage");
    const supabase = await createClient();

    const reservation = reservationStore.getReservation(reservationId);
    if (!reservation) {
      return { success: false, error: "Reservation not found." };
    }

    const isAuthorized =
      reservation.sourceOrgId === organization.id ||
      isHospitalParentOf(organization.id, reservation.sourceOrgId || reservation.source_organization_id);

    if (!isAuthorized) {
      return { success: false, error: "Forbidden: Reservation belongs to a different facility." };
    }

    const updated = reservationStore.updateReservationStatus(reservationId, "preparing");
    if (!updated) {
      return { success: false, error: "Cannot transition reservation to preparing in its current state." };
    }

    const targetReqId = reservation.blood_request_id || reservation.bloodRequestId;
    if (targetReqId) {
      bloodRequestStore.reconcileRequest(targetReqId);
    }

    // Audit Log
    try {
      await (supabase.from("audit_logs") as any).insert({
        user_id: user.id,
        organization_id: organization.id,
        action: "RESERVATION_PREPARING",
        entity_type: "blood_reservations",
        entity_id: reservationId,
        metadata: { quantity: reservation.quantity, blood_group: reservation.bloodGroup },
      });
    } catch {}

    revalidatePath("/hospital/blood-requests");
    revalidatePath("/hospital/inventory");

    return { success: true, message: "Units are now marked as preparing for dispatch." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to prepare reservation." };
  }
}

/**
 * Issues blood reservation: deducts inventory stock permanently and records transaction ledger
 */
export async function issueReservationAction(data: {
  reservationId: string;
  notes?: string;
  transporterDetails?: string;
}) {
  try {
    const { user, organization } = await requireBloodBankClearance("blood_inventory.manage");
    const supabase = await createClient();

    const reservation = reservationStore.getReservation(data.reservationId);
    if (!reservation) {
      return { success: false, error: "Reservation not found." };
    }

    const isAuthorized =
      reservation.sourceOrgId === organization.id ||
      isHospitalParentOf(organization.id, reservation.sourceOrgId || reservation.source_organization_id);

    if (!isAuthorized) {
      return { success: false, error: "Forbidden: Reservation belongs to a different facility." };
    }

    // Atomic issuance in reservationStore
    const res = await reservationStore.issueReservation(
      data.reservationId,
      data.notes || data.transporterDetails,
      data.transporterDetails
    );

    if (!res.success) {
      return { success: false, error: res.error || "Failed to issue reservation." };
    }

    // Reconcile blood request status
    const targetRequestId = reservation.blood_request_id || reservation.bloodRequestId;
    if (targetRequestId) {
      bloodRequestStore.reconcileRequest(targetRequestId);
    }

    // Notify requesting hospital that units are dispatched / in transit
    const request = targetRequestId ? bloodRequestStore.get(targetRequestId) : null;
    if (request) {
      inAppNotificationStore.create({
        userId: request.requested_by,
        organizationId: request.hospital_id,
        type: "blood_request",
        title: `Blood Units Issued & In Transit (${reservation.quantity} Units ${reservation.blood_group || reservation.bloodGroup})`,
        message: `${organization.name} has dispatched ${reservation.quantity} units of ${reservation.blood_group || reservation.bloodGroup}. Ready for reception.`,
        data: {
          blood_request_id: targetRequestId,
          reservation_id: reservation.id,
          transporter_details: data.transporterDetails,
        },
      });
    }

    // Audit Log
    try {
      await (supabase.from("audit_logs") as any).insert({
        user_id: user.id,
        organization_id: organization.id,
        action: "RESERVATION_ISSUED",
        entity_type: "blood_reservations",
        entity_id: data.reservationId,
        metadata: {
          quantity: reservation.quantity,
          blood_group: reservation.bloodGroup,
          transporter: data.transporterDetails,
        },
      });
    } catch {}

    revalidatePath("/hospital/blood-requests");
    revalidatePath("/hospital/inventory");
    revalidatePath("/hospital/inventory/transactions");

    return {
      success: true,
      message: `Successfully issued ${reservation.quantity} units of ${reservation.bloodGroup}. Stock ledger updated.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to issue blood reservation." };
  }
}

/**
 * Confirms receipt / delivery of issued blood units at the hospital
 */
export async function confirmDeliveryAction(data: {
  reservationId: string;
  receivedNotes?: string;
}) {
  try {
    const { user, organization } = await requireBloodBankClearance("blood_inventory.manage");
    const supabase = await createClient();

    const reservation = reservationStore.getReservation(data.reservationId);
    if (!reservation) {
      return { success: false, error: "Reservation not found." };
    }

    // Ensure requesting hospital is confirming
    const reqHospId = reservation.requesting_hospital_id || reservation.requestingHospitalId;
    const srcOrgId = reservation.source_organization_id || reservation.sourceOrgId;
    if (reqHospId !== organization.id && srcOrgId !== organization.id) {
      return { success: false, error: "Forbidden: Not authorized to confirm delivery for this reservation." };
    }

    // Confirm receipt in reservationStore
    const confirmRes = await reservationStore.confirmReceipt(data.reservationId, data.receivedNotes);
    if (!confirmRes.success) {
      return { success: false, error: confirmRes.error || "Failed to confirm receipt." };
    }

    // Reconcile and record receipt in Blood Request store
    const reqId = reservation.blood_request_id || reservation.bloodRequestId;
    if (reqId) {
      bloodRequestStore.recordReceipt(reqId, reservation.quantity);
    }

    // Record hospital inventory addition if incoming from external blood bank
    if (srcOrgId !== organization.id) {
      inventoryStore.adjustStock(
        organization.id,
        reservation.blood_group || reservation.bloodGroup || "O+",
        "add",
        reservation.quantity,
        "External blood bank delivery received",
        user.id,
        `Received from ${reservation.source_organization_name || reservation.sourceOrgName}. Reservation ${reservation.id}`
      );
    }

    // Audit Log
    try {
      await (supabase.from("audit_logs") as any).insert({
        user_id: user.id,
        organization_id: organization.id,
        action: "DELIVERY_CONFIRMED",
        entity_type: "blood_reservations",
        entity_id: data.reservationId,
        metadata: {
          received_by: user.id,
          hospital_id: organization.id,
        },
      });
    } catch {}

    revalidatePath("/hospital/blood-requests");
    revalidatePath("/hospital/inventory");

    return { success: true, message: "Delivery confirmed. Units added to facility stock ledger." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to confirm delivery." };
  }
}
