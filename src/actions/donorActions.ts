"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DonorAvailability, BloodGroupCode } from "@/types/database";
import { donorStore, StoredDonorOverride } from "@/services/donorStore";
import { donorService } from "@/services/donorService";
import { donorRequestStore } from "@/services/donorRequestStore";
import { screeningStore } from "@/services/screeningStore";
import { inAppNotificationStore } from "@/services/inAppNotificationStore";
import { centralizedAuditService } from "@/services/centralizedAuditService";
import { revalidatePath } from "next/cache";

/**
 * Server-side clearance guard for donor actions
 */
async function requireDonorClearance() {
  const user = await getCurrentUser("donor");
  if (!user || !user.profile?.is_active) {
    throw new Error("Unauthorized: Please sign in to your donor account.");
  }
  return user;
}

/**
 * Updates personal and blood donation details on the donor profile
 * Enforces Institutional Ownership: Donors cannot self-update their records.
 * Only the registering hospital or Super Admin can update donor profiles.
 */
export async function updateDonorProfileAction(data: {
  fullName?: string;
  phone?: string;
  bloodGroup: BloodGroupCode;
  dateOfBirth?: string | null;
  gender?: "male" | "female" | "other" | null;
  city?: string | null;
  state?: string | null;
}) {
  try {
    await requireDonorClearance();
    return {
      success: false,
      error:
        "Institutional Policy: Donor records are institutionally managed. Profile and clinical updates can only be performed by your registering hospital or an ORBINOVA Super Administrator.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to update donor profile.",
    };
  }
}

/**
 * Updates donor availability status (available, temporarily_unavailable, unavailable)
 */
