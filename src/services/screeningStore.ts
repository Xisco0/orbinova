import fs from "fs";
import path from "path";
import { BloodGroupCode } from "@/types/database";
import { donorStore } from "./donorStore";
import { donorRequestStore } from "./donorRequestStore";

export type ScreeningType = "asap" | "scheduled";

export type ScreeningStatus =
  | "screening_scheduled"
  | "awaiting_donor_confirmation"
  | "attendance_confirmed"
  | "rescheduling_requested"
  | "unable_to_attend"
  | "screening_completed"
  | "cancelled";

export type MedicalEligibility =
  | "pending"
  | "eligible"
  | "temporarily_deferred"
  | "permanently_deferred";

export interface ScreeningHistoryEntry {
  action: string;
  timestamp: string;
  actorUserId?: string;
  details?: Record<string, unknown>;
}

export type DonorScreeningRecord = DonorScreeningAppointment;

export interface DonorScreeningAppointment {
  id: string;
  blood_request_id: string;
  donor_request_id: string;
  donor_id: string; // donorProfileId or userId
  donor_user_id: string;
  donor_ref: string;
  donor_name?: string;
  donor_email?: string;
  donor_phone?: string;
  blood_group: BloodGroupCode;
  hospital_id: string;
  hospital_name: string;
  hospital_address: string;
  screening_type: ScreeningType;
  scheduled_date: string | null; // YYYY-MM-DD
  scheduled_time: string | null; // HH:mm
  instructions: string | null;
  status: ScreeningStatus;
  donor_response_note?: string | null;
  reschedule_reason?: string | null;
  proposed_date?: string | null;
  proposed_time?: string | null;
  donor_confirmed_at?: string | null;
  donor_reschedule_reason?: string | null;
  donor_proposed_date?: string | null;
  donor_proposed_time?: string | null;
  donor_unable_reason?: string | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  medical_eligibility: MedicalEligibility;
  screened_at?: string | null;
  screening_completed_at?: string | null;
  screened_by?: string | null;
  screened_by_name?: string | null;
  medical_notes?: string | null;
  screening_notes?: string | null;
  reschedule_history?: ScreeningHistoryEntry[];
  deferral_reason?: string | null;
  deferral_until?: string | null;
  history: ScreeningHistoryEntry[];
  created_at: string;
  updated_at: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const SCREENINGS_FILE = path.join(DATA_DIR, "donor_screenings.json");

function ensureStoreDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function readScreenings(): Record<string, DonorScreeningAppointment> {
  ensureStoreDir();
  if (!fs.existsSync(SCREENINGS_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(SCREENINGS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeScreenings(data: Record<string, DonorScreeningAppointment>) {
  ensureStoreDir();
  try {
    fs.writeFileSync(SCREENINGS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write donor screenings store:", e);
  }
}

export const screeningStore = {
  getAll(): Record<string, DonorScreeningAppointment> {
    return readScreenings();
  },

  getById(id: string): DonorScreeningAppointment | null {
    const store = readScreenings();
    return store[id] || null;
  },

  getByBloodRequest(bloodRequestId: string): DonorScreeningAppointment[] {
    const store = readScreenings();
    return Object.values(store)
      .filter((s) => s.blood_request_id === bloodRequestId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getByHospital(hospitalId: string): DonorScreeningAppointment[] {
    const store = readScreenings();
    return Object.values(store)
      .filter((s) => s.hospital_id === hospitalId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getByDonor(donorIdOrUserId: string): DonorScreeningAppointment[] {
    const store = readScreenings();
    const cleanTarget = donorIdOrUserId.replace(/^(donor-|dp-)+/, "");
    return Object.values(store)
      .filter((s) => {
        const cleanDonor = s.donor_id.replace(/^(donor-|dp-)+/, "");
        const cleanUser = s.donor_user_id.replace(/^(donor-|dp-)+/, "");
        return cleanDonor === cleanTarget || cleanUser === cleanTarget;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getActiveForDonorAndRequest(
    donorIdOrUserId: string,
    bloodRequestId: string
  ): DonorScreeningAppointment | null {
    const store = readScreenings();
    const cleanTarget = donorIdOrUserId.replace(/^(donor-|dp-)+/, "");
    const active = Object.values(store).find((s) => {
      const cleanDonor = s.donor_id.replace(/^(donor-|dp-)+/, "");
      const cleanUser = s.donor_user_id.replace(/^(donor-|dp-)+/, "");
      const isMatch = (cleanDonor === cleanTarget || cleanUser === cleanTarget) && s.blood_request_id === bloodRequestId;
      const isActiveStatus = s.status !== "cancelled" && s.status !== "unable_to_attend";
      return isMatch && isActiveStatus;
    });
    return active || null;
  },

  getActiveByDonorRequest(donorRequestId: string): DonorScreeningAppointment | null {
    const store = readScreenings();
    return (
      Object.values(store).find(
        (s) => s.donor_request_id === donorRequestId && s.status !== "cancelled"
      ) || null
    );
  },

  /**
   * Schedules a screening arrangement with duplicate prevention guard
   */
  createScreening(params: {
    bloodRequestId: string;
    donorRequestId: string;
    donorId: string;
    donorUserId: string;
    donorRef: string;
    donorName?: string;
    donorEmail?: string;
    donorPhone?: string;
    bloodGroup: BloodGroupCode;
    hospitalId: string;
    hospitalName: string;
    hospitalAddress: string;
    screeningType: ScreeningType;
    scheduledDate?: string | null;
    scheduledTime?: string | null;
    instructions?: string | null;
    actorUserId?: string;
  }): DonorScreeningAppointment {
    const store = readScreenings();

    // Prevent duplicate active screening appointments for the same donor & request
    const existingActive = this.getActiveForDonorAndRequest(params.donorId, params.bloodRequestId);
    if (existingActive) {
      throw new Error(
        "An active screening arrangement already exists for this candidate donor and request. Please reschedule the existing arrangement instead."
      );
    }

    const id = `screen-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: DonorScreeningAppointment = {
      id,
      blood_request_id: params.bloodRequestId,
      donor_request_id: params.donorRequestId,
      donor_id: params.donorId,
      donor_user_id: params.donorUserId,
      donor_ref: params.donorRef,
      donor_name: params.donorName,
      donor_email: params.donorEmail,
      donor_phone: params.donorPhone,
      blood_group: params.bloodGroup,
      hospital_id: params.hospitalId,
      hospital_name: params.hospitalName,
      hospital_address: params.hospitalAddress,
      screening_type: params.screeningType,
      scheduled_date: params.screeningType === "asap" ? null : params.scheduledDate || null,
      scheduled_time: params.screeningType === "asap" ? null : params.scheduledTime || null,
      instructions: params.instructions || null,
      status: "awaiting_donor_confirmation",
      medical_eligibility: "pending",
      history: [
        {
          action: "SCREENING_SCHEDULED",
          timestamp: now,
          actorUserId: params.actorUserId,
          details: {
            screening_type: params.screeningType,
            scheduled_date: params.scheduledDate,
            scheduled_time: params.scheduledTime,
          },
        },
      ],
      created_at: now,
      updated_at: now,
    };

    store[id] = record;
    writeScreenings(store);

    // Update donorRequestStore status to 'scheduled'
    if (params.donorRequestId) {
      try {
        donorRequestStore.updateStatus(params.donorRequestId, "scheduled", {
          notes: `Screening scheduled (${params.screeningType === "asap" ? "ASAP" : `${params.scheduledDate} ${params.scheduledTime}`})`,
        });
      } catch {}
    }

    return record;
  },

  /**
   * Donor confirms attendance / availability
   */
  confirmAttendance(
    id: string,
    donorUserId: string,
    note?: string
  ): DonorScreeningAppointment {
    const store = readScreenings();
    const record = store[id];
    if (!record) {
      throw new Error("Screening appointment record not found.");
    }

    const cleanActor = donorUserId.replace(/^(donor-|dp-)+/, "");
    const cleanDonor = record.donor_id.replace(/^(donor-|dp-)+/, "");
    const cleanUser = record.donor_user_id.replace(/^(donor-|dp-)+/, "");

    if (cleanActor !== cleanDonor && cleanActor !== cleanUser) {
      throw new Error("Security Violation: You can only confirm your own screening appointments.");
    }

    const now = new Date().toISOString();
    record.status = "attendance_confirmed";
    record.donor_response_note = note || null;
    record.donor_confirmed_at = now;
    record.updated_at = now;
    record.history.push({
      action: "ATTENDANCE_CONFIRMED",
      timestamp: now,
      actorUserId: donorUserId,
      details: { note },
    });

    store[id] = record;
    writeScreenings(store);
    return record;
  },

  /**
   * Donor requests rescheduling
   */
  requestReschedule(
    id: string,
    donorUserId: string,
    reason: string,
    proposedDate?: string,
    proposedTime?: string
  ): DonorScreeningAppointment {
    const store = readScreenings();
    const record = store[id];
    if (!record) {
      throw new Error("Screening appointment record not found.");
    }

    const cleanActor = donorUserId.replace(/^(donor-|dp-)+/, "");
    const cleanDonor = record.donor_id.replace(/^(donor-|dp-)+/, "");
    const cleanUser = record.donor_user_id.replace(/^(donor-|dp-)+/, "");

    if (cleanActor !== cleanDonor && cleanActor !== cleanUser) {
      throw new Error("Security Violation: You can only manage your own screening appointments.");
    }

    const now = new Date().toISOString();
    record.status = "rescheduling_requested";
    record.reschedule_reason = reason;
    record.donor_reschedule_reason = reason;
    record.proposed_date = proposedDate || null;
    record.donor_proposed_date = proposedDate || null;
    record.proposed_time = proposedTime || null;
    record.donor_proposed_time = proposedTime || null;
    record.updated_at = now;
    record.history.push({
      action: "RESCHEDULING_REQUESTED",
      timestamp: now,
      actorUserId: donorUserId,
      details: { reason, proposedDate, proposedTime },
    });

    store[id] = record;
    writeScreenings(store);
    return record;
  },

  /**
   * Donor marks unable to attend
   */
  markUnableToAttend(
    id: string,
    donorUserId: string,
    reason: string
  ): DonorScreeningAppointment {
    const store = readScreenings();
    const record = store[id];
    if (!record) {
      throw new Error("Screening appointment record not found.");
    }

    const cleanActor = donorUserId.replace(/^(donor-|dp-)+/, "");
    const cleanDonor = record.donor_id.replace(/^(donor-|dp-)+/, "");
    const cleanUser = record.donor_user_id.replace(/^(donor-|dp-)+/, "");

    if (cleanActor !== cleanDonor && cleanActor !== cleanUser) {
      throw new Error("Security Violation: You can only manage your own screening appointments.");
    }

    const now = new Date().toISOString();
    record.status = "unable_to_attend";
    record.donor_response_note = reason;
    record.donor_unable_reason = reason;
    record.updated_at = now;
    record.history.push({
      action: "UNABLE_TO_ATTEND",
      timestamp: now,
      actorUserId: donorUserId,
      details: { reason },
    });

    store[id] = record;
    writeScreenings(store);
    return record;
  },

  /**
   * Hospital reschedules screening arrangement
   */
  rescheduleAppointment(
    id: string,
    hospitalId: string,
    params: {
      screeningType: ScreeningType;
      scheduledDate?: string | null;
      scheduledTime?: string | null;
      instructions?: string | null;
      actorUserId?: string;
    }
  ): DonorScreeningAppointment {
    const store = readScreenings();
    const record = store[id];
    if (!record) {
      throw new Error("Screening appointment record not found.");
    }

    if (record.hospital_id !== hospitalId) {
      throw new Error("Security Violation: You cannot reschedule another institution's appointments.");
    }

    const now = new Date().toISOString();
    const prevDate = record.scheduled_date;
    const prevTime = record.scheduled_time;

    record.screening_type = params.screeningType;
    record.scheduled_date = params.screeningType === "asap" ? null : params.scheduledDate || null;
    record.scheduled_time = params.screeningType === "asap" ? null : params.scheduledTime || null;
    if (params.instructions !== undefined) {
      record.instructions = params.instructions;
    }
    record.status = "awaiting_donor_confirmation";
    record.reschedule_reason = null;
    record.proposed_date = null;
    record.proposed_time = null;
    record.updated_at = now;

    record.history.push({
      action: "APPOINTMENT_RESCHEDULED",
      timestamp: now,
      actorUserId: params.actorUserId,
      details: {
        previousDate: prevDate,
        previousTime: prevTime,
        newDate: record.scheduled_date,
        newTime: record.scheduled_time,
        screeningType: params.screeningType,
      },
    });
    record.reschedule_history = record.history;

    store[id] = record;
    writeScreenings(store);
    return record;
  },

  /**
   * Hospital cancels screening arrangement
   */
  cancelScreening(
    id: string,
    hospitalId: string,
    reason: string,
    actorUserId?: string
  ): DonorScreeningAppointment {
    const store = readScreenings();
    const record = store[id];
    if (!record) {
      throw new Error("Screening appointment record not found.");
    }

    if (record.hospital_id !== hospitalId) {
      throw new Error("Security Violation: You cannot cancel another institution's appointments.");
    }

    const now = new Date().toISOString();
    record.status = "cancelled";
    record.instructions = reason ? `Cancelled: ${reason}` : "Cancelled by facility";
    record.cancellation_reason = reason;
    record.cancelled_at = now;
    record.updated_at = now;

    record.history.push({
      action: "APPOINTMENT_CANCELLED",
      timestamp: now,
      actorUserId,
      details: { reason },
    });

    store[id] = record;
    writeScreenings(store);
    return record;
  },

  /**
   * Hospital marks screening completed
   * (Screening completion does NOT imply medical eligibility)
   */
  completeScreening(
    id: string,
    hospitalId: string,
    actorUserId: string,
    actorName?: string,
    notes?: string
  ): DonorScreeningAppointment {
    const store = readScreenings();
    const record = store[id];
    if (!record) {
      throw new Error("Screening appointment record not found.");
    }

    if (record.hospital_id !== hospitalId) {
      throw new Error("Security Violation: You cannot complete another institution's screenings.");
    }

    const now = new Date().toISOString();
    record.status = "screening_completed";
    record.screening_completed_at = now;
    record.screened_at = now;
    record.screened_by = actorUserId;
    record.screened_by_name = actorName || "Clinical Staff";
    if (notes) {
      record.medical_notes = notes;
      record.screening_notes = notes;
    }
    record.updated_at = now;

    record.history.push({
      action: "SCREENING_COMPLETED",
      timestamp: now,
      actorUserId,
      details: { notes },
    });

    store[id] = record;
    writeScreenings(store);
    return record;
  },

  /**
   * Authorized medical staff records clinical eligibility outcome
   */
  recordMedicalOutcome(
    id: string,
    hospitalId: string,
    params: {
      actorUserId: string;
      actorName?: string;
      outcome: MedicalEligibility;
      notes?: string;
      deferralReason?: string;
      deferralUntil?: string;
    }
  ): DonorScreeningAppointment {
    const store = readScreenings();
    const record = store[id];
    if (!record) {
      throw new Error("Screening appointment record not found.");
    }

    if (record.hospital_id !== hospitalId) {
      throw new Error("Security Violation: You cannot record outcomes for another institution.");
    }

    const now = new Date().toISOString();
    record.status = "screening_completed";
    record.medical_eligibility = params.outcome;
    record.screening_completed_at = record.screening_completed_at || now;
    record.screened_by = params.actorUserId;
    record.screened_by_name = params.actorName || "Qualified Medical Personnel";
    if (params.notes) record.medical_notes = params.notes;
    if (params.deferralReason) record.deferral_reason = params.deferralReason;
    if (params.deferralUntil) record.deferral_until = params.deferralUntil;
    record.updated_at = now;

    record.history.push({
      action: `MEDICAL_OUTCOME_${params.outcome.toUpperCase()}`,
      timestamp: now,
      actorUserId: params.actorUserId,
      details: {
        outcome: params.outcome,
        notes: params.notes,
        deferralReason: params.deferralReason,
        deferralUntil: params.deferralUntil,
      },
    });

    store[id] = record;
    writeScreenings(store);

    // Propagate eligibility status update to donor profile in donorStore
    try {
      if (params.outcome !== "pending") {
        const mappedEligibility =
          params.outcome === "eligible"
            ? ("eligible" as const)
            : params.outcome === "temporarily_deferred"
            ? ("temporarily_ineligible" as const)
            : ("permanently_ineligible" as const);
        donorStore.updateEligibility(record.donor_id, mappedEligibility);
        if (record.donor_user_id) {
          donorStore.updateEligibility(record.donor_user_id, mappedEligibility);
        }
      }
    } catch {}

    return record;
  },

  recordMedicalEligibility(
    id: string,
    hospitalId: string,
    outcome: MedicalEligibility,
    actorUserId: string,
    actorName?: string,
    notes?: string,
    deferralReason?: string,
    deferralUntil?: string
  ): DonorScreeningAppointment {
    return this.recordMedicalOutcome(id, hospitalId, {
      outcome,
      actorUserId,
      actorName,
      notes,
      deferralReason,
      deferralUntil,
    });
  },
};
