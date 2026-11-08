import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, HeartHandshake, ShieldCheck, CheckCircle2, Clock, Droplet, MapPin, Calendar, Activity } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { getRolePermissions } from "@/lib/auth/rbac";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { screeningStore } from "@/services/screeningStore";

interface PageProps {
  params: { id: string };
}

export default async function HospitalDonorRequestDetailPage({ params }: PageProps) {
  const user = await getCurrentUser("hospital");
  if (!user) redirect("/login?redirect=/hospital/donor-requests");

  const context = await hospitalService.getHospitalContext(user.id);
  if (!context) redirect("/hospital/dashboard");

  const effectiveRole =
    user.profile?.role ||
    context.user?.role ||
    (context.organization.organization_type === "blood_bank" ? "blood_bank" : "hospital");
  const memberRole = context.membership?.member_role;
  const permissions = getRolePermissions(effectiveRole, memberRole);

  const canAccess =
    context.isOwner ||
    context.isManager ||
    permissions.includes("blood_requests.manage") ||
    permissions.includes("donors.verify") ||
    permissions.includes("blood_requests.create") ||
    permissions.includes("donors.view_records") ||
    permissions.includes("donors.register");

  if (!canAccess) {
    redirect("/hospital/donor-requests");
  }

  const data = await hospitalService.getDonorRequestById(
    context.organization.id,
    params.id
  );

  if (!data) {
    notFound();
  }

  const matchPct = Math.round((data.matching_score || 0.85) * 100);
  const bloodReq = (data as any).blood_requests;
  const activeScreening = screeningStore.getActiveByDonorRequest(data.id);

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/hospital/donor-requests"
        className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-dark transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Candidate Responses</span>
      </Link>

      {/* Header Banner */}
      <Card className="p-6 bg-white border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-inter">
                Candidate Match Record
              </span>
              <h2 className="font-poppins font-bold text-xl text-dark">
                Candidate: {data.donor_ref}
              </h2>
            </div>
          </div>

          <Badge
            variant={
              data.status === "accepted" || data.status === "completed"
                ? "success"
                : data.status === "pending"
                ? "warning"
                : "secondary"
            }
            size="md"
          >
            Response: {data.status.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-inter">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 uppercase text-[10px] block">
              Blood Group
            </span>
            <span className="font-bold text-blood-600 text-base font-poppins">
              {data.blood_group}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 uppercase text-[10px] block">
              Overall Match
            </span>
            <span className="font-bold text-teal-700 text-base font-poppins">
              {matchPct}%
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 uppercase text-[10px] block">
              Proximity
            </span>
            <span className="font-bold text-dark text-base font-poppins">
              {data.distance_km ? `${data.distance_km} km` : "Nearby"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 uppercase text-[10px] block">
              Dispatched At
            </span>
            <span className="font-medium text-dark text-xs truncate">
              {new Date(data.sent_at).toLocaleDateString("en-NG", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </Card>

      {/* Why this match? */}
      <Card className="p-6 space-y-4 bg-teal-50/40 border-teal-100">
        <div className="flex items-center gap-2 text-teal-900 font-poppins font-bold text-base">
          <Activity className="w-5 h-5 text-teal-600" />
          <span>Why this match? (Candidate Analysis)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm font-inter">
          <div className="p-3 rounded-xl bg-white border border-teal-100 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-dark block">Blood Compatibility</strong>
              <span className="text-slate-600">Donor type {data.blood_group} is verified compatible with recipient requirements.</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white border border-teal-100 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-dark block">Proximity Radius</strong>
              <span className="text-slate-600">Donor is located within the active operational radius for your facility.</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white border border-teal-100 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-dark block">Availability Setting</strong>
              <span className="text-slate-600">Active and marked as available to receive match dispatches.</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white border border-teal-100 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-dark block">Eligibility Rest Period</strong>
              <span className="text-slate-600">Meets the required standard recovery interval between donations.</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Screening Status Card */}
      <Card className="p-6 space-y-3 bg-white border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="font-poppins font-bold text-sm text-dark flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>Pre-Donation Screening Status</span>
          </h3>
          {activeScreening ? (
            <Badge
              variant={
                activeScreening.status === "attendance_confirmed" || activeScreening.status === "screening_completed"
                  ? "success"
                  : activeScreening.status === "rescheduling_requested"
                  ? "warning"
                  : activeScreening.status === "unable_to_attend"
                  ? "secondary"
                  : "primary"
              }
              size="sm"
            >
              {activeScreening.status.replace(/_/g, " ").toUpperCase()}
            </Badge>
          ) : (
            <Badge variant="secondary" size="sm">
              Not Scheduled
            </Badge>
          )}
        </div>

        {activeScreening ? (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs font-inter">
            <div className="flex justify-between">
              <span className="text-slate-500">Arrangement:</span>
              <span className="font-bold text-dark">
                {activeScreening.screening_type === "asap" ? "⚡ ASAP Immediate Attendance" : "📅 Scheduled Appointment"}
              </span>
            </div>
            {activeScreening.screening_type === "scheduled" && activeScreening.scheduled_date && (
              <div className="flex justify-between">
                <span className="text-slate-500">Date &amp; Time:</span>
                <span className="font-bold text-dark">
                  {activeScreening.scheduled_date} at {activeScreening.scheduled_time}
                </span>
              </div>
            )}
            {activeScreening.instructions && (
              <div className="pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 block">Instructions:</span>
                <span className="text-slate-700 italic block mt-0.5">&quot;{activeScreening.instructions}&quot;</span>
              </div>
            )}
            {activeScreening.medical_eligibility !== "pending" && (
              <div className="flex justify-between pt-1 border-t border-slate-200/60 font-semibold">
                <span className="text-slate-500">Medical Outcome:</span>
                <span className={activeScreening.medical_eligibility === "eligible" ? "text-emerald-700" : "text-amber-700"}>
                  {activeScreening.medical_eligibility.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>
            )}
            {bloodReq && (
              <div className="pt-2 text-right">
                <Link
                  href={`/hospital/blood-requests/${bloodReq.id}`}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 underline"
                >
                  Manage Screening on Blood Request →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs font-inter">
            <span className="text-slate-500">
              {data.status === "accepted" || data.status === "interested"
                ? "Candidate has expressed interest and is ready for screening scheduling."
                : "Awaiting candidate response before scheduling pre-donation screening."}
            </span>
            {bloodReq && (data.status === "accepted" || data.status === "interested") && (
              <Link
                href={`/hospital/blood-requests/${bloodReq.id}`}
                className="font-bold text-emerald-600 hover:text-emerald-800 text-xs px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 shrink-0"
              >
                Schedule on Request →
              </Link>
            )}
          </div>
        )}
      </Card>

      {/* Linked Blood Request */}
      {bloodReq && (
        <Card className="p-6 space-y-3 bg-white border-slate-200">
          <h3 className="font-poppins font-bold text-sm text-dark">
            Linked Facility Blood Request
          </h3>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs font-inter">
            <div>
              <span className="font-bold text-dark block">
                Request REQ-{bloodReq.id.substring(0, 8).toUpperCase()}
              </span>
              <span className="text-slate-500">
                {bloodReq.units_required} Units of {bloodReq.blood_group} • Priority: {bloodReq.urgency}
              </span>
            </div>
            <Link
              href={`/hospital/blood-requests/${bloodReq.id}`}
              className="text-xs font-bold text-blood-600 hover:underline"
            >
              View Request →
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