export async function updateAvailabilityAction(
  status: DonorAvailability,
  note?: string
) {
  try {
    const user = await requireDonorClearance();
    const supabase = await createClient();

    // 1. Authoritative update in donorStore
    donorStore.updateAvailability(user.id, status);
    if (user.email) {
      donorStore.updateAvailability(user.email, status);
    }

    // 2. Resilient update in Supabase donor_profiles
    let donorProfileId = `donor-${user.id}`;
    try {
      const { data: donorProfileData } = await (supabase
        .from("donor_profiles") as any)
        .update({
          availability_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (donorProfileData?.id) {
        donorProfileId = donorProfileData.id;
      }
    } catch (e: any) {
      console.warn("Resilient donor_profiles availability update warning:", e?.message);
    }

    // 3. Insert availability history record safely
    try {
      await (supabase.from("donor_availability_history") as any).insert({
        donor_id: donorProfileId,
        status: status,
        notes: note || null,
        changed_by: user.id,
      });
    } catch {}

    // 4. Record Audit Log safely
    try {
      await (supabase.from("audit_logs") as any).insert({
        user_id: user.id,
        action: "DONOR_AVAILABILITY_CHANGED",
        entity_type: "donor_profiles",
        entity_id: donorProfileId,
        metadata: { new_status: status, notes: note || null },
      });
    } catch {}

    revalidatePath("/donor/availability");
    revalidatePath("/donor/dashboard");
    revalidatePath("/donor");

    return {
      success: true,
      message: `Availability updated to ${status.replace("_", " ")}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to update availability status.",
    };
  }
}

/**
 * Accepts a dispatched blood donation request ("I'm Interested")
 * 1. Validates donor account.
 * 2. Rechecks eligibility & availability.
 * 3. Prevents duplicate responses.
 * 4. Saves response to store and Supabase.
 * 5. Notifies hospital's donor coordinator.
 * 6. Records in audit trail.
 */
export async function acceptDonorRequestAction(requestId: string) {
  try {
    const user = await requireDonorClearance();
    const supabase = await createClient();

    // 1. Recheck medical eligibility and availability
    const context = await donorService.getDonorContext(user.id);
    const donorProfile = context?.donorProfile || { id: `donor-${user.id}`, blood_group: "O+" };
    const storedDonor = donorStore.get(user.id) || donorStore.get(user.email || "");

    if (storedDonor) {
      if (storedDonor.eligibilityStatus !== "eligible") {
        return {
          success: false,
          error: "You cannot accept blood donation requests at this time due to temporary medical deferral.",
        };
      }
      if (storedDonor.availabilityStatus === "unavailable") {
        return {
          success: false,
          error: "Your availability is currently set to unavailable. Please update your status first.",
        };
      }
    }

    // 2. Check for duplicate response
    const existingStored = donorRequestStore.get(requestId);
    if (existingStored && (existingStored.status === "interested" || existingStored.status === "accepted")) {
      return {
        success: true,
        message: "You have already confirmed interest in this request. The hospital is reviewing your response.",
      };
    }

    // 3. Update status to 'interested' / 'accepted'
    const now = new Date().toISOString();
    const updatedReq = donorRequestStore.updateStatus(requestId, "interested");

    try {
      await (supabase.from("donor_requests") as any)
        .update({
          status: "accepted",
          responded_at: now,
          updated_at: now,
        })
        .eq("id", requestId);
    } catch (e: any) {
      console.warn("Resilient accept request update warning:", e?.message);
    }

    // 4. In-App Notification to Hospital Donor Coordinator
    if (updatedReq?.hospital_id) {
      inAppNotificationStore.create({
        userId: updatedReq.hospital_id,
        organizationId: updatedReq.hospital_id,
        type: "request_accepted",
        title: "Donor Response: Match Accepted",
        message: `A compatible donor (${storedDonor?.bloodGroup || donorProfile.blood_group}) has expressed interest in Request REQ-${updatedReq.blood_request_id.slice(0, 8).toUpperCase()}.`,
        data: {
          blood_request_id: updatedReq.blood_request_id,
          donor_request_id: requestId,
          donor_id: donorProfile.id,
        },
      });
    }

    // 5. Record Audit Log safely
    try {
      await centralizedAuditService.record({
        userId: user.id,
        actorName: (user.profile as any)?.full_name || user.email || "Donor",
        actorRole: "donor",
        organizationId: updatedReq?.hospital_id || null,
        action: "DONOR_REQUEST_ACCEPTED",
        category: "donor_management",
        entityType: "donor_requests",
        entityId: requestId,
        status: "success",
        description: `Donor accepted compatible blood match for Request REQ-${updatedReq?.blood_request_id.slice(0, 8)}`,
        metadata: {
          request_id: requestId,
          blood_request_id: updatedReq?.blood_request_id,
          donor_id: donorProfile.id,
          status: "interested",
        },
      });
    } catch {}

    revalidatePath("/donor/requests");
    revalidatePath(`/donor/requests/${requestId}`);
    revalidatePath("/donor/dashboard");
    revalidatePath("/donor");

    return {
      success: true,
      message: "Thank you! You have confirmed interest in this blood request. The facility has been notified.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to accept donation request.",
    };
  }
}

/**
 * Declines a dispatched blood donation request ("I'm Unavailable")
 */
export async function declineDonorRequestAction(
  requestId: string,
  reason?: string
) {
  try {
    const user = await requireDonorClearance();
    const supabase = await createClient();

    // 1. Fetch donor profile
    const context = await donorService.getDonorContext(user.id);
    const donorProfile = context?.donorProfile || { id: `donor-${user.id}` };

    // 2. Update status in donorRequestStore
    donorRequestStore.updateStatus(requestId, "unavailable", { reason });

    // 3. Resiliently update status in Supabase
    const now = new Date().toISOString();
    try {
      await (supabase.from("donor_requests") as any)
        .update({
          status: "declined",
          responded_at: now,
          updated_at: now,
        })
        .eq("id", requestId);
    } catch (e: any) {
      console.warn("Resilient decline request update warning:", e?.message);
    }

    // 4. Record Audit Log safely
    try {
      await centralizedAuditService.record({
        userId: user.id,
        actorName: (user.profile as any)?.full_name || user.email || "Donor",
        actorRole: "donor",
        action: "DONOR_REQUEST_DECLINED",
        category: "donor_management",
        entityType: "donor_requests",
        entityId: requestId,
        status: "success",
        description: `Donor declined blood match request (${reason || "Unavailable"})`,
        metadata: { decline_reason: reason || "Unavailable", donor_id: donorProfile.id },
      });
    } catch {}

    revalidatePath("/donor/requests");
    revalidatePath(`/donor/requests/${requestId}`);
    revalidatePath("/donor/dashboard");

    return {
      success: true,
      message: "Blood request marked unavailable. We will respect your schedule and not send further reminders for this request.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to decline donation request.",
    };
  }
}

/**
 * Withdraws previously confirmed interest for an active request
 */
export async function withdrawDonorInterestAction(
  requestId: string,
  reason?: string
) {
  try {
    const user = await requireDonorClearance();
    const supabase = await createClient();

    const existing = donorRequestStore.get(requestId);
    if (existing?.status === "completed") {
      return {
        success: false,
        error: "Cannot withdraw interest after a donation has already been completed.",
      };
    }

    // Update status to 'withdrawn'
    const updated = donorRequestStore.updateStatus(requestId, "withdrawn", { reason });

    const now = new Date().toISOString();
    try {
      await (supabase.from("donor_requests") as any)
        .update({
          status: "cancelled",
          updated_at: now,
        })
        .eq("id", requestId);
    } catch {}

    // In-app notification to Hospital
    if (updated?.hospital_id) {
      inAppNotificationStore.create({
        userId: updated.hospital_id,
        organizationId: updated.hospital_id,
        type: "request_declined",
        title: "Donor Interest Withdrawn",
        message: `A candidate donor has withdrawn interest for Request REQ-${updated.blood_request_id.slice(0, 8).toUpperCase()}. Reason: ${reason || "Schedule conflict"}`,
        data: {
          blood_request_id: updated.blood_request_id,
          donor_request_id: requestId,
        },
      });
    }

    // Record Audit Log
    try {
      await (supabase.from("audit_logs") as any).insert({
        user_id: user.id,
        action: "DONOR_INTEREST_WITHDRAWN",
        entity_type: "donor_requests",
        entity_id: requestId,
        metadata: { reason: reason || "Schedule conflict" },
      });
    } catch {}

    revalidatePath("/donor/requests");
    revalidatePath(`/donor/requests/${requestId}`);
    revalidatePath("/donor/dashboard");

    return {
      success: true,
      message: "Your interest has been withdrawn. The healthcare facility has been notified.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to withdraw interest.",
    };
  }
}

/**
 * Marks a notification as read
 */
export async function markDonorNotificationReadAction(notificationId: string) {
  try {
    const user = await requireDonorClearance();
    const supabase = await createClient();

    // 1. Authoritative inAppNotificationStore update
    try {
      inAppNotificationStore.markAsRead(notificationId, user.id);
    } catch (e: any) {
      console.warn("inAppNotificationStore markAsRead warning:", e?.message);
    }

    // 2. Database update
    try {
      await (supabase.from("notifications") as any)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", user.id);
    } catch {}

    revalidatePath("/donor/notifications");
    revalidatePath("/donor/dashboard");
    revalidatePath("/donor");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Marks a notification as unread
 */
export async function markDonorNotificationUnreadAction(notificationId: string) {
  try {
    const user = await requireDonorClearance();
    const supabase = await createClient();

    // 1. Authoritative inAppNotificationStore update
    try {
      inAppNotificationStore.markAsUnread(notificationId, user.id);
    } catch (e: any) {
      console.warn("inAppNotificationStore markAsUnread warning:", e?.message);
    }

    // 2. Database update
    try {
      await (supabase.from("notifications") as any)
        .update({ is_read: false, read_at: null })
        .eq("id", notificationId)
        .eq("user_id", user.id);
    } catch {}

    revalidatePath("/donor/notifications");
    revalidatePath("/donor/dashboard");
    revalidatePath("/donor");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Marks all unread notifications for the donor as read
 */
export async function markAllDonorNotificationsReadAction() {
  try {
    const user = await requireDonorClearance();
    const supabase = await createClient();

    // 1. Authoritative inAppNotificationStore update
    try {
      inAppNotificationStore.markAllAsRead(user.id);
    } catch (e: any) {
      console.warn("inAppNotificationStore markAllAsRead warning:", e?.message);
    }

    // 2. Database update
    try {
      await (supabase.from("notifications") as any)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_read", false);
    } catch {}

    revalidatePath("/donor/notifications");
    revalidatePath("/donor/dashboard");
    revalidatePath("/donor");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Marks all notifications for the donor as unread
 */
export async function markAllDonorNotificationsUnreadAction() {
  try {
    const user = await requireDonorClearance();
    const supabase = await createClient();

    // 1. Authoritative inAppNotificationStore update
    try {
      inAppNotificationStore.markAllAsUnread(user.id);
    } catch (e: any) {
      console.warn("inAppNotificationStore markAllAsUnread warning:", e?.message);
    }

    // 2. Database update
    try {
      await (supabase.from("notifications") as any)
        .update({ is_read: false, read_at: null })
        .eq("user_id", user.id)
        .eq("is_read", true);
    } catch {}

    revalidatePath("/donor/notifications");
    revalidatePath("/donor/dashboard");
    revalidatePath("/donor");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Safely deactivates donor account
 */
export async function deactivateDonorAccountAction() {
  try {
    const user = await requireDonorClearance();
    const supabase = await createClient();

    await (supabase.from("profiles") as any)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    await (supabase.from("donor_profiles") as any)
      .update({
        availability_status: "unavailable",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    await (supabase.from("audit_logs") as any).insert({
      user_id: user.id,
      action: "DONOR_ACCOUNT_DEACTIVATED",
      entity_type: "profiles",
      entity_id: user.id,
      metadata: { reason: "User requested self-deactivation" },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to deactivate account." };
  }
}


// ----------------------------------------------------------------------------
// DONOR SCREENING ATTENDANCE & RESCHEDULING ACTIONS
// ----------------------------------------------------------------------------

/**
 * Donor confirms attendance for a scheduled or ASAP screening arrangement
 */
export async function confirmScreeningAttendanceAction(
  screeningId: string,
  note?: string
) {
  try {
    const user = await requireDonorClearance();

    const updated = screeningStore.confirmAttendance(screeningId, user.id, note);
    const reqRef = `REQ-${updated.blood_request_id.substring(0, 8).toUpperCase()}`;

    // Notify the hospital immediately
    inAppNotificationStore.create({
      userId: updated.hospital_id,
      organizationId: updated.hospital_id,
      type: "request_accepted",
      title: "Donor Confirmed Screening Attendance",
      message: `Candidate Donor ${updated.donor_ref} has confirmed attendance for screening on Blood Request ${reqRef}.${note ? ` Note: "${note}"` : ""}`,
      data: {
        screening_id: updated.id,
        blood_request_id: updated.blood_request_id,
        donor_ref: updated.donor_ref,
        note,
      },
    });

    // Record audit log
    try {
      await centralizedAuditService.record({
        userId: user.id,
        actorName: user.profile?.full_name || "Voluntary Donor",
        actorRole: "donor",
        organizationId: updated.hospital_id,
        organizationType: "hospital",
        organizationName: updated.hospital_name,
        action: "DONOR_SCREENING_ATTENDANCE_CONFIRMED",
        category: "donor_management",
        entityType: "donor_screening",
        entityId: updated.id,
        description: `Donor ${updated.donor_ref} confirmed screening attendance for request ${reqRef}`,
      });
    } catch {}

    revalidatePath("/donor/dashboard");
    revalidatePath("/donor/requests");
    revalidatePath(`/donor/requests/${updated.donor_request_id}`);
    revalidatePath(`/hospital/blood-requests/${updated.blood_request_id}`);
    revalidatePath(`/hospital/donor-requests/${updated.donor_request_id}`);

    return {
      success: true,
      message: "Attendance confirmed! The healthcare facility has been notified.",
      screening: updated,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to confirm attendance." };
  }
}

/**
 * Donor requests appointment rescheduling
 */
export async function requestScreeningRescheduleAction(params: {
  screeningId: string;
  reason: string;
  proposedDate?: string;
  proposedTime?: string;
}) {
  try {
    const user = await requireDonorClearance();

    if (!params.reason || !params.reason.trim()) {
      return { success: false, error: "Please provide a reason for rescheduling." };
    }

    const updated = screeningStore.requestReschedule(
      params.screeningId,
      user.id,
      params.reason.trim(),
      params.proposedDate,
      params.proposedTime
    );

    const reqRef = `REQ-${updated.blood_request_id.substring(0, 8).toUpperCase()}`;

    // Notify the hospital immediately
    inAppNotificationStore.create({
      userId: updated.hospital_id,
      organizationId: updated.hospital_id,
      type: "donor_request",
      title: "Screening Reschedule Requested",
      message: `Candidate Donor ${updated.donor_ref} requested to reschedule screening for Request ${reqRef}. Reason: "${params.reason.trim()}"${params.proposedDate ? ` (Proposed: ${params.proposedDate} ${params.proposedTime || ""})` : ""}`,
      data: {
        screening_id: updated.id,
        blood_request_id: updated.blood_request_id,
        donor_ref: updated.donor_ref,
        reason: params.reason.trim(),
        proposed_date: params.proposedDate,
        proposed_time: params.proposedTime,
      },
    });

    // Record audit log
    try {
      await centralizedAuditService.record({
        userId: user.id,
        actorName: user.profile?.full_name || "Voluntary Donor",
        actorRole: "donor",
        organizationId: updated.hospital_id,
        organizationType: "hospital",
        organizationName: updated.hospital_name,
        action: "DONOR_SCREENING_RESCHEDULE_REQUESTED",
        category: "donor_management",
        entityType: "donor_screening",
        entityId: updated.id,
        description: `Donor ${updated.donor_ref} requested screening reschedule: "${params.reason}"`,
      });
    } catch {}

    revalidatePath("/donor/dashboard");
    revalidatePath("/donor/requests");
    revalidatePath(`/donor/requests/${updated.donor_request_id}`);
    revalidatePath(`/hospital/blood-requests/${updated.blood_request_id}`);
    revalidatePath(`/hospital/donor-requests/${updated.donor_request_id}`);

    return {
      success: true,
      message: "Reschedule request submitted. The clinical coordinator will review and update your schedule.",
      screening: updated,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to request rescheduling." };
  }
}

/**
 * Donor indicates unable to attend screening
 */
export async function declineScreeningAttendanceAction(params: {
  screeningId: string;
  reason: string;
}) {
  try {
    const user = await requireDonorClearance();

    if (!params.reason || !params.reason.trim()) {
      return { success: false, error: "Please let the facility know why you cannot attend." };
    }

    const updated = screeningStore.markUnableToAttend(
      params.screeningId,
      user.id,
      params.reason.trim()
    );

    const reqRef = `REQ-${updated.blood_request_id.substring(0, 8).toUpperCase()}`;

    // Notify the hospital immediately
    inAppNotificationStore.create({
      userId: updated.hospital_id,
      organizationId: updated.hospital_id,
      type: "request_declined",
      title: "Donor Unable to Attend Screening",
      message: `Candidate Donor ${updated.donor_ref} cannot attend screening for Request ${reqRef}. Reason: "${params.reason.trim()}"`,
      data: {
        screening_id: updated.id,
        blood_request_id: updated.blood_request_id,
        donor_ref: updated.donor_ref,
        reason: params.reason.trim(),
      },
    });

    // Record audit log
    try {
      await centralizedAuditService.record({
        userId: user.id,
        actorName: user.profile?.full_name || "Voluntary Donor",
        actorRole: "donor",
        organizationId: updated.hospital_id,
        organizationType: "hospital",
        organizationName: updated.hospital_name,
        action: "DONOR_SCREENING_UNABLE_TO_ATTEND",
        category: "donor_management",
        entityType: "donor_screening",
        entityId: updated.id,
        description: `Donor ${updated.donor_ref} indicated unable to attend screening: "${params.reason}"`,
      });
    } catch {}

    revalidatePath("/donor/dashboard");
    revalidatePath("/donor/requests");
    revalidatePath(`/donor/requests/${updated.donor_request_id}`);
    revalidatePath(`/hospital/blood-requests/${updated.blood_request_id}`);
    revalidatePath(`/hospital/donor-requests/${updated.donor_request_id}`);

    return {
      success: true,
      message: "The facility has been notified. Thank you for informing us.",
      screening: updated,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to submit response." };
  }
}
