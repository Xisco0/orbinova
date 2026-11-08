import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin, Clock, Droplet, ShieldCheck, Building2, Phone, AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { donorService } from "@/services/donorService";
import { PageHeader, Card, Badge } from "@/components/ui";
import { RequestDetailActions } from "./RequestDetailActions";
import { DonorScreeningAppointments } from "@/components/donor";
import { screeningStore } from "@/services/screeningStore";

interface PageProps {
  params: { id: string };
}

export const revalidate = 0;

export default async function DonorRequestDetailPage({ params }: PageProps) {
  let user = await getCurrentUser("donor");
  if (!user) user = await getCurrentUser();
  if (!user) redirect("/donor/login");

  const donorContext = await donorService.getDonorContext(user.id);
  if (!donorContext) redirect("/donor");

  const request = await donorService.getDonorRequestById(
    donorContext.donorProfile.id,
    params.id,
    user.id
  );

  if (!request) {
    notFound();
  }

  const bloodReq = request.blood_request;
  const matchPct = Math.round((request.matching_score || 0.85) * 100);
  const isEmergency = bloodReq?.urgency === "emergency";
  const activeScreening = screeningStore.getActiveByDonorRequest(request.id);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back Link */}
      <Link
        href="/donor/requests"
        className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-dark transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Donation Requests</span>
      </Link>

      {/* Header Banner */}
      <div
        className={`p-6 rounded-2xl border ${
          isEmergency
            ? "bg-red-500 text-white border-red-600"
            : "bg-white border-slate-200 text-dark"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isEmergency
                ? "bg-white text-red-600 shadow-xs"
                : "bg-blood-50 text-blood-700 border border-blood-200"
            }`}
          >
            {bloodReq?.urgency || "Normal"} Priority Request
          </span>

          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
              isEmergency
                ? "bg-red-600/60 text-white"
                : "bg-teal-50 text-teal-800 border border-teal-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{matchPct}% Match Score</span>
          </span>
        </div>

        <h1 className="font-poppins font-bold text-2xl sm:text-3xl tracking-tight">
          Blood Donation Request for Group {bloodReq?.blood_group}
        </h1>
        <p
          className={`text-xs sm:text-sm mt-1 font-inter ${
            isEmergency ? "text-red-100" : "text-slate-500"
          }`}
        >
          Dispatched from an accredited healthcare institution in Nigeria.
        </p>
      </div>

      {/* Main Request Attributes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
            Blood Type
          </span>
          <p className="text-xl font-bold text-blood-600 font-poppins">
            {bloodReq?.blood_group}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
            Units Needed
          </span>
          <p className="text-xl font-bold text-dark font-poppins">
            {bloodReq?.units_required} {bloodReq?.units_required === 1 ? "Unit" : "Units"}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
            Distance
          </span>
          <p className="text-lg font-bold text-dark font-poppins">
            {request.distance_km ? `${request.distance_km} km` : "Nearby"}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
            Required By
          </span>
          <p className="text-sm font-bold text-dark font-poppins truncate">
            {bloodReq?.required_by
              ? new Date(bloodReq.required_by).toLocaleDateString("en-NG", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Urgent"}
          </p>
        </div>
      </div>

      {/* Why this match? Section */}
      <Card className="p-6 space-y-4 bg-gradient-to-br from-teal-50/50 to-white border-teal-100 shadow-xs">
        <div className="flex items-center gap-2 text-teal-900 font-poppins font-bold text-base">
          <Activity className="w-5 h-5 text-teal-600" />
          <span>Why this match?</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm font-inter">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-teal-100/80">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-dark block">Compatible Blood Group</strong>
              <span className="text-slate-600">Your {donorContext.donorProfile.blood_group} blood type is fully compatible with this recipient.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-teal-100/80">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-dark block">Within Search Area</strong>
              <span className="text-slate-600">Located in {bloodReq?.organization?.city || "your region"}, allowing fast transport and arrival.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-teal-100/80">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-dark block">Currently Available</strong>
              <span className="text-slate-600">Your readiness setting is marked as available for matching.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-teal-100/80">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-dark block">Eligibility Interval Met</strong>
              <span className="text-slate-600">You meet the required recovery interval since your previous donation.</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Facility & Location Overview */}
      <Card className="p-6 space-y-3 bg-white border-slate-200">
        <h3 className="font-poppins font-bold text-base text-dark flex items-center gap-2">
          <Building2 className="w-5 h-5 text-secondary-600" />
          <span>Requesting Healthcare Facility</span>
        </h3>

        <div className="space-y-2 text-xs sm:text-sm font-inter">
          <div className="flex items-center gap-2 text-slate-700">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              {bloodReq?.organization?.name || "Medical Facility"},{" "}
              {bloodReq?.organization?.city}, {bloodReq?.organization?.state}
            </span>
          </div>

          {bloodReq?.notes && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 mt-2">
              <span className="text-dark block mb-1">Facility Note:</span>
              <span>{bloodReq.notes}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Pre-Donation Screening Arrangement (if scheduled) */}
      {activeScreening && (
        <DonorScreeningAppointments screenings={[activeScreening]} />
      )}

      {/* Decision Actions (Client Component) */}
      <RequestDetailActions request={request} />
    </div>
  );
}
