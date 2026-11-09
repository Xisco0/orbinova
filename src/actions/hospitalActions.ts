"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { staffStore } from "@/services/staffStore";
import { donorStore } from "@/services/donorStore";
import { donorRequestStore } from "@/services/donorRequestStore";
import { bloodRequestStore, StoredBloodRequestRecord } from "@/services/bloodRequestStore";
import { inventoryStore } from "@/services/inventoryStore";
import { bloodRequestWorkflow } from "@/services/bloodRequestWorkflow";
import { screeningStore, ScreeningType, MedicalEligibility } from "@/services/screeningStore";
import { inAppNotificationStore } from "@/services/inAppNotificationStore";
import { centralizedAuditService } from "@/services/centralizedAuditService";
import { orbinovaEmail } from "@/lib/email";
import { emailService } from "@/services/emailService";
import { validateEmailUniqueness, validateScopedEmailUniqueness } from "@/lib/auth/emailUniqueness";
import { generateUniqueDonorReference, getDonorDisplayReference } from "@/lib/donor/donorReference";
import { validateDonorDateOfBirth } from "@/lib/donor/donorValidation";
import crypto from "crypto";
import {
  assertApprovedInstitution,
  assertOrgAccess,
  hasPermission,
} from "@/lib/auth/rbac";
import {
  BloodGroupCode,
  RequestUrgency,
  OrgMemberRole,
  InventoryTxType,
  DonorEligibility,
} from "@/types/database";
import { revalidatePath } from "next/cache";
import { cacheManager } from "@/lib/cache/cacheManager";

/**
 * Server-side clearance guard for hospital operations
 */
async function requireOrgClearance(requiredPermission?: string) {
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
    const isInstitutionAdmin = context.isOwner || context.isManager;
    const authorized =
      isInstitutionAdmin ||
      hasPermission(
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
 * Creates a new emergency or routine blood request with strict multi-tenant validation
 */
export async function createBloodRequestAction(data: {
  bloodGroup: BloodGroupCode;
  unitsRequired: number;
  urgency: RequestUrgency;
  requiredBy?: string | null;
  notes?: string | null;
}) {
  try {
    const { user, organization } = await requireOrgClearance("blood_requests.create");
    const supabase = await createClient();

    // 1. Validate Urgency
    const validUrgencies: RequestUrgency[] = ["emergency", "urgent", "normal"];
    if (!data.urgency || !validUrgencies.includes(data.urgency)) {
      return { success: false, error: "Please select a valid urgency priority level." };
    }

    // 2. Validate Blood Group
    const validBloodGroups: BloodGroupCode[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    if (!data.bloodGroup || !validBloodGroups.includes(data.bloodGroup)) {
      return { success: false, error: "Please select a valid blood group." };
    }

    // 3. Validate Units Required
    const units = Number(data.unitsRequired);
    if (isNaN(units) || !Number.isInteger(units) || units < 1) {
      return { success: false, error: "Units required must be at least 1 whole bag (450ml)." };
    }
    if (units > 50) {
      return { success: false, error: "Units required cannot exceed 50 bags per single broadcast request." };
    }

    // 4. Validate Preferred Date & Time (Must be in the future, never in the past)
    let validatedRequiredBy: string | null = null;
    if (data.requiredBy && data.requiredBy.trim()) {
      const parsedTime = Date.parse(data.requiredBy);
      if (isNaN(parsedTime)) {
        return { success: false, error: "Please provide a valid required date and time." };
      }
      const reqDate = new Date(parsedTime);
      const now = new Date();
      // Allow 60-second grace window for user submission lag
      if (reqDate.getTime() < now.getTime() - 60000) {
        return {
          success: false,
          error: "The required date and time cannot be in the past. Please select a future date and time.",
        };
      }
      // Upper bound check: at most 90 days in future
      const maxFuture = new Date();
      maxFuture.setDate(maxFuture.getDate() + 90);
      if (reqDate > maxFuture) {
        return {
          success: false,
          error: "The required date cannot exceed 90 days from today.",
        };
      }
      validatedRequiredBy = reqDate.toISOString();
    }

    // 5. Validate Clinical / Operational Notes
    let validatedNotes: string | null = null;
    if (data.notes && data.notes.trim()) {
      const cleanNotes = data.notes.trim();
      if (cleanNotes.length > 1000) {
        return {
          success: false,
          error: "Clinical notes cannot exceed 1,000 characters.",
        };
      }
      validatedNotes = cleanNotes;
    }

    const requestId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // 6. Execute Inventory-First Blood Request Workflow:
    // Hospital own stock -> Internal blood bank -> External blood banks -> Donor matching for remaining shortage ONLY
    const workflowResult = await bloodRequestWorkflow.processHospitalRequest({
      requestId,
      hospitalId: organization.id,
      hospitalName: organization.name,
      hospitalCity: organization.city,
      hospitalState: organization.state,
      bloodGroup: data.bloodGroup,
      componentType: "red_cells",
      unitsRequired: units,
      urgency: data.urgency,
      requiredBy: validatedRequiredBy,
      notes: validatedNotes,
      actorUserId: user.id,
      latitude: organization.latitude,
      longitude: organization.longitude,
    });

    // 7. Resilient Supabase database insert
    try {
      const dbPayload = {
        id: requestId,
        hospital_id: organization.id,
        blood_group: data.bloodGroup,
        units_needed: units,
        units_fulfilled: workflowResult.unitsFulfilled,
        urgency: data.urgency,
        status: workflowResult.finalStatus,
        notes: validatedRequiredBy
          ? `[Required By: ${new Date(validatedRequiredBy).toLocaleString()}] ${validatedNotes || ""}`.trim()
          : validatedNotes,
      };

      await (supabase.from("blood_requests") as any).insert(dbPayload);
    } catch (dbErr: any) {
      console.warn("Resilient blood_requests DB insert fallback:", dbErr?.message || dbErr);
    }

    // 8. Record Audit Log
    try {
      await (supabase.from("audit_logs") as any).insert({
        user_id: user.id,
        organization_id: organization.id,
        action: "BLOOD_REQUEST_CREATED",
        entity_type: "blood_requests",
        entity_id: requestId,
        metadata: {
          blood_group: data.bloodGroup,
          units_required: units,
          units_fulfilled: workflowResult.unitsFulfilled,
          remaining_shortage: workflowResult.remainingShortage,
          urgency: data.urgency,
          required_by: validatedRequiredBy,
          workflow_summary: workflowResult.summary,
        },
      });
    } catch {}

    // 9. Dispatch Background Email Notifications via Outbox Pattern
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const reviewUrl = `${appUrl}/hospital/blood-requests/${requestId}`;

      // Broadcast to matching blood banks for awareness / coordination
      await orbinovaEmail.broadcastBloodRequest({
        bloodBankEmails: ["bloodbank@orbinova.com"],
        hospitalName: organization.name,
        requestId,
        bloodGroup: data.bloodGroup,
        unitsRequired: units,
        urgency: data.urgency,
        requiredBy: validatedRequiredBy,
        clinicalNotes: validatedNotes,
        reviewUrl,
        useOutbox: true,
      });
    } catch (notifErr: any) {
      console.warn("Background notification dispatch deferred:", notifErr?.message);
    }

    cacheManager.invalidateBloodRequests(organization.id);
    revalidatePath("/hospital/blood-requests");
    revalidatePath("/hospital/dashboard");
    revalidatePath("/hospital");

    return {
      success: true,
      requestId,
      unitsFulfilled: workflowResult.unitsFulfilled,
      remainingShortage: workflowResult.remainingShortage,
      status: workflowResult.finalStatus,
      message: workflowResult.summary,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to create blood request.",
    };
  }
}

/**
 * Cancels an active blood request
 */
export async function cancelBloodRequestAction(
  requestId: string,
  reason?: string
) {
  try {
    const { user, organization } = await requireOrgClearance("blood_requests.manage");
    const supabase = await createClient();

    // 1. Authoritative cancellation in bloodRequestStore
    bloodRequestStore.updateStatus(requestId, "cancelled");

    // 2. Resilient DB update
    try {
      await (supabase.from("blood_requests") as any)
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);
    } catch {}

    // Record Audit Log
    try {
      await (supabase.from("audit_logs") as any).insert({
        user_id: user.id,
        organization_id: organization.id,
        action: "BLOOD_REQUEST_CANCELLED",
        entity_type: "blood_requests",
        entity_id: requestId,
        metadata: { reason: reason || "User cancelled" },
      });
    } catch {}

    revalidatePath("/hospital/blood-requests");
    revalidatePath(`/hospital/blood-requests/${requestId}`);
    revalidatePath("/hospital/dashboard");

    return { success: true, message: "Blood request cancelled." };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to cancel request.",
    };
  }
}

