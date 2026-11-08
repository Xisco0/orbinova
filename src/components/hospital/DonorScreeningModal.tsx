"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  X,
  Zap,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui";
import {
  scheduleDonorScreeningAction,
  rescheduleDonorScreeningAction,
} from "@/actions/hospitalActions";
import { DonorScreeningRecord, ScreeningType } from "@/services/screeningStore";

interface DonorScreeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  donorRequest: {
    id: string;
    donor_ref: string;
    blood_group: string;
    blood_request_id: string;
  };
  existingScreening?: DonorScreeningRecord | null;
  hospitalName: string;
  hospitalAddress: string;
  onSuccess?: (screening: DonorScreeningRecord) => void;
}

export function DonorScreeningModal({
  isOpen,
  onClose,
  donorRequest,
  existingScreening,
  hospitalName,
  hospitalAddress,
  onSuccess,
}: DonorScreeningModalProps) {
  const router = useRouter();
  const isReschedule = Boolean(existingScreening);

  const [screeningType, setScreeningType] = useState<ScreeningType>(
    existingScreening?.screening_type || "scheduled"
  );
  const [scheduledDate, setScheduledDate] = useState(
    existingScreening?.scheduled_date || ""
  );
  const [scheduledTime, setScheduledTime] = useState(
    existingScreening?.scheduled_time || "09:00"
  );
  const [instructions, setInstructions] = useState(
    existingScreening?.instructions || ""
  );

  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const today = new Date().toISOString().split("T")[0];

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (screeningType === "scheduled") {
      if (!scheduledDate) {
        setError("Please choose a screening appointment date.");
        return;
      }
      if (scheduledDate < today) {
        setError("Appointment date cannot be in the past.");
        return;
      }
      if (!scheduledTime) {
        setError("Please select a screening appointment time.");
        return;
      }
    }

    setIsConfirming(true);
  };

  const handleFinalSubmit = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (isReschedule && existingScreening) {
        const result = await rescheduleDonorScreeningAction({
          screeningId: existingScreening.id,
          screeningType,
          scheduledDate: screeningType === "scheduled" ? scheduledDate : null,
          scheduledTime: screeningType === "scheduled" ? scheduledTime : null,
          instructions: instructions.trim() || undefined,
        });

        if (!result.success || !result.screening) {
          setError(result.error || "Failed to reschedule screening appointment.");
          setIsLoading(false);
          return;
        }

        if (onSuccess) onSuccess(result.screening);
      } else {
        const result = await scheduleDonorScreeningAction({
          bloodRequestId: donorRequest.blood_request_id,
          donorRequestId: donorRequest.id,
          screeningType,
          scheduledDate: screeningType === "scheduled" ? scheduledDate : null,
          scheduledTime: screeningType === "scheduled" ? scheduledTime : null,
          instructions: instructions.trim() || undefined,
        });

        if (!result.success || !result.screening) {
          setError(result.error || "Failed to schedule donor screening.");
          setIsLoading(false);
          return;
        }

        if (onSuccess) onSuccess(result.screening);
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred while scheduling.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold font-mono uppercase tracking-wide">
                Donor Ref: {donorRequest.donor_ref} ({donorRequest.blood_group})
              </span>
            </div>
            <h3 className="font-poppins font-bold text-lg text-slate-900 mt-1">
              {isReschedule ? "Reschedule Donor Screening" : "Schedule Donor Screening"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-blood-50 border border-blood-200 text-blood-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!isConfirming ? (
          <form onSubmit={handleProceedToReview} className="p-6 space-y-5">
            {/* Type Switcher */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Screening Arrangement Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setScreeningType("asap")}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    screeningType === "asap"
                      ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-xs"
                      : "bg-white border-slate-200 hover:bg-slate-50/80 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2 font-poppins font-bold text-xs text-amber-900">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>Option A: ASAP</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Immediate attendance requested. Donor confirms readiness.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setScreeningType("scheduled")}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    screeningType === "scheduled"
                      ? "bg-teal-50/70 border-teal-300 ring-2 ring-teal-500/20 shadow-xs"
                      : "bg-white border-slate-200 hover:bg-slate-50/80 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2 font-poppins font-bold text-xs text-teal-900">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span>Option B: Scheduled</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Specify appointment date &amp; clinical slot.
                  </p>
                </button>
              </div>
            </div>

            {/* ASAP Notice */}
            {screeningType === "asap" && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Immediate Screening Protocol</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    The donor will be instructed to attend your facility as soon as possible.
                    They must confirm their immediate availability before travelling.
                  </p>
                </div>
              </div>
            )}

            {/* Scheduled Date & Time Pickers */}
            {screeningType === "scheduled" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Screening Date <span className="text-blood-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      min={today}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-inter text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Appointment Time <span className="text-blood-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-inter text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Facility Location (Readonly Verified) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Screening Facility: {hospitalName}</span>
              </div>
              <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{hospitalAddress}</span>
              </div>
            </div>

            {/* Additional Instructions */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Instructions for Donor <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Please bring a valid government ID. Report to Haematology Screening Unit on Ground Floor. Drink plenty of water."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-inter text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 placeholder:text-slate-400"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="text-xs font-bold gap-1.5"
              >
                <span>Review &amp; Confirm</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        ) : (
          /* Confirmation / Review Step */
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-3">
              <h4 className="font-poppins font-bold text-xs uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Confirm Screening Arrangement Details</span>
              </h4>

              <div className="space-y-2 text-xs font-inter">
                <div className="flex justify-between py-1 border-b border-teal-100">
                  <span className="text-slate-500">Donor Reference:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {donorRequest.donor_ref} ({donorRequest.blood_group})
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-teal-100">
                  <span className="text-slate-500">Arrangement:</span>
                  <span className="font-bold text-teal-800">
                    {screeningType === "asap" ? "⚡ ASAP (Immediate Attendance)" : "📅 Scheduled Appointment"}
                  </span>
                </div>

                {screeningType === "scheduled" && (
                  <div className="flex justify-between py-1 border-b border-teal-100">
                    <span className="text-slate-500">Date &amp; Time:</span>
                    <span className="font-bold text-slate-900">
                      {new Date(scheduledDate + "T00:00:00").toLocaleDateString("en-NG", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      at {scheduledTime}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-1 border-b border-teal-100">
                  <span className="text-slate-500">Facility Location:</span>
                  <span className="font-semibold text-slate-900 truncate max-w-[220px]">
                    {hospitalName}
                  </span>
                </div>

                {instructions.trim() && (
                  <div className="py-1">
                    <span className="text-slate-500 block">Instructions:</span>
                    <span className="text-slate-800 italic block mt-0.5">
                      &quot;{instructions.trim()}&quot;
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
              Upon confirmation, an automated <strong>in-app notification</strong> and <strong>secure clinical email</strong> will be dispatched to the donor with these arrangements.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsConfirming(false)}
                disabled={isLoading}
                className="text-xs"
              >
                Back to Edit
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleFinalSubmit}
                disabled={isLoading}
                className="text-xs font-bold gap-1.5 shadow-sm"
              >
                {isLoading ? (
                  <span>Sending Invitations...</span>
                ) : (
                  <>
                    <span>Confirm &amp; Notify Donor</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
