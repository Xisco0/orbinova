"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  Zap,
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
  FileText,
  HelpCircle,
} from "lucide-react";
import { Button, Badge } from "@/components/ui";
import {
  confirmScreeningAttendanceAction,
  requestScreeningRescheduleAction,
  declineScreeningAttendanceAction,
} from "@/actions/donorActions";
import { DonorScreeningRecord } from "@/services/screeningStore";

interface DonorScreeningAppointmentsProps {
  screenings: DonorScreeningRecord[];
}

export function DonorScreeningAppointments({
  screenings,
}: DonorScreeningAppointmentsProps) {
  const router = useRouter();

  const [activeModal, setActiveModal] = useState<{
    type: "confirm" | "reschedule" | "unable";
    screening: DonorScreeningRecord;
  } | null>(null);

  // Form states
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [proposedTime, setProposedTime] = useState("");
  const [unableReason, setUnableReason] = useState("");
  const [confirmNote, setConfirmNote] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter to show active and recently completed appointments
  const relevantScreenings = screenings.filter((s) => s.status !== "cancelled");

  if (relevantScreenings.length === 0) {
    return null; // Don't show section if no screening appointments exist
  }

  const today = new Date().toISOString().split("T")[0];

  const handleConfirm = async (screeningId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await confirmScreeningAttendanceAction(
        screeningId,
        confirmNote.trim() || undefined
      );

      if (!res.success) {
        setError(res.error || "Failed to confirm screening attendance.");
        setIsLoading(false);
        return;
      }

      setActiveModal(null);
      setConfirmNote("");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReschedule = async (screeningId: string) => {
    if (!rescheduleReason.trim()) {
      setError("Please explain why you need to reschedule.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await requestScreeningRescheduleAction({
        screeningId,
        reason: rescheduleReason.trim(),
        proposedDate: proposedDate || undefined,
        proposedTime: proposedTime || undefined,
      });

      if (!res.success) {
        setError(res.error || "Failed to submit reschedule request.");
        setIsLoading(false);
        return;
      }

      setActiveModal(null);
      setRescheduleReason("");
      setProposedDate("");
      setProposedTime("");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnable = async (screeningId: string) => {
    if (!unableReason.trim()) {
      setError("Please let the hospital know why you are unable to attend.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await declineScreeningAttendanceAction({
        screeningId,
        reason: unableReason.trim(),
      });

      if (!res.success) {
        setError(res.error || "Failed to submit attendance decline.");
        setIsLoading(false);
        return;
      }

      setActiveModal(null);
      setUnableReason("");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-poppins font-bold text-base text-dark">
              Pre-Donation Screening Appointments ({relevantScreenings.length})
            </h3>
            <p className="text-xs text-slate-500 font-inter">
              Screening arrangements scheduled by accredited healthcare facilities
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {relevantScreenings.map((screening) => {
          const reqRef = `REQ-${screening.blood_request_id.substring(0, 8).toUpperCase()}`;
          const isAsap = screening.screening_type === "asap";
          const isConfirmed = screening.status === "attendance_confirmed";
          const isCompleted = screening.status === "screening_completed";
          const isRescheduling = screening.status === "rescheduling_requested";
          const isUnable = screening.status === "unable_to_attend";
          const isAwaiting =
            screening.status === "screening_scheduled" ||
            screening.status === "awaiting_donor_confirmation";

          return (
            <div
              key={screening.id}
              className={`p-5 rounded-2xl border transition-all shadow-xs space-y-4 ${
                isCompleted
                  ? "bg-slate-50/80 border-slate-200"
                  : isConfirmed
                  ? "bg-emerald-50/40 border-emerald-200"
                  : isRescheduling
                  ? "bg-amber-50/40 border-amber-200"
                  : isUnable
                  ? "bg-rose-50/40 border-rose-200"
                  : "bg-white border-teal-200 ring-2 ring-teal-500/10"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-500">
                      {reqRef}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blood-50 border border-blood-200 text-blood-700 font-bold text-[11px]">
                      Group {screening.blood_group}
                    </span>
                  </div>
                  <h4 className="font-poppins font-bold text-sm text-dark truncate">
                    {screening.hospital_name}
                  </h4>
                </div>

                {/* Status Badges */}
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-300 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-teal-600" />
                    <span>Screening Completed</span>
                  </span>
                ) : isConfirmed ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Attendance Confirmed</span>
                  </span>
                ) : isRescheduling ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                    <RotateCcw className="w-3 h-3 text-amber-600" />
                    <span>Reschedule Requested</span>
                  </span>
                ) : isUnable ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                    <XCircle className="w-3 h-3 text-rose-600" />
                    <span>Unable to Attend</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 shrink-0">
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span>Awaiting Your Response</span>
                  </span>
                )}
              </div>

              {/* Arrangement Timing & Location */}
              <div className="p-3.5 rounded-xl bg-white/80 border border-slate-200/70 space-y-2 text-xs font-inter">
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  {isAsap ? (
                    <>
                      <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-bold text-amber-900">
                        Immediate Attendance (ASAP)
                      </span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>
                        <strong>
                          {new Date(screening.scheduled_date + "T00:00:00").toLocaleDateString("en-NG", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </strong>{" "}
                        at <strong>{screening.scheduled_time}</strong>
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-start gap-2 text-slate-600 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{screening.hospital_address}</span>
                </div>

                {screening.instructions && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700 block">Facility Instructions:</span>
                    <span className="italic">&quot;{screening.instructions}&quot;</span>
                  </div>
                )}
              </div>

              {/* Donor Actions */}
              {!isCompleted && !isUnable && (
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  {/* Action 1: Confirm */}
                  {!isConfirmed && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs font-bold py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 shadow-xs gap-1.5"
                      onClick={() => {
                        setConfirmNote("");
                        setError(null);
                        setActiveModal({ type: "confirm", screening });
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isAsap ? "Confirm Immediate Availability" : "Confirm Attendance"}</span>
                    </Button>
                  )}

                  {/* Action 2: Request Reschedule (for scheduled appointments) */}
                  {!isAsap && !isConfirmed && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs py-1.5 px-3 text-slate-700 hover:text-dark gap-1"
                      onClick={() => {
                        setRescheduleReason("");
                        setProposedDate("");
                        setProposedTime("");
                        setError(null);
                        setActiveModal({ type: "reschedule", screening });
                      }}
                    >
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      <span>Request Reschedule</span>
                    </Button>
                  )}

                  {/* Action 3: Unable to attend */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs py-1.5 px-3 text-rose-700 hover:bg-rose-50 border-slate-200 gap-1 ml-auto"
                    onClick={() => {
                      setUnableReason("");
                      setError(null);
                      setActiveModal({ type: "unable", screening });
                    }}
                  >
                    <XCircle className="w-3 h-3 text-rose-600" />
                    <span>Unable to Attend</span>
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {activeModal && activeModal.type === "confirm" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-poppins font-bold text-base text-slate-900">
                  {activeModal.screening.screening_type === "asap"
                    ? "Confirm Immediate Availability"
                    : "Confirm Screening Attendance"}
                </h3>
                <p className="text-xs text-slate-500 font-inter">
                  {activeModal.screening.hospital_name}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-blood-50 border border-blood-200 text-blood-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 font-inter leading-relaxed">
              {activeModal.screening.screening_type === "asap"
                ? "You are letting the healthcare facility know that you can attend screening immediately today. Please make sure you are feeling well and hydrated."
                : `You are confirming attendance for ${activeModal.screening.scheduled_date} at ${activeModal.screening.scheduled_time}. The clinical team will prepare for your arrival.`}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Optional note for the clinical team:
              </label>
              <input
                type="text"
                value={confirmNote}
                onChange={(e) => setConfirmNote(e.target.value)}
                placeholder="e.g. On my way, ETA 30 minutes / Will be there with my donor card"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-inter text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal(null)}
                disabled={isLoading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleConfirm(activeModal.screening.id)}
                disabled={isLoading}
                className="text-xs font-bold gap-1.5 shadow-sm bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? "Confirming..." : "Yes, Confirm Attendance"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {activeModal && activeModal.type === "reschedule" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-poppins font-bold text-base text-slate-900">
                  Request Rescheduling
                </h3>
                <p className="text-xs text-slate-500 font-inter">
                  {activeModal.screening.hospital_name}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-blood-50 border border-blood-200 text-blood-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for rescheduling <span className="text-blood-500">*</span>
              </label>
              <textarea
                rows={2}
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="e.g. Work schedule conflict, feeling slightly under the weather, out of town until Friday"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-inter text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proposed Date (Optional)
                </label>
                <input
                  type="date"
                  min={today}
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-inter text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proposed Time (Optional)
                </label>
                <input
                  type="time"
                  value={proposedTime}
                  onChange={(e) => setProposedTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-inter text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal(null)}
                disabled={isLoading}
                className="text-xs"
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleReschedule(activeModal.screening.id)}
                disabled={isLoading}
                className="text-xs font-bold gap-1.5 shadow-sm bg-amber-600 hover:bg-amber-700"
              >
                {isLoading ? "Sending Request..." : "Submit Reschedule Request"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Unable to Attend Modal */}
      {activeModal && activeModal.type === "unable" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-poppins font-bold text-base text-slate-900">
                  Unable to Attend Screening
                </h3>
                <p className="text-xs text-slate-500 font-inter">
                  {activeModal.screening.hospital_name}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-blood-50 border border-blood-200 text-blood-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 font-inter leading-relaxed">
              Letting the facility know promptly allows their clinical coordinator to dispatch another voluntary donor match for the patient.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason <span className="text-blood-500">*</span>
              </label>
              <textarea
                rows={3}
                value={unableReason}
                onChange={(e) => setUnableReason(e.target.value)}
                placeholder="e.g. Personal emergency, sudden travel, illness"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-inter text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal(null)}
                disabled={isLoading}
                className="text-xs"
              >
                Back
              </Button>
              <Button
                variant="blood"
                size="sm"
                onClick={() => handleUnable(activeModal.screening.id)}
                disabled={isLoading}
                className="text-xs font-bold gap-1.5 shadow-sm"
              >
                {isLoading ? "Submitting..." : "Confirm Unable to Attend"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