/**
 * Performs controlled manual inventory adjustment and records transaction ledger entry
 */
export async function adjustHospitalInventoryAction(data: {
  bloodGroup: BloodGroupCode;
  adjustmentDirection: "add" | "remove" | "set";
  quantity: number;
  reason: string;
  notes?: string;
}) {
  try {
    const { user, organization } = await requireOrgClearance("blood_inventory.manage");
    const supabase = await createClient();

    if (data.quantity < 0) {
      return { success: false, error: "Quantity cannot be negative." };
    }

    // 1. Fetch current inventory from Store & Supabase
    const storeItem = inventoryStore.getItem(organization.id, data.bloodGroup);
    let currentQty = storeItem.quantity || 0;
    let currentReserved = storeItem.reserved_quantity || 0;

    try {
      const { data: currentInvData } = await supabase
        .from("blood_inventory")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("blood_group", data.bloodGroup)
        .maybeSingle();

      const currentInv = currentInvData as any;
      if (currentInv && typeof currentInv.quantity === "number") {
        if (currentInv.quantity > 0 && currentQty === 0) {
          currentQty = currentInv.quantity;
        }
        if (typeof currentInv.reserved_quantity === "number") {
          currentReserved = currentInv.reserved_quantity;
        }
      }
    } catch {}

    let newQty = currentQty;

    if (data.adjustmentDirection === "add") {
      newQty = currentQty + data.quantity;
    } else if (data.adjustmentDirection === "remove") {
      newQty = Math.max(0, currentQty - data.quantity);
    } else {
      newQty = data.quantity;
    }

    if (newQty < currentReserved) {
      return {
        success: false,
        error: `Cannot reduce total units below reserved units (${currentReserved} units reserved).`,
      };
    }

    // 2. Persist to Authoritative Local Store
    inventoryStore.setQuantity(organization.id, data.bloodGroup, newQty, currentReserved);
    inventoryStore.recordTransaction({
      organization_id: organization.id,
      blood_group: data.bloodGroup,
      transaction_type: "manual_adjustment" as InventoryTxType,
      quantity: data.quantity,
      reference_id: null,
      notes: `${data.reason}: ${data.notes || "No additional notes"}`,
      created_by: user.id,
    });

    // 3. Sync to Supabase & Ledger
    try {
      await (supabase
        .from("blood_inventory") as any)
        .upsert(
          {
            organization_id: organization.id,
            blood_group: data.bloodGroup,
            quantity: newQty,
            reserved_quantity: currentReserved,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,blood_group" }
        );

      await (supabase.from("blood_inventory_transactions") as any).insert({
        organization_id: organization.id,
        blood_group: data.bloodGroup,
        transaction_type: "manual_adjustment" as InventoryTxType,
        quantity: data.quantity,
        notes: `${data.reason}: ${data.notes || "No additional notes"}`,
        created_by: user.id,
      });

      await (supabase.from("audit_logs") as any).insert({
        user_id: user.id,
        organization_id: organization.id,
        action: "INVENTORY_MANUAL_ADJUSTMENT",
        entity_type: "blood_inventory",
        metadata: {
          blood_group: data.bloodGroup,
          previous_quantity: currentQty,
          new_quantity: newQty,
          reason: data.reason,
        },
      });
    } catch (remoteSyncErr: any) {
      console.warn("Remote Supabase inventory sync deferred:", remoteSyncErr?.message);
    }

    // 4. Trigger Inventory Low-Stock Alert if units <= 2
    if (newQty <= 2) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      orbinovaEmail
        .sendInventoryAlert({
          managerEmails: [organization.email || "hospital@orbinova.com"],
          facilityName: organization.name,
          alertType: "low_stock",
          bloodGroup: data.bloodGroup,
          currentUnits: newQty,
          thresholdUnits: 2,
          inventoryUrl: `${appUrl}/hospital/inventory`,
          facilityId: organization.id,
        })
        .catch(() => {});
    }

    cacheManager.invalidateInventory(organization.id);
    revalidatePath("/hospital/inventory");
    revalidatePath("/hospital/inventory/transactions");
    revalidatePath("/hospital/dashboard");

    return {
      success: true,
      message: `Stock updated for ${data.bloodGroup}. New total: ${newQty} units.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to adjust inventory.",
    };
  }
}

/**
 * Records a completed blood donation at the facility
 */
export async function recordHospitalDonationAction(data: {
  donorId: string;
  bloodGroup: BloodGroupCode;
  unitsDonated: number;
  donationDate: string;
  bloodRequestId?: string | null;
  donorRequestId?: string | null;
  notes?: string | null;
}) {
  try {
    const { user, organization } = await requireOrgClearance("donors.register");
    const supabase = await createClient();

    if (!data.donorId) return { success: false, error: "Donor ID is required." };
    if (!data.bloodGroup) return { success: false, error: "Blood group is required." };
    if (!data.unitsDonated || data.unitsDonated <= 0) {
      return { success: false, error: "Units donated must be at least 1." };
    }

    // 1. Insert donation record
    let createdDonation: any = { id: `don-${Date.now()}` };
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.donorId);
      let targetDonorId = data.donorId;
      if (!isUuid) {
        const dObj = donorStore.get(data.donorId);
        if (dObj?.donorProfileId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dObj.donorProfileId)) {
          targetDonorId = dObj.donorProfileId;
        } else if (dObj?.userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dObj.userId)) {
          targetDonorId = dObj.userId;
        } else {
          targetDonorId = "d0000004-0000-0000-0000-000000000004";
        }
      }

      const { data: dbDonation, error: donErr } = await (supabase
        .from("donations") as any)
        .insert({
          donor_id: targetDonorId,
          organization_id: organization.id,
          blood_request_id: data.bloodRequestId || null,
          donor_request_id: data.donorRequestId || null,
          blood_group: data.bloodGroup,
          units_donated: data.unitsDonated,
          donation_date: data.donationDate || new Date().toISOString(),
          status: "completed",
          notes: data.notes || null,
          recorded_by: user.id,
        })
        .select()
        .single();

      if (!donErr && dbDonation) {
        createdDonation = dbDonation;
      }
    } catch (dbErr: any) {
      console.warn("Donation DB notice:", dbErr?.message);
    }

    // 2. Add units to blood_inventory through proper transaction mechanism
    const storeItem = inventoryStore.getItem(organization.id, data.bloodGroup);
    let curQty = storeItem.quantity || 0;

    try {
      const { data: curInvData } = await supabase
        .from("blood_inventory")
        .select("quantity")
        .eq("organization_id", organization.id)
        .eq("blood_group", data.bloodGroup)
        .maybeSingle();

      const curInv = curInvData as any;
      if (curInv && typeof curInv.quantity === "number" && curInv.quantity > 0 && curQty === 0) {
        curQty = curInv.quantity;
      }
    } catch {}

    const newQty = curQty + data.unitsDonated;

    inventoryStore.setQuantity(organization.id, data.bloodGroup, newQty);
    inventoryStore.recordTransaction({
      organization_id: organization.id,
      blood_group: data.bloodGroup,
      transaction_type: "donation_received" as InventoryTxType,
      quantity: data.unitsDonated,
      reference_id: createdDonation.id,
      notes: `Verified donation received at ${organization.name}`,
      created_by: user.id,
    });

    try {
      await (supabase.from("blood_inventory") as any).upsert(
        {
          organization_id: organization.id,
          blood_group: data.bloodGroup,
          quantity: newQty,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,blood_group" }
      );

      // 3. Record transaction
      await (supabase.from("blood_inventory_transactions") as any).insert({
        organization_id: organization.id,
        blood_group: data.bloodGroup,
        transaction_type: "donation_received" as InventoryTxType,
        quantity: data.unitsDonated,
        reference_id: createdDonation.id,
        notes: `Verified donation received at ${organization.name}`,
        created_by: user.id,
      });
    } catch {}

    // 4. Record Audit Log
    await (supabase.from("audit_logs") as any).insert({
      user_id: user.id,
      organization_id: organization.id,
      action: "DONATION_RECORDED",
      entity_type: "donations",
      entity_id: createdDonation.id,
      metadata: {
        blood_group: data.bloodGroup,
        units: data.unitsDonated,
        donor_id: data.donorId,
      },
    });

    // 5. Update linked blood request and candidate donor request if applicable
    if (data.bloodRequestId) {
      bloodRequestStore.recordReceipt(data.bloodRequestId, data.unitsDonated);
    }
    if (data.donorRequestId) {
      donorRequestStore.updateStatus(data.donorRequestId, "completed");
    }

    revalidatePath("/hospital/donations");
    revalidatePath("/hospital/inventory");
    revalidatePath("/hospital/dashboard");

    return {
      success: true,
      message: `Donation of ${data.unitsDonated} units (${data.bloodGroup}) recorded and added to facility inventory.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to record donation.",
    };
  }
}

