"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  HeartHandshake,
  MoreVertical,
  Stethoscope,
  XCircle,
  Zap,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { DonorScreeningModal } from "./DonorScreeningModal";
import { ScreeningOutcomeModal } from "./ScreeningOutcomeModal";
import { cancelDonorScreeningAction } from "@/actions/hospitalActions";
import { DonorScreeningRecord } from "@/services/screeningStore";

interface HospitalScreeningManagerProps {
  donorRequests: Array<{
    id: string;
    donor_ref: string;
    blood_group: string;
    blood_request_id: string;
    status: string;
    matching_score?: number;
    distance_km?: number | null;
    sent_at: string;
  }>;
  screenings: DonorScreeningRecord[];
  hospitalName: string;
  hospitalAddress: string;
  canManage: boolean;
}

export function HospitalScreeningManager({
  donorRequests,
  screenings: initialScreenings,
  hospitalName,
  hospitalAddress,
  canManage,
}: HospitalScreeningManagerProps) {
  const router = useRouter();

  // Local state for modal triggers
  const [activeModal, setActiveModal] = useState<{
    type: "schedule" | "reschedule" | "outcome" | "cancel";
    donorRequest: any;
    screening?: DonorScreeningRecord | null;
  } | null>(null);

  // Cancellation state
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const getActiveScreeningForDonor = (donorRequestId: string) => {
    return initialScreenings.find(
      (s) => s.donor_request_id === donorRequestId && s.status !== "cancelled"
    );
  };

  const handleCancelScreening = async (screeningId: string) => {
    if (!cancelReason.trim()) {
      setCancelError("Please enter a reason for cancellation.");
      return;
    }

    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await cancelDonorScreeningAction({
        screeningId,
        reason: cancelReason.trim(),
      });

      if (!res.success) {
        setCancelError(res.error || "Failed to cancel appointment.");
        setIsCancelling(false);
        return;
      }

      setActiveModal(null);
      setCancelReason("");
      router.refresh();
    } catch (err: any) {
      setCancelError(err?.message || "An error occurred.");
    } finally {
      setIsCancelling(false);
    }
  };

  const renderStatusBadge = (dr: any, screening?: DonorScreeningRecord | null) => {
    if (screening) {
      if (screening.status === "screening_completed") {
        if (screening.medical_eligibility === "eligible") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Eligible for Donation</span>
            </span>
          );
        }
        if (screening.medical_eligibility === "temporarily_deferred") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Temporarily Deferred</span>
            </span>
          );
        }
        if (screening.medical_eligibility === "permanently_deferred") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Permanently Deferred</span>
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Screening Completed</span>
          </span>
        );
      }

      if (screening.status === "attendance_confirmed") {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Attendance Confirmed</span>
          </span>
        );
      }

      if (screening.status === "rescheduling_requested") {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200" title={screening.donor_reschedule_reason || "Reschedule requested"}>
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>Reschedule Requested</span>
          </span>
        );
      }

      if (screening.status === "unable_to_attend") {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200" title={screening.donor_unable_reason || "Unable to attend"}>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Unable to Attend</span>
          </span>
        );
      }

      if (screening.status === "screening_scheduled" || screening.status === "awaiting_donor_confirmation") {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{screening.screening_type === "asap" ? "ASAP Scheduled" : "Awaiting Confirmation"}</span>
          </span>
        );
      }
    }

    if (dr.status === "accepted" || dr.status === "interested") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
          <HeartHandshake className="w-3.5 h-3.5 text-teal-600" />
          <span>Interested / Ready</span>
        </span>
      );
    }

    if (dr.status === "pending" || dr.status === "viewed") {
      return (
        <Badge variant="warning" size="sm">
          Pending Response
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" size="sm">
        {dr.status}
      </Badge>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-poppins font-bold text-base text-dark flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-secondary-600" />
          <span>Dispatched Donor Matches &amp; Pre-Donation Screenings ({donorRequests.length})</span>
        </h3>
        <span className="text-xs text-slate-400">
          Donor identities are anonymized for privacy
        </span>
      </div>

      {donorRequests.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          No donor matches recorded for this request yet. Matches will appear as voluntary donors are notified.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">
                  <th className="py-3.5 px-4">Donor Ref</th>
                  <th className="py-3.5 px-4">Blood Group</th>
                  <th className="py-3.5 px-4">Match Score</th>
                  <th className="py-3.5 px-4">Distance</th>
                  <th className="py-3.5 px-4">Screening Progress</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-inter">
                {donorRequests.map((dr) => {
                  const screening = getActiveScreeningForDonor(dr.id);
                  const isInterested = dr.status === "accepted" || dr.status === "interested";

                  return (
                    <tr key={dr.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-dark">
                        {dr.donor_ref}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-blood-50 border border-blood-200 text-blood-700 font-bold text-xs">
                          {dr.blood_group}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                          <Activity className="w-3 h-3 text-teal-600" />
                          <span>{Math.round((dr.matching_score || 0.85) * 100)}%</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {dr.distance_km ? `${dr.distance_km} km` : "Nearby"}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {renderStatusBadge(dr, screening)}
                          {screening && screening.screening_type === "scheduled" && screening.scheduled_date && (
                            <div className="text-[10px] text-slate-500 font-inter">
                              {new Date(screening.scheduled_date + "T00:00:00").toLocaleDateString("en-NG", {
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              at {screening.scheduled_time}
                            </div>
                          )}
                          {screening && screening.screening_type === "asap" && (
                            <div className="text-[10px] text-amber-700 font-inter font-medium flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5 text-amber-600" />
                              <span>ASAP Attendance</span>
                            </div>
                          )}
                          {screening?.donor_reschedule_reason && (
                            <div className="text-[10px] text-amber-800 bg-amber-50 p-1 rounded border border-amber-200/60 max-w-xs truncate">
                              Donor: &quot;{screening.donor_reschedule_reason}&quot;
                            </div>
                          )}
                          {screening?.donor_unable_reason && (
                            <div className="text-[10px] text-rose-800 bg-rose-50 p-1 rounded border border-rose-200/60 max-w-xs truncate">
                              Donor: &quot;{screening.donor_unable_reason}&quot;
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Case 1: Interested but no screening yet */}
                          {isInterested && !screening && canManage && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs font-semibold py-1 px-2.5 gap-1 shadow-xs bg-emerald-600 hover:bg-emerald-700"
                              onClick={() =>
                                setActiveModal({
                                  type: "schedule",
                                  donorRequest: dr,
                                })
                              }
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Schedule Screening</span>
                            </Button>
                          )}

                          {/* Case 2: Screening scheduled / awaiting / confirmed */}
                          {screening && screening.status !== "screening_completed" && canManage && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs py-1 px-2 text-slate-700 hover:text-dark gap-1"
                                onClick={() =>
                                  setActiveModal({
                                    type: "reschedule",
                                    donorRequest: dr,
                                    screening,
                                  })
                                }
                              >
                                <RotateCcw className="w-3 h-3 text-slate-500" />
                                <span>Reschedule</span>
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs py-1 px-2 text-blood-700 hover:bg-blood-50 border-slate-200 gap-1"
                                onClick={() => {
                                  setCancelReason("");
                                  setCancelError(null);
                                  setActiveModal({
                                    type: "cancel",
                                    donorRequest: dr,
                                    screening,
                                  });
                                }}
                              >
                                <XCircle className="w-3 h-3 text-blood-600" />
                                <span>Cancel</span>
                              </Button>

                              <Button
                                variant="primary"
                                size="sm"
                                className="text-xs py-1 px-2.5 font-bold gap-1 shadow-xs bg-teal-600 hover:bg-teal-700"
                                onClick={() =>
                                  setActiveModal({
                                    type: "outcome",
                                    donorRequest: dr,
                                    screening,
                                  })
                                }
                              >
                                <Stethoscope className="w-3.5 h-3.5" />
                                <span>Record Outcome</span>
                              </Button>
                            </>
                          )}

                          {/* Case 3: Completed screening -> update clinical outcome */}
                          {screening && screening.status === "screening_completed" && canManage && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs py-1 px-2.5 text-teal-800 border-teal-200 bg-teal-50 hover:bg-teal-100 font-semibold gap-1"
                              onClick={() =>
                                setActiveModal({
                                  type: "outcome",
                                  donorRequest: dr,
                                  screening,
                                })
                              }
                            >
                              <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                              <span>View / Update Outcome</span>
                            </Button>
                          )}

                          {/* Fallback View Details link */}
                          <Link
                            href={`/hospital/donor-requests/${dr.id}`}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Candidate Analysis"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule / Reschedule Modal */}
      {activeModal && (activeModal.type === "schedule" || activeModal.type === "reschedule") && (
        <DonorScreeningModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          donorRequest={activeModal.donorRequest}
          existingScreening={activeModal.screening}
          hospitalName={hospitalName}
          hospitalAddress={hospitalAddress}
          onSuccess={() => {
            setActiveModal(null);
            router.refresh();
          }}
        />
      )}

      {/* Record Outcome Modal */}
      {activeModal && activeModal.type === "outcome" && activeModal.screening && (
        <ScreeningOutcomeModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          screening={activeModal.screening}
          onSuccess={() => {
            setActiveModal(null);
            router.refresh();
          }}
        />
      )}

      {/* Cancellation Modal */}
      {activeModal && activeModal.type === "cancel" && activeModal.screening && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blood-50 border border-blood-200 text-blood-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-blood-600" />
              </div>
              <div>
                <h3 className="font-poppins font-bold text-base text-slate-900">
                  Cancel Screening Arrangement
                </h3>
                <p className="text-xs text-slate-500 font-inter">
                  Candidate Donor {activeModal.donorRequest.donor_ref}
                </p>
              </div>
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-blood-50 border border-blood-200 text-blood-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 font-inter leading-relaxed">
              Cancelling will update this screening record and notify the donor via email and in-app alert. Please provide a clear clinical or operational reason.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cancellation Reason <span className="text-blood-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Request fulfilled by internal inventory, surgery postponed, donor requested phone reschedule."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-inter text-slate-900 focus:outline-none focus:ring-2 focus:ring-blood-500/20 focus:border-blood-500 placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal(null)}
                disabled={isCancelling}
                className="text-xs"
              >
                Keep Appointment
              </Button>
              <Button
                variant="blood"
                size="sm"
                onClick={() => handleCancelScreening(activeModal.screening!.id)}
                disabled={isCancelling}
                className="text-xs font-bold gap-1.5 shadow-sm"
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
