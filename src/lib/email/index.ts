/**
 * ORBINOVA UNIFIED EMAIL & BACKGROUND QUEUE SYSTEM
 * Centralized High-Performance Notification Architecture
 */

export * from "./types";
export * from "./config";
export * from "./emailTemplates";
export * from "./emailDeliveryLedger";
export * from "./emailPreferencesStore";
export * from "./emailQueue";
export * from "./emailOutbox";
export * from "./emailProviderAdapter";

import { emailQueue } from "./emailQueue";
import { emailOutbox } from "./emailOutbox";
import { EmailSendResult } from "./types";
import {
  renderStaffInvitationEmail,
  renderDonorWelcomeEmail,
  renderEmailVerificationEmail,
  renderPasswordResetEmail,
  renderAccountLockoutEmail,
  renderPasswordChangedEmail,
  renderInstitutionStatusEmail,
  renderBloodRequestBroadcastEmail,
  renderBloodRequestFulfillmentEmail,
  renderDonorMatchNotificationEmail,
  renderInventoryAlertEmail,
  renderReservationConfirmationEmail,
  renderDonorScreeningScheduledEmail,
  renderDonorScreeningRescheduledEmail,
  renderDonorScreeningCancelledEmail,
} from "./emailTemplates";

export const orbinovaEmail = {
  // --------------------------------------------------------------------------
  // 1. Staff & Account Authentication Emails
  // --------------------------------------------------------------------------
  async sendStaffInvitation(params: {
    toEmail: string;
    fullName?: string;
    roleLabel: string;
    organizationName: string;
    invitationUrl: string;
    defaultPassword?: string;
    organizationId?: string;
    expiresInDays?: number;
  }): Promise<EmailSendResult> {
    const { html, text, subject } = renderStaffInvitationEmail({
      fullName: params.fullName,
      roleLabel: params.roleLabel,
      organizationName: params.organizationName,
      invitationUrl: params.invitationUrl,
      defaultPassword: params.defaultPassword,
      expiresInDays: params.expiresInDays,
    });

    return emailQueue.enqueue({
      to: params.toEmail,
      subject,
      html,
      text,
      category: "auth",
      metadata: {
        organizationId: params.organizationId,
        referenceId: `invite-${params.toEmail}`,
        referenceType: "staff_invitation",
      },
    });
  },

  async sendDonorWelcome(params: {
    toEmail: string;
    fullName?: string;
    bloodGroup: string;
    organizationName: string;
    loginUrl: string;
    defaultPassword?: string;
    organizationId?: string;
  }): Promise<EmailSendResult> {
    const { html, text, subject } = renderDonorWelcomeEmail({
      toEmail: params.toEmail,
      fullName: params.fullName,
      bloodGroup: params.bloodGroup,
      organizationName: params.organizationName,
      loginUrl: params.loginUrl,
      defaultPassword: params.defaultPassword,
    });

    return emailQueue.enqueue({
      to: params.toEmail,
      subject,
      html,
      text,
      category: "auth",
      metadata: {
        organizationId: params.organizationId,
        referenceId: `donor-welcome-${params.toEmail}`,
        referenceType: "donor_welcome",
      },
    });
  },

  async sendEmailVerification(params: {
    toEmail: string;
    fullName?: string;
    verificationUrl: string;
    expiresInHours?: number;
  }): Promise<EmailSendResult> {
    const { html, text, subject } = renderEmailVerificationEmail({
      fullName: params.fullName,
      verificationUrl: params.verificationUrl,
      expiresInHours: params.expiresInHours,
    });

    return emailQueue.enqueue({
      to: params.toEmail,
      subject,
      html,
      text,
      category: "auth",
    });
  },

  async sendPasswordReset(params: {
    toEmail: string;
    fullName?: string;
    resetUrl: string;
    expiresInMinutes?: number;
  }): Promise<EmailSendResult> {
    const { html, text, subject } = renderPasswordResetEmail({
      fullName: params.fullName,
      resetUrl: params.resetUrl,
      expiresInMinutes: params.expiresInMinutes,
    });

    return emailQueue.enqueue({
      to: params.toEmail,
      subject,
      html,
      text,
      category: "auth",
    });
  },

  async sendAccountLockoutAlert(params: {
    userEmail: string;
    fullName?: string;
    adminContactEmail?: string;
    organizationId?: string;
  }): Promise<EmailSendResult> {
    const { html, text, subject } = renderAccountLockoutEmail({
      fullName: params.fullName,
      email: params.userEmail,
      adminContactEmail: params.adminContactEmail,
    });

    return emailQueue.enqueue({
      to: params.userEmail,
      subject,
      html,
      text,
      category: "security",
      metadata: {
        organizationId: params.organizationId,
        referenceType: "account_lockout",
      },
    });
  },

  async sendPasswordChangedAlert(params: {
    userEmail: string;
    fullName?: string;
    timestamp?: string;
  }): Promise<EmailSendResult> {
    const time = params.timestamp || new Date().toLocaleString();
    const { html, text, subject } = renderPasswordChangedEmail({
      fullName: params.fullName,
      email: params.userEmail,
      timestamp: time,
    });

    return emailQueue.enqueue({
      to: params.userEmail,
      subject,
      html,
      text,
      category: "security",
    });
  },

  // --------------------------------------------------------------------------
  // 2. Institutional Emails
  // --------------------------------------------------------------------------
  async sendInstitutionStatusNotification(params: {
    adminEmail: string;
    institutionName: string;
    institutionType: "hospital" | "blood_bank";
    newStatus: "verified" | "rejected" | "suspended" | "pending";
    reviewerNotes?: string;
    portalUrl: string;
    organizationId?: string;
  }): Promise<EmailSendResult> {
    const { html, text, subject } = renderInstitutionStatusEmail({
      institutionName: params.institutionName,
      institutionType: params.institutionType,
      newStatus: params.newStatus,
      reviewerNotes: params.reviewerNotes,
      portalUrl: params.portalUrl,
    });

    return emailQueue.enqueue({
      to: params.adminEmail,
      subject,
      html,
      text,
      category: "institution",
      metadata: {
        organizationId: params.organizationId,
        referenceId: params.newStatus,
        referenceType: "institution_verification",
      },
    });
  },

  // --------------------------------------------------------------------------
  // 3. Blood Request & Fulfillment Notifications (Transactional Outbox Aware)
  // --------------------------------------------------------------------------
  async broadcastBloodRequest(params: {
    bloodBankEmails: string[];
    hospitalName: string;
    requestId: string;
    bloodGroup: string;
    unitsRequired: number;
    urgency: "emergency" | "urgent" | "normal";
    requiredBy?: string | null;
    clinicalNotes?: string | null;
    reviewUrl: string;
    useOutbox?: boolean;
  }): Promise<EmailSendResult[]> {
    const { html, text, subject } = renderBloodRequestBroadcastEmail({
      hospitalName: params.hospitalName,
      requestId: params.requestId,
      bloodGroup: params.bloodGroup,
      unitsRequired: params.unitsRequired,
      urgency: params.urgency,
      requiredBy: params.requiredBy,
      clinicalNotes: params.clinicalNotes,
      reviewUrl: params.reviewUrl,
    });

    const results: EmailSendResult[] = [];

    for (const email of params.bloodBankEmails) {
      const payload = {
        to: email,
        subject,
        html,
        text,
        category: "blood_requests" as const,
        metadata: {
          referenceId: params.requestId,
          referenceType: "blood_request_broadcast",
          idempotencyKey: `broadcast-${params.requestId}-${email}`,
        },
      };

      if (params.useOutbox) {
        emailOutbox.recordEvent("BLOOD_REQUEST_BROADCAST", payload);
        results.push({
          success: true,
          jobId: `outbox-${params.requestId}`,
          status: "queued",
        });
      } else {
        const res = emailQueue.enqueue(payload);
        results.push(res);
      }
    }

    return results;
  },

  async sendBloodRequestFulfillmentUpdate(params: {
    hospitalEmail: string;
    hospitalName: string;
    bloodBankName: string;
    requestId: string;
    bloodGroup: string;
    status: "accepted" | "rejected" | "partially_fulfilled" | "completed";
    allocatedUnits?: number;
    totalRequiredUnits?: number;
    portalUrl: string;
  }): Promise<EmailSendResult> {
    const { html, text, subject } = renderBloodRequestFulfillmentEmail({
      hospitalName: params.hospitalName,
      bloodBankName: params.bloodBankName,
      requestId: params.requestId,
      bloodGroup: params.bloodGroup,
      status: params.status,
      allocatedUnits: params.allocatedUnits,
      totalRequiredUnits: params.totalRequiredUnits,
      portalUrl: params.portalUrl,
    });

    return emailQueue.enqueue({
      to: params.hospitalEmail,
      subject,
      html,
      text,
      category: "blood_requests",
      metadata: {
        referenceId: params.requestId,
        referenceType: "blood_request_fulfillment",
        idempotencyKey: `fulfillment-${params.requestId}-${params.status}`,
      },
    });
  },

  // --------------------------------------------------------------------------
  // 4. Targeted Donor Matching Notifications
  // --------------------------------------------------------------------------
  async sendDonorMatchNotification(params: {
    donorEmail: string;
    donorName: string;
    hospitalName: string;
    bloodGroup: string;
    urgency: "emergency" | "urgent" | "normal";
    city?: string;
    responseUrl: string;
    requestId: string;
  }): Promise<EmailSendResult> {
    const { html, text, subject } = renderDonorMatchNotificationEmail({
      donorName: params.donorName,
      hospitalName: params.hospitalName,
      bloodGroup: params.bloodGroup,
      urgency: params.urgency,
      city: params.city,
      responseUrl: params.responseUrl,
    });

    return emailQueue.enqueue({
      to: params.donorEmail,
      subject,
      html,
      text,
      category: "donors",
      metadata: {
        referenceId: params.requestId,
        referenceType: "donor_match_call",
        idempotencyKey: `donor-match-${params.requestId}-${params.donorEmail}`,
      },
    });
  },

  // --------------------------------------------------------------------------
  // 5. Reservation & Stock Transaction Ledger Emails
  // --------------------------------------------------------------------------
  async sendReservationUpdate(params: {
    recipientEmail: string;
    facilityName: string;
    reservationId: string;
    bloodGroup: string;
    units: number;
    status: "created" | "accepted" | "cancelled" | "released" | "completed";
    portalUrl: string;
  }): Promise<EmailSendResult> {
    const { html, text, subject } = renderReservationConfirmationEmail({
      facilityName: params.facilityName,
      reservationId: params.reservationId,
      bloodGroup: params.bloodGroup,
      units: params.units,
      status: params.status,
      portalUrl: params.portalUrl,
    });

    return emailQueue.enqueue({
      to: params.recipientEmail,
      subject,
      html,
      text,
      category: "reservations",
      metadata: {
        referenceId: params.reservationId,
        referenceType: "reservation_update",
        idempotencyKey: `reservation-${params.reservationId}-${params.status}`,
      },
    });
  },

  // --------------------------------------------------------------------------
  // 6. Configurable Inventory Alerts
  // --------------------------------------------------------------------------
  async sendInventoryAlert(params: {
    managerEmails: string[];
    facilityName: string;
    alertType: "low_stock" | "near_expiry" | "expired_quarantine";
    bloodGroup: string;
    currentUnits: number;
    thresholdUnits?: number;
    inventoryUrl: string;
    facilityId?: string;
  }): Promise<EmailSendResult[]> {
    const { html, text, subject } = renderInventoryAlertEmail({
      facilityName: params.facilityName,
      alertType: params.alertType,
      bloodGroup: params.bloodGroup,
      currentUnits: params.currentUnits,
      thresholdUnits: params.thresholdUnits,
      inventoryUrl: params.inventoryUrl,
    });

    // Deduplication key per facility, blood group and day
    const dateKey = new Date().toISOString().slice(0, 10);
    const results: EmailSendResult[] = [];

    for (const email of params.managerEmails) {
      const res = emailQueue.enqueue({
        to: email,
        subject,
        html,
        text,
        category: "inventory",
        metadata: {
          organizationId: params.facilityId,
          referenceId: `${params.alertType}-${params.bloodGroup}`,
          referenceType: "inventory_alert",
          idempotencyKey: `inv-alert-${params.facilityId || "org"}-${params.bloodGroup}-${params.alertType}-${dateKey}-${email}`,
        },
      });
      results.push(res);
    }

    return results;
  },

  // --------------------------------------------------------------------------
  // 6. Donor Screening Appointment Emails
  // --------------------------------------------------------------------------
  async sendDonorScreeningScheduled(params: {
    toEmail: string;
    donorName: string;
    hospitalName: string;
    bloodRequestRef: string;
    bloodGroup: string;
    screeningType: "asap" | "scheduled";
    scheduledDate?: string | null;
    scheduledTime?: string | null;
    hospitalAddress: string;
    instructions?: string | null;
    portalUrl: string;
    screeningId?: string;
  }): Promise<EmailSendResult> {
    const { html, text, subject } = renderDonorScreeningScheduledEmail({
      donorName: params.donorName,
      hospitalName: params.hospitalName,
      bloodRequestRef: params.bloodRequestRef,
      bloodGroup: params.bloodGroup,
      screeningType: params.screeningType,
      scheduledDate: params.scheduledDate,
      scheduledTime: params.scheduledTime,
      hospitalAddress: params.hospitalAddress,
      instructions: params.instructions,
      portalUrl: params.portalUrl,
    });

    return emailQueue.enqueue({
      to: { email: params.toEmail, name: params.donorName },
      subject,
      html,
      text,
      category: "donors",
      metadata: {
        referenceId: params.screeningId,
        referenceType: "donor_screening",
        idempotencyKey: `screening-sched-${params.screeningId || Date.now()}`,
      },
    });
  },

  async sendDonorScreeningRescheduled(params: {
    toEmail: string;
    donorName: string;
    hospitalName: string;
    bloodRequestRef: string;
    newDate?: string | null;
    newTime?: string | null;
    screeningType: "asap" | "scheduled";
    hospitalAddress: string;
    instructions?: string | null;
    portalUrl: string;
    screeningId?: string;
  }): Promise<EmailSendResult> {
    const { html, text, subject } = renderDonorScreeningRescheduledEmail({
      donorName: params.donorName,
      hospitalName: params.hospitalName,
      bloodRequestRef: params.bloodRequestRef,
      newDate: params.newDate,
      newTime: params.newTime,
      screeningType: params.screeningType,
      hospitalAddress: params.hospitalAddress,
      instructions: params.instructions,
      portalUrl: params.portalUrl,
    });

    return emailQueue.enqueue({
      to: { email: params.toEmail, name: params.donorName },
      subject,
      html,
      text,
      category: "donors",
      metadata: {
        referenceId: params.screeningId,
        referenceType: "donor_screening_reschedule",
        idempotencyKey: `screening-resched-${params.screeningId || Date.now()}-${Date.now()}`,
      },
    });
  },

  async sendDonorScreeningCancelled(params: {
    toEmail: string;
    donorName: string;
    hospitalName: string;
    bloodRequestRef: string;
    reason?: string | null;
    portalUrl: string;
    screeningId?: string;
  }): Promise<EmailSendResult> {
    const { html, text, subject } = renderDonorScreeningCancelledEmail({
      donorName: params.donorName,
      hospitalName: params.hospitalName,
      bloodRequestRef: params.bloodRequestRef,
      reason: params.reason,
      portalUrl: params.portalUrl,
    });

    return emailQueue.enqueue({
      to: { email: params.toEmail, name: params.donorName },
      subject,
      html,
      text,
      category: "donors",
      metadata: {
        referenceId: params.screeningId,
        referenceType: "donor_screening_cancel",
        idempotencyKey: `screening-cancel-${params.screeningId || Date.now()}`,
      },
    });
  },
};