/**
 * Updates organization profile details (phone, address, city, state, license)
 */
export async function updateOrganizationProfileAction(
  orgId: string,
  data: {
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    latitude?: number | null;
    longitude?: number | null;
    licenseNumber?: string;
  }
) {
  try {
    const { user, organization, isManager } = await requireOrgClearance();
    const supabase = await createClient();

    if (!isManager || organization.id !== orgId) {
      return {
        success: false,
        error: "Unauthorized: Manager or Owner access required.",
      };
    }

    const { error } = await (supabase.from("organizations") as any)
      .update({
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country || undefined,
        postal_code: data.postalCode || undefined,
        latitude: data.latitude !== undefined ? data.latitude : undefined,
        longitude: data.longitude !== undefined ? data.longitude : undefined,
        license_number: data.licenseNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);

    if (error) throw new Error(error.message);

    // Record Audit Log
    await (supabase.from("audit_logs") as any).insert({
      user_id: user.id,
      organization_id: orgId,
      action: "ORGANIZATION_PROFILE_UPDATED",
      entity_type: "organizations",
      entity_id: orgId,
      metadata: data,
    });

    revalidatePath("/hospital/organization");
    revalidatePath("/hospital/dashboard");

    return { success: true, message: "Organization details updated." };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to update profile.",
    };
  }
}

/**
 * Updates a member's role (owner, manager, staff)
 */
