"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  Stethoscope,
  Clock,
  Ban,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui";
import {
  completeDonorScreeningAction,
  recordMedicalEligibilityAction,
} from "@/actions/hospitalActions";
import { DonorScreeningRecord, MedicalEligibility } from "@/services/screeningStore";

interface ScreeningOutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  screening: DonorScreeningRecord;
  onSuccess?: () => void;
}

export function ScreeningOutcomeModal({
  isOpen,
  onClose,
  screening,
  onSuccess,
}: ScreeningOutcomeModalProps) {
  const router = useRouter();

  const isCompleted = screening.status === "screening_completed";

  const [outcome, setOutcome] = useState<MedicalEligibility>(
    screening.medical_eligibility !== "pending"
      ? screening.medical_eligibility
      : "eligible"
  );
  const [deferralReason, setDeferralReason] = useState(
    screening.deferral_reason || ""
  );
  const [deferralUntil, setDeferralUntil] = useState(
    screening.deferral_until || ""
  );
  const [notes, setNotes] = useState(
    screening.screening_notes || ""
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (outcome === "temporarily_deferred") {
      if (!deferralUntil) {
        setError("Please specify when the temporary deferral period ends.");
        return;
      }
      if (deferralUntil <= today) {
        setError("Deferral end date must be in the future.");
        return;
      }
      if (!deferralReason.trim()) {
        setError("Please provide a clinical reason for temporary deferral (e.g., low hemoglobin, recent medication).");
        return;
      }
    }

    if (outcome === "permanently_deferred" && !deferralReason.trim()) {
      setError("Please provide a clinical reason for permanent deferral.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. If not yet marked completed, complete screening first
      if (!isCompleted) {
        const completeRes = await completeDonorScreeningAction({
          screeningId: screening.id,
          notes: notes.trim() || undefined,
        });

        if (!completeRes.success) {
          setError(completeRes.error || "Failed to mark screening completed.");
          setIsLoading(false);
          return;
        }
      }

      // 2. Record medical eligibility assessment
      const eligibilityRes = await recordMedicalEligibilityAction({
        screeningId: screening.id,
        outcome,
        notes: notes.trim() || undefined,
        deferralReason: outcome !== "eligible" ? deferralReason.trim() : undefined,
        deferralUntil: outcome === "temporarily_deferred" ? deferralUntil : undefined,
      });

      if (!eligibilityRes.success) {
        setError(eligibilityRes.error || "Failed to record medical eligibility assessment.");
        setIsLoading(false);
        return;
      }

      router.refresh();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred while saving outcome.");
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                Donor Ref: {screening.donor_ref} ({screening.blood_group})
              </span>
              <h3 className="font-poppins font-bold text-lg text-slate-900">
                Record Clinical Screening Outcome
              </h3>
            </div>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Medical Outcome Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Qualified Medical Assessment Outcome <span className="text-blood-500">*</span>
            </label>
            <div className="space-y-2">
              {/* Eligible */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  outcome === "eligible"
                    ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="outcome"
                  value="eligible"
                  checked={outcome === "eligible"}
                  onChange={() => setOutcome("eligible")}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-poppins font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Eligible — Qualified for Blood Donation</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Vital signs, hemoglobin levels, and pre-donation medical evaluation meet all safety requirements.
                  </p>
                </div>
              </label>

              {/* Temporarily Deferred */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  outcome === "temporarily_deferred"
                    ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="outcome"
                  value="temporarily_deferred"
                  checked={outcome === "temporarily_deferred"}
                  onChange={() => setOutcome("temporarily_deferred")}
                  className="mt-1 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <div className="font-poppins font-bold text-xs text-amber-950 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Temporarily Deferred — Re-test Later</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Donor cannot donate today but may be eligible after a recovery interval (e.g., recent illness, antibiotics, slight anemia).
                  </p>
                </div>
              </label>

              {/* Permanently Deferred */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  outcome === "permanently_deferred"
                    ? "bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="outcome"
                  value="permanently_deferred"
                  checked={outcome === "permanently_deferred"}
                  onChange={() => setOutcome("permanently_deferred")}
                  className="mt-1 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <div className="font-poppins font-bold text-xs text-rose-950 flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5 text-rose-600" />
                    <span>Permanently Deferred — Ineligible</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Donor has a permanent medical contraindication for all future blood donation dispatches.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Conditional fields for Deferral */}
          {outcome === "temporarily_deferred" && (
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Deferral End Date <span className="text-blood-500">*</span>
                </label>
                <input
                  type="date"
                  min={today}
                  value={deferralUntil}
                  onChange={(e) => setDeferralUntil(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-inter text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Clinical Reason for Temporary Deferral <span className="text-blood-500">*</span>
                </label>
                <input
                  type="text"
                  value={deferralReason}
                  onChange={(e) => setDeferralReason(e.target.value)}
                  placeholder="e.g. Hemoglobin 11.8 g/dL (minimum 12.5 required), completing amoxicillin course"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-inter text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {outcome === "permanently_deferred" && (
            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-2">
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Clinical Reason for Permanent Deferral <span className="text-blood-500">*</span>
              </label>
              <input
                type="text"
                value={deferralReason}
                onChange={(e) => setDeferralReason(e.target.value)}
                placeholder="e.g. Chronic cardiac condition, viral hepatitis history"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-inter text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          )}

          {/* Clinical Screening Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Physician / Laboratory Notes <span className="text-slate-400 font-normal">(Confidential Medical Record)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. BP 120/80 mmHg, Pulse 72 bpm, Hb 13.5 g/dL. Cleared for whole blood phlebotomy."
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
              disabled={isLoading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isLoading}
              className="text-xs font-bold gap-1.5 shadow-sm"
            >
              {isLoading ? (
                <span>Recording Assessment...</span>
              ) : (
                <>
                  <span>Save Clinical Assessment</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
