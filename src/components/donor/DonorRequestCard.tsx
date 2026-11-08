"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MapPin, Calendar, Clock, Droplet, ArrowRight, AlertTriangle, CheckCircle2, XCircle, Activity } from "lucide-react";
import { DonorRequestWithDetails } from "@/services/donorService";
import { Button } from "@/components/ui";
import { RequestDecisionModal } from "./RequestDecisionModal";

interface DonorRequestCardProps {
  request: DonorRequestWithDetails;
  showActions?: boolean;
}

export function DonorRequestCard({ request, showActions = true }: DonorRequestCardProps) {
  const [modalMode, setModalMode] = useState<"accept" | "decline" | null>(null);

  const bloodReq = request.blood_request;
  const matchPct = Math.round((request.matching_score || 0.85) * 100);
  const isEmergency = bloodReq?.urgency === "emergency";
  const isPending = request.status === "pending" || request.status === "viewed";
  const isInterested = (request.status as string) === "interested" || request.status === "accepted";
  const isExpired = request.status === "expired";
  const isDeclined = request.status === "declined" || (request.status as string) === "unavailable";
  const isWithdrawn = (request.status as string) === "withdrawn";
  const isCompleted = request.status === "completed";

  const urgencyStyles = {
    emergency: "bg-red-500 text-white animate-pulse",
    urgent: "bg-amber-500 text-white",
    normal: "bg-blue-500 text-white",
  }[bloodReq?.urgency || "normal"];

  const statusStyles: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
    pending: { bg: "bg-amber-50 border-amber-200 text-amber-800", text: "New Matching Request", icon: Clock },
    viewed: { bg: "bg-amber-50 border-amber-200 text-amber-800", text: "Action Needed", icon: Clock },
    interested: { bg: "bg-teal-50 border-teal-200 text-teal-800", text: "Interested", icon: CheckCircle2 },
    accepted: { bg: "bg-green-50 border-green-200 text-green-800", text: "Interested / Confirmed", icon: CheckCircle2 },
    unavailable: { bg: "bg-slate-100 border-slate-200 text-slate-600", text: "Unavailable", icon: XCircle },
    declined: { bg: "bg-slate-100 border-slate-200 text-slate-600", text: "Unavailable", icon: XCircle },
    withdrawn: { bg: "bg-slate-100 border-slate-200 text-slate-500", text: "Interest Withdrawn", icon: XCircle },
    contacted: { bg: "bg-blue-50 border-blue-200 text-blue-800", text: "Contacted by Facility", icon: Clock },
    scheduled: { bg: "bg-indigo-50 border-indigo-200 text-indigo-800", text: "Appointment Scheduled", icon: Calendar },
    awaiting_screening: { bg: "bg-purple-50 border-purple-200 text-purple-800", text: "Awaiting Screening", icon: Activity },
    deferred: { bg: "bg-amber-50 border-amber-200 text-amber-800", text: "Temporarily Deferred", icon: AlertTriangle },
    completed: { bg: "bg-emerald-50 border-emerald-200 text-emerald-800", text: "Donation Complete", icon: CheckCircle2 },
    expired: { bg: "bg-slate-100 border-slate-200 text-slate-500", text: "Request Expired", icon: AlertTriangle },
    cancelled: { bg: "bg-slate-100 border-slate-200 text-slate-500", text: "Request Closed", icon: XCircle },
  };

  const statusConfig = statusStyles[request.status] || statusStyles.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <>
      <div
        className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all ${
          isEmergency && isPending
            ? "bg-red-50/40 border-red-200 shadow-sm"
            : "bg-white border-slate-200 shadow-xs hover:border-slate-300"
        }`}
      >
        {/* Top bar: Urgency badge, Match Score, Status */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${urgencyStyles}`}
            >
              {bloodReq?.urgency || "Request"}
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
              <Activity className="w-3 h-3 text-teal-600" />
              <span>{matchPct}% Match</span>
            </span>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${statusConfig.bg}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{statusConfig.text}</span>
          </div>
        </div>

        {/* Main Details Body */}
        <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          {/* Blood Group & Units */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blood-600 text-white font-poppins font-bold text-lg flex items-center justify-center shadow-xs shrink-0">
              {bloodReq?.blood_group || "O+"}
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                Required Units
              </span>
              <p className="text-base font-bold text-dark font-poppins">
                {bloodReq?.units_required || 1} {bloodReq?.units_required === 1 ? "Unit" : "Units"}
              </p>
            </div>
          </div>

          {/* Location & Facility */}
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
              Facility & Location
            </span>
            <div className="flex items-center gap-1.5 text-xs text-dark">
              <MapPin className="w-3.5 h-3.5 text-secondary-600 shrink-0" />
              <span className="truncate">
                {bloodReq?.organization?.city || "Local Facility"},{" "}
                {bloodReq?.organization?.state || "Nigeria"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-inter pl-5">
              Approx. {request.distance_km ? `${request.distance_km} km away` : "Nearby area"}
            </p>
          </div>

          {/* Deadline / Timing */}
          <div className="space-y-1 sm:text-right">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
              Required By
            </span>
            <div className="flex items-center gap-1.5 sm:justify-end text-xs text-dark">
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                {bloodReq?.required_by
                  ? new Date(bloodReq.required_by).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Immediate Need"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-inter">
              Sent {new Date(request.sent_at).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            href={`/donor/requests/${request.id}`}
            className="text-xs text-blood-600 hover:text-blood-700 flex items-center gap-1 hover:underline self-start sm:self-auto"
          >
            <span>View Complete Match Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {showActions && isPending && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none text-slate-600 hover:text-slate-800"
                onClick={() => setModalMode("decline")}
              >
                I&apos;m Unavailable
              </Button>
              <Button
                variant="blood"
                size="sm"
                className="flex-1 sm:flex-none font-bold"
                onClick={() => setModalMode("accept")}
              >
                I&apos;m Interested
              </Button>
            </div>
          )}

          {isInterested && (
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-lg">
                ✓ Interest Confirmed
              </span>
              <button
                type="button"
                onClick={() => setModalMode("decline")}
                className="text-xs text-slate-500 hover:text-rose-600 underline cursor-pointer"
              >
                Withdraw
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Decision Modal */}
      {modalMode && (
        <RequestDecisionModal
          mode={modalMode}
          request={request}
          onClose={() => setModalMode(null)}
        />
      )}
    </>
  );
}