export async function updateMemberRoleAction(
  memberId: string,
  newRole: OrgMemberRole
) {
  try {
    const { user, organization } = await requireOrgClearance("staff.manage");
    const supabase = await createClient();

    const { error } = await (supabase.from("organization_members") as any)
      .update({ member_role: newRole, updated_at: new Date().toISOString() })
      .eq("id", memberId)
      .eq("organization_id", organization.id);

    if (error) throw new Error(error.message);

    // Audit Log
    await (supabase.from("audit_logs") as any).insert({
      user_id: user.id,
      organization_id: organization.id,
      action: "MEMBER_ROLE_UPDATED",
      entity_type: "organization_members",
      entity_id: memberId,
      metadata: { new_role: newRole },
    });

    revalidatePath("/hospital/members");

    return { success: true, message: `Member role updated to ${newRole}.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update member role." };
  }
}

/**
 * Toggles a member's active status
 */
export async function toggleMemberActiveAction(
  memberId: string,
  isActive: boolean
) {
  try {
    const { user, organization } = await requireOrgClearance("staff.manage");
    const supabase = await createClient();

    let targetUserId = memberId.startsWith("member-") ? memberId.replace("member-", "") : null;

    if (!targetUserId) {
      // Find user_id from organization_members
      const { data: memberRow } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("id", memberId)
        .eq("organization_id", organization.id)
        .maybeSingle();

      targetUserId = (memberRow as any)?.user_id;
    }

    // 1. Update organization_members if record exists
    if (!memberId.startsWith("member-")) {
      await (supabase.from("organization_members") as any)
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", memberId)
        .eq("organization_id", organization.id);
    } else if (targetUserId) {
      await (supabase.from("organization_members") as any)
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("user_id", targetUserId)
        .eq("organization_id", organization.id);
    }

    // 2. Also synchronize profile status so account is suspended/reactivated
    if (targetUserId) {
      await (supabase.from("profiles") as any)
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", targetUserId);
    }

    const effectiveUserId = targetUserId || (memberId.startsWith("member-") ? memberId.replace("member-", "") : memberId);

    // Look up profile if available for fallback info
    let profileData: any = null;
    try {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", effectiveUserId).maybeSingle();
      profileData = p;
    } catch {}

    // Persist in authoritative staffStore with organization scoping and fallback details
    staffStore.updateStatus(effectiveUserId, isActive, organization.id, {
      fullName: profileData?.full_name,
      email: profileData?.email,
      role: profileData?.role,
    });
    staffStore.updateStatus(memberId, isActive, organization.id, {
      fullName: profileData?.full_name,
      email: profileData?.email,
      role: profileData?.role,
    });

    // 3. Audit Log
    await (supabase.from("audit_logs") as any).insert({
      user_id: user.id,
      organization_id: organization.id,
      action: isActive ? "MEMBER_REACTIVATED" : "MEMBER_SUSPENDED",
      entity_type: "organization_members",
      entity_id: memberId,
      metadata: { is_active: isActive, user_id: targetUserId },
    });

    revalidatePath("/hospital/members");

    return {
      success: true,
      message: `Staff member ${isActive ? "reactivated" : "suspended"} successfully.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update member status." };
  }
}

/**
 * Marks a notification as read
 */
export async function markHospitalNotificationReadAction(notificationId: string) {
  try {
    const { user } = await requireOrgClearance();
    const supabase = await createClient();

    await (supabase.from("notifications") as any)
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    revalidatePath("/hospital/notifications");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Marks all notifications as read
 */
export async function markAllHospitalNotificationsReadAction() {
  try {
    const { user } = await requireOrgClearance();
    const supabase = await createClient();

    await (supabase.from("notifications") as any)
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false);

    revalidatePath("/hospital/notifications");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Triggers the smart donor matching algorithm for a blood request
 */
export async function triggerMatchingRunAction(
  bloodRequestId: string,
  options?: { radiusKm?: number; batchSize?: number }
) {
  try {
    const { user, organization } = await requireOrgClearance();
    const { matchingEngine } = await import("@/lib/matching");

    const result = await matchingEngine.executeMatchingRun(bloodRequestId, {
      ...options,
      actorUserId: user.id,
    });

    if (result.success) {
      revalidatePath(`/hospital/blood-requests/${bloodRequestId}`);
      revalidatePath("/hospital/blood-requests");
      revalidatePath("/hospital/donor-requests");
      revalidatePath("/hospital/dashboard");
      revalidatePath("/admin/matching");
    }

    return result;
  } catch (err: any) {
    return {
      success: false,
      bloodRequestId,
      donorsConsidered: 0,
      donorsEligible: 0,
      donorsNotified: 0,
      selectedCandidates: [],
      matchingState: "failed",
      isFulfilled: false,
      message: err.message || "Failed to trigger matching run.",
      error: err.message,
    };
  }
}

/**
 * Registers a new voluntary donor directly under this facility
 */
export async function registerHospitalDonorAction(data: {
  fullName?: string;
  firstName?: string;
  otherNames?: string;
  surname?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  bloodGroup: BloodGroupCode;
  country?: string;
  countryCode?: string;
  state?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationConsent?: boolean;
  eligibilityStatus?: DonorEligibility;
}) {
  try {
    let cleanName = data.fullName?.trim();
    if (!cleanName && (data.firstName || data.surname)) {
      cleanName = [data.firstName?.trim(), data.otherNames?.trim(), data.surname?.trim()]
        .filter(Boolean)
        .join(" ");
    }

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: "Please enter a valid donor name (First name and Surname required)." };
    }

    const rawEmail = data.email?.trim().toLowerCase();
    if (!rawEmail || rawEmail.length === 0) {
      return { success: false, error: "Email address is required." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail)) {
      return { success: false, error: "Please enter a valid email address." };
    }

    if (rawEmail.endsWith("@orbinova.local") || rawEmail.endsWith(".local") || rawEmail.endsWith("@example.com")) {
      return { success: false, error: "A valid, real email address is required. Placeholder emails are not permitted." };
    }

    // Table-Level Email Uniqueness Guard (Scope: Donor)
    // Enforces donor-level uniqueness while permitting verified existing staff accounts to link their identity
    const emailUniqueness = await validateScopedEmailUniqueness(rawEmail, "donor", {
      candidateName: cleanName,
    });
    if (!emailUniqueness.isUnique) {
      return {
        success: false,
        error: emailUniqueness.error || "A voluntary donor is already registered with this email address.",
      };
    }

    const cleanEmail = rawEmail;
    const isLinkedAccount = emailUniqueness.isExistingCentralUser === true;
    let targetUserId = emailUniqueness.existingUserId;

    if (!data.bloodGroup) {
      return { success: false, error: "Please select a valid blood group." };
    }

    if (data.dateOfBirth) {
      const dobValidation = validateDonorDateOfBirth(data.dateOfBirth);
      if (!dobValidation.valid) {
        return {
          success: false,
          error: dobValidation.error || "Donor must be between 18 and 70 years of age.",
        };
      }
    }

    const { user, organization } = await requireOrgClearance("donors.register");
    const supabase = await createClient();

    if (!targetUserId) {
      const hash = crypto.createHash("md5").update(cleanEmail).digest("hex");
      targetUserId = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
    }

    const hash2 = crypto.createHash("sha256").update(cleanEmail + "-profile-" + Date.now()).digest("hex");
    const donorProfileId = `${hash2.substring(0, 8)}-${hash2.substring(8, 12)}-4${hash2.substring(13, 16)}-b${hash2.substring(17, 20)}-${hash2.substring(20, 32)}`;
    const donorRef = generateUniqueDonorReference();

    const firstName = data.firstName?.trim() || cleanName.split(" ")[0];
    const surname = data.surname?.trim() || cleanName.split(" ").slice(1).join(" ") || "";
    const otherNames = data.otherNames?.trim() || null;
    const country = data.country?.trim() || "Nigeria";
    const state = data.state?.trim() || "Lagos";
    const city = data.city?.trim() || "Lagos";
    const district = data.district?.trim() || null;
    const postalCode = data.postalCode?.trim() || null;
    const latitude = data.latitude !== undefined ? data.latitude : null;
    const longitude = data.longitude !== undefined ? data.longitude : null;
    const locationConsent = data.locationConsent ?? true;
    const nowIso = new Date().toISOString();

    // Upsert into Supabase profiles:
    // If this is an existing user account (e.g. staff member), DO NOT overwrite their role or credentials!
    try {
      if (!isLinkedAccount) {
        await (supabase.from("profiles") as any).upsert({
          id: targetUserId,
          email: cleanEmail,
          full_name: cleanName,
          phone: data.phone?.trim() || null,
          role: "donor",
          is_active: true,
          updated_at: nowIso,
        });
      } else {
        await (supabase.from("profiles") as any)
          .update({
            updated_at: nowIso,
            ...(data.phone ? { phone: data.phone.trim() } : {}),
          })
          .eq("id", targetUserId);
      }

      await (supabase.from("donor_profiles") as any).upsert({
        id: donorProfileId,
        user_id: targetUserId,
        donor_number: donorRef,
        organization_id: organization.id,
        registering_organization_id: organization.id,
        first_name: firstName,
        other_names: otherNames,
        surname: surname,
        blood_group: data.bloodGroup,
        country: country,
        state: state,
        city: city,
        district: district,
        postal_code: postalCode,
        latitude: latitude,
        longitude: longitude,
        location_consent: locationConsent,
        location_updated_at: nowIso,
        availability_status: "available",
        eligibility_status: data.eligibilityStatus || "eligible",
        updated_at: nowIso,
      });
    } catch (e: any) {
      console.warn("Direct donor upsert notice:", e?.message);
    }

    // Authoritative persistence in donorStore with institutional ownership & location data
    donorStore.save({
      userId: targetUserId,
      donorProfileId,
      donorNumber: donorRef,
      organizationId: organization.id,
      registeringOrganizationId: organization.id,
      fullName: cleanName,
      firstName,
      otherNames: otherNames || undefined,
      surname,
      email: cleanEmail,
      phone: data.phone?.trim() || undefined,
      dateOfBirth: data.dateOfBirth || null,
      gender: data.gender || null,
      bloodGroup: data.bloodGroup,
      country,
      countryCode: data.countryCode || undefined,
      state,
      city,
      district: district || undefined,
      postalCode: postalCode || undefined,
      latitude,
      longitude,
      locationConsent,
      locationUpdatedAt: nowIso,
      eligibilityStatus: data.eligibilityStatus || "eligible",
      availabilityStatus: "available",
      isActive: true,
      lastDonationDate: null,
      updatedAt: nowIso,
    });

    // Centralized Tamper-Evident Audit Logging
    try {
      await centralizedAuditService.record({
        action: isLinkedAccount ? "DONOR_PROFILE_LINKED_TO_EXISTING_USER" : "DONOR_REGISTERED_BY_FACILITY",
        category: "donor_management",
        entityType: "donor_profiles",
        entityId: donorProfileId,
        organizationId: organization.id,
        userId: user.id,
        description: isLinkedAccount
          ? `Donor profile (${donorRef}) linked to existing verified account (${cleanEmail}) by ${organization.name}`
          : `New voluntary donor (${donorRef}) registered by ${organization.name}`,
        metadata: {
          donor_name: cleanName,
          email: cleanEmail,
          blood_group: data.bloodGroup,
          donorRef,
          isLinkedAccount,
          linkedUserId: targetUserId,
        },
      });
    } catch {}

    // Dispatch welcome email with credentials to donor (or account-linked notice)
    try {
      await emailService.sendDonorWelcomeEmail({
        toEmail: cleanEmail,
        fullName: cleanName,
        bloodGroup: data.bloodGroup,
        organizationName: organization.name || "Facility Voluntary Donor Registry",
        defaultPassword: isLinkedAccount ? undefined : "DonorPassword2026!",
        organizationId: organization.id,
      });
    } catch (emailErr) {
      console.warn("Notice: Donor welcome email dispatch:", emailErr);
    }

    cacheManager.invalidateDonors(organization.id);
    revalidatePath("/hospital/donors");
    revalidatePath("/hospital/donations");

    return {
      success: true,
      message: isLinkedAccount
        ? `Donor profile for ${cleanName} (${data.bloodGroup}) successfully created and linked to their existing ORBINOVA account.`
        : `Donor ${cleanName} (${data.bloodGroup}) registered under ${organization.name}.`,
      donorId: donorProfileId,
      donorNumber: donorRef,
      donorRef,
      isLinkedAccount,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to register donor." };
  }
}

/**
 * Updates a facility donor's details (name, location, phone, blood group, eligibility, status)
 */
export async function updateHospitalDonorAction(data: {
  donorId: string;
  userId?: string;
  fullName?: string;
  firstName?: string;
  otherNames?: string;
  surname?: string;
  email?: string;
  phone?: string;
  bloodGroup: BloodGroupCode;
  country?: string;
  countryCode?: string;
  state?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationConsent?: boolean;
  eligibilityStatus: DonorEligibility;
  isActive: boolean;
}) {
  try {
    const { user, organization } = await requireOrgClearance("donors.register");
    const supabase = await createClient();

    let cleanName = data.fullName?.trim();
    if (!cleanName && (data.firstName || data.surname)) {
      cleanName = [data.firstName?.trim(), data.otherNames?.trim(), data.surname?.trim()]
        .filter(Boolean)
        .join(" ");
    }

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: "Please enter a valid donor name." };
    }

    const cleanUserId = data.userId || (data.donorId.startsWith("donor-") ? data.donorId.replace("donor-", "") : data.donorId);

    // Look up existing donor record to preserve institutional ownership and existing fields
    const existingDonor =
      donorStore.get(data.donorId) ||
      (cleanUserId ? donorStore.get(cleanUserId) : undefined) ||
      (data.email ? donorStore.get(data.email) : undefined);

    // Institutional Ownership Guard:
    // Only the hospital that registered the donor (or an ORBINOVA Super Administrator) can update this donor's record!
    const isSuperAdmin = (user.role as string) === "admin" || (user.role as string) === "super_admin";
    const originalRegisteringOrgId = existingDonor?.registeringOrganizationId || existingDonor?.organizationId;
    if (originalRegisteringOrgId && originalRegisteringOrgId !== organization.id && !isSuperAdmin) {
      return {
        success: false,
        error: "Access Denied: Only the hospital that registered this donor (or an ORBINOVA Super Administrator) can update this donor's record.",
      };
    }

    let resolvedEmail = data.email?.trim().toLowerCase() || existingDonor?.email;
    let resolvedPhone = data.phone !== undefined && data.phone !== "" ? data.phone.trim() : existingDonor?.phone;

    // Safety fallback: query Supabase profiles directly if email or phone is missing
    if ((!resolvedEmail || !resolvedPhone) && cleanUserId) {
      try {
        const { data: dbProf } = await (supabase.from("profiles") as any)
          .select("email, phone")
          .eq("id", cleanUserId)
          .maybeSingle();
        if (!resolvedEmail && dbProf?.email) resolvedEmail = dbProf.email;
        if (!resolvedPhone && dbProf?.phone) resolvedPhone = dbProf.phone;
      } catch {}
    }

    const country = data.country || existingDonor?.country || "Nigeria";
    const state = data.state || existingDonor?.state || "Lagos";
    const city = data.city || existingDonor?.city || "Lagos";
    const district = data.district !== undefined ? data.district : existingDonor?.district;
    const postalCode = data.postalCode !== undefined ? data.postalCode : existingDonor?.postalCode;
    const latitude = data.latitude !== undefined ? data.latitude : existingDonor?.latitude;
    const longitude = data.longitude !== undefined ? data.longitude : existingDonor?.longitude;
    const locationConsent = data.locationConsent !== undefined ? data.locationConsent : (existingDonor?.locationConsent ?? true);
    const nowIso = new Date().toISOString();

    // Preserve original registering institution
    const registeringOrgId = existingDonor?.registeringOrganizationId || existingDonor?.organizationId || organization.id;

    // Update in Supabase where permitted
    try {
      if (cleanUserId) {
        const profileUpdates: any = {
          full_name: cleanName,
          phone: resolvedPhone || null,
          is_active: data.isActive,
          updated_at: nowIso,
        };
        if (resolvedEmail && !resolvedEmail.includes("@orbinova.local")) {
          profileUpdates.email = resolvedEmail;
        }

        await (supabase.from("profiles") as any)
          .update(profileUpdates)
          .eq("id", cleanUserId);
      }

      await (supabase.from("donor_profiles") as any)
        .update({
          blood_group: data.bloodGroup,
          country,
          state,
          city,
          district: district || null,
          postal_code: postalCode || null,
          latitude: latitude || null,
          longitude: longitude || null,
          location_consent: locationConsent,
          location_updated_at: nowIso,
          eligibility_status: data.eligibilityStatus,
          updated_at: nowIso,
        })
        .or(`id.eq.${data.donorId},user_id.eq.${cleanUserId}`);
    } catch {}

    // Authoritative update in donorStore preserving registering institution
    donorStore.save({
      userId: cleanUserId,
      donorProfileId: data.donorId,
      organizationId: registeringOrgId,
      registeringOrganizationId: registeringOrgId,
      fullName: cleanName,
      firstName: data.firstName || existingDonor?.firstName,
      otherNames: data.otherNames || existingDonor?.otherNames,
      surname: data.surname || existingDonor?.surname,
      email: resolvedEmail,
      phone: resolvedPhone || undefined,
      bloodGroup: data.bloodGroup,
      country,
      countryCode: data.countryCode || existingDonor?.countryCode,
      state,
      city,
      district: district || undefined,
      postalCode: postalCode || undefined,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      locationConsent,
      locationUpdatedAt: nowIso,
      eligibilityStatus: data.eligibilityStatus,
      isActive: data.isActive,
      updatedAt: nowIso,
    });

    // Audit Log
    try {
      await (supabase.from("audit_logs") as any).insert({
        user_id: user.id,
        organization_id: organization.id,
        action: "DONOR_PROFILE_UPDATED",
        entity_type: "donor_profiles",
        entity_id: data.donorId,
        details: {
          updated_name: cleanName,
          blood_group: data.bloodGroup,
          country,
          state,
          city,
          district,
          eligibility: data.eligibilityStatus,
          is_active: data.isActive,
        },
      });
    } catch {}

    cacheManager.invalidateDonors(organization.id);
    revalidatePath("/hospital/donors");
    revalidatePath("/hospital/donations");

    return {
      success: true,
      message: `Donor profile for ${cleanName} updated successfully.`,
      donor: {
        id: data.donorId,
        userId: cleanUserId,
        fullName: cleanName,
        email: resolvedEmail,
        phone: resolvedPhone || undefined,
        bloodGroup: data.bloodGroup,
        country,
        state,
        city,
        district,
        eligibilityStatus: data.eligibilityStatus,
        isActive: data.isActive,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update donor." };
  }
}

/**
 * Toggles a donor's active/suspended status directly from the facility table
 */
export async function toggleDonorActiveAction(
  donorId: string,
  isActive: boolean
) {
  try {
    const { user, organization } = await requireOrgClearance("donors.register");
    const supabase = await createClient();

    const cleanId = donorId.startsWith("donor-") ? donorId.replace("donor-", "") : donorId;

    // Update in Supabase where permitted
    try {
      await (supabase.from("profiles") as any)
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", cleanId);

      await (supabase.from("donor_profiles") as any)
        .update({
          verification_status: isActive ? "verified" : "suspended",
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${donorId},user_id.eq.${cleanId}`);
    } catch {}

    // Authoritative persistence in donorStore
    donorStore.updateStatus(cleanId, isActive, organization.id);
    donorStore.updateStatus(donorId, isActive, organization.id);

    // Audit Log
    try {
      await (supabase.from("audit_logs") as any).insert({
        user_id: user.id,
        organization_id: organization.id,
        action: isActive ? "DONOR_REACTIVATED" : "DONOR_SUSPENDED",
        entity_type: "donor_profiles",
        entity_id: donorId,
        details: { is_active: isActive },
      });
    } catch {}

    cacheManager.invalidateDonors(organization.id);
    revalidatePath("/hospital/donors");
    revalidatePath("/hospital/donations");

    return {
      success: true,
      message: `Donor account ${isActive ? "reactivated" : "suspended"} successfully.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update donor status." };
  }
}



// ----------------------------------------------------------------------------
// DONOR SCREENING SCHEDULING & CLINICAL WORKFLOW ACTIONS
// ----------------------------------------------------------------------------

/**
 * Schedules a donor pre-donation screening arrangement (ASAP or Scheduled)
 */
export async function scheduleDonorScreeningAction(params: {
  bloodRequestId: string;
  donorRequestId: string;
  screeningType: ScreeningType;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  instructions?: string | null;
}) {
  try {
    const context = await requireOrgClearance("blood_requests.manage");
    const { user, organization } = context;

    // 1. Verify blood request ownership
    const bloodReq = bloodRequestStore.get(params.bloodRequestId);
    if (!bloodReq) {
      throw new Error("Blood request not found.");
    }
    if (bloodReq.organization_id !== organization.id && bloodReq.hospital_id !== organization.id) {
      throw new Error("Security Violation: You can only schedule screenings for your own hospital's requests.");
    }

    // 2. Resolve donor request
    const donorReq = donorRequestStore.get(params.donorRequestId);
    if (!donorReq) {
      throw new Error("Candidate donor request not found.");
    }

    // 3. Validation for scheduled appointments
    if (params.screeningType === "scheduled") {
      if (!params.scheduledDate) {
        return { success: false, error: "Please select an appointment date." };
      }
      if (!params.scheduledTime) {
        return { success: false, error: "Please select an appointment time slot." };
      }

      // Prevent past appointments
      const today = new Date().toISOString().split("T")[0];
      if (params.scheduledDate < today) {
        return { success: false, error: "Appointment date cannot be in the past." };
      }
    }

    // 4. Resolve donor profile & user id
    const donorRecord = donorStore.get(donorReq.donor_id);
    const donorUserId = donorRecord?.userId || donorReq.donor_id;
    const donorName = donorRecord?.fullName || "Candidate Donor";
    const donorEmail = donorRecord?.email || "";
    const donorPhone = donorRecord?.phone || "";
    const donorRef = getDonorDisplayReference(donorReq.donor_id, (donorReq as any).donor_ref || donorRecord?.donorNumber);

    // Facility address for screening
    const facilityAddress = [organization.address, organization.city, organization.state]
      .filter(Boolean)
      .join(", ") || `${organization.name} Blood Transfusion Center, Nigeria`;

    // 5. Create persistent screening record in screeningStore
    const screening = screeningStore.createScreening({
      bloodRequestId: params.bloodRequestId,
      donorRequestId: params.donorRequestId,
      donorId: donorReq.donor_id,
      donorUserId,
      donorRef,
      donorName,
      donorEmail,
      donorPhone,
      bloodGroup: donorReq.blood_group || bloodReq.blood_group,
      hospitalId: organization.id,
      hospitalName: organization.name,
      hospitalAddress: facilityAddress,
      screeningType: params.screeningType,
      scheduledDate: params.scheduledDate,
      scheduledTime: params.scheduledTime,
      instructions: params.instructions,
      actorUserId: user.id,
    });

    // 6. Send in-app notification to the donor
    const isAsap = params.screeningType === "asap";
    const reqRef = `REQ-${params.bloodRequestId.substring(0, 8).toUpperCase()}`;

    inAppNotificationStore.create({
      userId: donorUserId,
      type: "donor_request",
      title: isAsap
        ? `Immediate Screening Requested by ${organization.name}`
        : `Screening Scheduled for ${params.scheduledDate} at ${organization.name}`,
      message: isAsap
        ? `${organization.name} urgently requests that you attend health screening as soon as possible for Blood Request ${reqRef}. Please confirm your availability.`
        : `${organization.name} has scheduled your health screening for ${params.scheduledDate} at ${params.scheduledTime || "the agreed time"} for Blood Request ${reqRef}. Please confirm your attendance.`,
      data: {
        screening_id: screening.id,
        blood_request_id: params.bloodRequestId,
        donor_request_id: params.donorRequestId,
        screening_type: params.screeningType,
        scheduled_date: params.scheduledDate,
        scheduled_time: params.scheduledTime,
        hospital_name: organization.name,
      },
    });

    // 7. Send email notification via background queue
    if (donorEmail) {
      try {
        await orbinovaEmail.sendDonorScreeningScheduled({
          toEmail: donorEmail,
          donorName,
          hospitalName: organization.name,
          bloodRequestRef: reqRef,
          bloodGroup: donorReq.blood_group || bloodReq.blood_group,
          screeningType: params.screeningType,
          scheduledDate: params.scheduledDate,
          scheduledTime: params.scheduledTime,
          hospitalAddress: facilityAddress,
          instructions: params.instructions,
          portalUrl: `http://localhost:3000/donor/dashboard`,
          screeningId: screening.id,
        });
      } catch (e: any) {
        console.warn("Could not dispatch screening email notification:", e?.message);
      }
    }

    // 8. Record audit log
    try {
      await centralizedAuditService.record({
        userId: user.id,
        actorName: user.full_name,
        actorRole: context.membership.member_role,
        organizationId: organization.id,
        organizationType: organization.organization_type,
        organizationName: organization.name,
        action: "DONOR_SCREENING_SCHEDULED",
        category: "donor_management",
        entityType: "donor_screening",
        entityId: screening.id,
        description: `Scheduled ${params.screeningType.toUpperCase()} screening for donor ${donorRef} on request ${reqRef}`,
        metadata: {
          screeningType: params.screeningType,
          scheduledDate: params.scheduledDate,
          scheduledTime: params.scheduledTime,
          donorRef,
          bloodRequestId: params.bloodRequestId,
        },
      });
    } catch {}

    revalidatePath(`/hospital/blood-requests/${params.bloodRequestId}`);
    revalidatePath(`/hospital/donor-requests/${params.donorRequestId}`);
    revalidatePath("/hospital/donor-requests");
    revalidatePath("/hospital/dashboard");
    revalidatePath("/donor/dashboard");
    revalidatePath("/donor/requests");

    return {
      success: true,
      message: isAsap
        ? "Immediate screening request dispatched. The donor has been notified via email and in-app alert."
        : `Screening appointment scheduled for ${params.scheduledDate} at ${params.scheduledTime}. Donor notified.`,
      screening,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to schedule screening." };
  }
}

/**
 * Reschedules an existing screening arrangement and notifies the donor
 */
export async function rescheduleDonorScreeningAction(params: {
  screeningId: string;
  screeningType: ScreeningType;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  instructions?: string | null;
}) {
  try {
    const context = await requireOrgClearance("blood_requests.manage");
    const { user, organization } = context;

    if (params.screeningType === "scheduled") {
      if (!params.scheduledDate) {
        return { success: false, error: "Please select a new appointment date." };
      }
      if (!params.scheduledTime) {
        return { success: false, error: "Please select a new appointment time." };
      }
      const today = new Date().toISOString().split("T")[0];
      if (params.scheduledDate < today) {
        return { success: false, error: "Appointment date cannot be in the past." };
      }
    }

    const updated = screeningStore.rescheduleAppointment(params.screeningId, organization.id, {
      screeningType: params.screeningType,
      scheduledDate: params.scheduledDate,
      scheduledTime: params.scheduledTime,
      instructions: params.instructions,
      actorUserId: user.id,
    });

    const isAsap = params.screeningType === "asap";
    const reqRef = `REQ-${updated.blood_request_id.substring(0, 8).toUpperCase()}`;

    // Send in-app notification to donor
    inAppNotificationStore.create({
      userId: updated.donor_user_id,
      type: "donor_request",
      title: `Screening Rescheduled by ${organization.name}`,
      message: isAsap
        ? `${organization.name} has updated your screening to immediate attendance (ASAP) for request ${reqRef}. Please confirm your availability.`
        : `${organization.name} has updated your screening appointment to ${params.scheduledDate} at ${params.scheduledTime || "scheduled time"} for request ${reqRef}.`,
      data: {
        screening_id: updated.id,
        blood_request_id: updated.blood_request_id,
        scheduled_date: params.scheduledDate,
        scheduled_time: params.scheduledTime,
      },
    });

    // Send email notification to donor
    if (updated.donor_email) {
      try {
        await orbinovaEmail.sendDonorScreeningRescheduled({
          toEmail: updated.donor_email,
          donorName: updated.donor_name || "Hero",
          hospitalName: organization.name,
          bloodRequestRef: reqRef,
          newDate: params.scheduledDate,
          newTime: params.scheduledTime,
          screeningType: params.screeningType,
          hospitalAddress: updated.hospital_address,
          instructions: params.instructions,
          portalUrl: `http://localhost:3000/donor/dashboard`,
          screeningId: updated.id,
        });
      } catch (e: any) {
        console.warn("Could not dispatch reschedule email:", e?.message);
      }
    }

    // Record audit log
    try {
      await centralizedAuditService.record({
        userId: user.id,
        actorName: user.full_name,
        actorRole: context.membership.member_role,
        organizationId: organization.id,
        organizationType: organization.organization_type,
        organizationName: organization.name,
        action: "DONOR_SCREENING_RESCHEDULED",
        category: "donor_management",
        entityType: "donor_screening",
        entityId: updated.id,
        description: `Rescheduled screening for donor ${updated.donor_ref}`,
      });
    } catch {}

    revalidatePath(`/hospital/blood-requests/${updated.blood_request_id}`);
    revalidatePath(`/hospital/donor-requests/${updated.donor_request_id}`);
    revalidatePath("/hospital/donor-requests");
    revalidatePath("/hospital/dashboard");
    revalidatePath("/donor/dashboard");

    return {
      success: true,
      message: "Screening appointment rescheduled successfully. The donor has been notified.",
      screening: updated,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reschedule screening." };
  }
}

/**
 * Cancels a screening arrangement and notifies the donor
 */
export async function cancelDonorScreeningAction(params: {
  screeningId: string;
  reason: string;
}) {
  try {
    const context = await requireOrgClearance("blood_requests.manage");
    const { user, organization } = context;

    if (!params.reason || !params.reason.trim()) {
      return { success: false, error: "Please provide a reason for cancellation." };
    }

    const cancelled = screeningStore.cancelScreening(
      params.screeningId,
      organization.id,
      params.reason.trim(),
      user.id
    );

    const reqRef = `REQ-${cancelled.blood_request_id.substring(0, 8).toUpperCase()}`;

    // Send in-app notification to donor
    inAppNotificationStore.create({
      userId: cancelled.donor_user_id,
      type: "donor_request",
      title: `Screening Cancelled by ${organization.name}`,
      message: `Your screening session at ${organization.name} for request ${reqRef} has been cancelled. Reason: ${params.reason.trim()}`,
      data: {
        screening_id: cancelled.id,
        blood_request_id: cancelled.blood_request_id,
        reason: params.reason.trim(),
      },
    });

    // Send email notification to donor
    if (cancelled.donor_email) {
      try {
        await orbinovaEmail.sendDonorScreeningCancelled({
          toEmail: cancelled.donor_email,
          donorName: cancelled.donor_name || "Hero",
          hospitalName: organization.name,
          bloodRequestRef: reqRef,
          reason: params.reason.trim(),
          portalUrl: `http://localhost:3000/donor/dashboard`,
          screeningId: cancelled.id,
        });
      } catch (e: any) {
        console.warn("Could not dispatch cancellation email:", e?.message);
      }
    }

    // Record audit log
    try {
      await centralizedAuditService.record({
        userId: user.id,
        actorName: user.full_name,
        actorRole: context.membership.member_role,
        organizationId: organization.id,
        organizationType: organization.organization_type,
        organizationName: organization.name,
        action: "DONOR_SCREENING_CANCELLED",
        category: "donor_management",
        entityType: "donor_screening",
        entityId: cancelled.id,
        description: `Cancelled screening for donor ${cancelled.donor_ref}. Reason: ${params.reason}`,
        reason: params.reason,
      });
    } catch {}

    revalidatePath(`/hospital/blood-requests/${cancelled.blood_request_id}`);
    revalidatePath(`/hospital/donor-requests/${cancelled.donor_request_id}`);
    revalidatePath("/hospital/donor-requests");
    revalidatePath("/hospital/dashboard");
    revalidatePath("/donor/dashboard");

    return {
      success: true,
      message: "Screening arrangement cancelled. The donor has been notified.",
      screening: cancelled,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to cancel screening." };
  }
}

/**
 * Marks screening completed by clinical staff
 * (Screening completion does not automatically imply medical eligibility)
 */
export async function completeDonorScreeningAction(params: {
  screeningId: string;
  notes?: string;
}) {
  try {
    const context = await requireOrgClearance("blood_requests.manage");
    const { user, organization } = context;

    const completed = screeningStore.completeScreening(
      params.screeningId,
      organization.id,
      user.id,
      user.full_name || undefined,
      params.notes
    );

    // Record audit log
    try {
      await centralizedAuditService.record({
        userId: user.id,
        actorName: user.full_name,
        actorRole: context.membership.member_role,
        organizationId: organization.id,
        organizationType: organization.organization_type,
        organizationName: organization.name,
        action: "DONOR_SCREENING_COMPLETED",
        category: "donor_management",
        entityType: "donor_screening",
        entityId: completed.id,
        description: `Completed clinical screening session for donor ${completed.donor_ref}`,
      });
    } catch {}

    revalidatePath(`/hospital/blood-requests/${completed.blood_request_id}`);
    revalidatePath(`/hospital/donor-requests/${completed.donor_request_id}`);
    revalidatePath("/hospital/dashboard");

    return {
      success: true,
      message: "Donor screening completed. You may now record clinical eligibility assessment.",
      screening: completed,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to mark screening completed." };
  }
}

/**
 * Records medical eligibility outcome based on qualified medical personnel assessment
 */
export async function recordMedicalEligibilityAction(params: {
  screeningId: string;
  outcome: MedicalEligibility;
  notes?: string;
  deferralReason?: string;
  deferralUntil?: string;
}) {
  try {
    // Only authorized clinical staff, coordinators or owners may record medical eligibility
    const context = await requireOrgClearance("donors.verify");
    const { user, organization } = context;

    const validOutcomes: MedicalEligibility[] = [
      "eligible",
      "temporarily_deferred",
      "permanently_deferred",
    ];
    if (!validOutcomes.includes(params.outcome)) {
      return { success: false, error: "Please select a valid medical outcome assessment." };
    }

    if (params.outcome === "temporarily_deferred" && !params.deferralUntil) {
      return { success: false, error: "Please specify the deferral return date for temporary deferral." };
    }

    const updated = screeningStore.recordMedicalOutcome(
      params.screeningId,
      organization.id,
      {
        actorUserId: user.id,
        actorName: user.full_name || undefined,
        outcome: params.outcome,
        notes: params.notes,
        deferralReason: params.deferralReason,
        deferralUntil: params.deferralUntil,
      }
    );

    // Record audit log
    try {
      await centralizedAuditService.record({
        userId: user.id,
        actorName: user.full_name,
        actorRole: context.membership.member_role,
        organizationId: organization.id,
        organizationType: organization.organization_type,
        organizationName: organization.name,
        action: `DONOR_ELIGIBILITY_${params.outcome.toUpperCase()}`,
        category: "donor_management",
        entityType: "donor_screening",
        entityId: updated.id,
        description: `Recorded clinical eligibility outcome '${params.outcome}' for donor ${updated.donor_ref}`,
        metadata: {
          outcome: params.outcome,
          deferralUntil: params.deferralUntil,
          deferralReason: params.deferralReason,
        },
      });
    } catch {}

    revalidatePath(`/hospital/blood-requests/${updated.blood_request_id}`);
    revalidatePath(`/hospital/donor-requests/${updated.donor_request_id}`);
    revalidatePath("/hospital/donors");
    revalidatePath("/hospital/dashboard");

    return {
      success: true,
      message: `Medical assessment recorded: Donor is marked as ${params.outcome.replace(/_/g, " ").toUpperCase()}.`,
      screening: updated,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to record medical eligibility." };
  }
}
