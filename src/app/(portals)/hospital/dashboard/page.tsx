import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Droplet,
  FilePlus,
  HeartHandshake,
  Heart,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Building2,
  Clock,
  PlusCircle,
  CheckCircle2,
  Sparkles,
  CalendarCheck,
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { Button } from "@/components/ui";

export const revalidate = 0;

export default async function HospitalDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await hospitalService.getHospitalContext(user.id);
  if (!context) redirect("/hospital");

  const { organization, isManager } = context;
  const metrics = await hospitalService.getDashboardMetrics(organization.id, user.id);

  return (
    <div className="space-y-6">
      {/* Top Banner: Facility Title & Quick CTAs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-poppins font-bold text-xl sm:text-2xl md:text-3xl text-dark tracking-tight break-words">
              {organization.name}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-inter mt-1 truncate">
            {organization.city || "Nigeria"}, {organization.state || "National"} • {organization.organization_type === "blood_bank" ? "Blood Bank Node" : "Hospital Center"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 w-full md:w-auto">
          <Link href="/hospital/blood-requests/new" className="w-full sm:w-auto">
            <Button variant="blood" size="sm" className="text-xs w-full sm:w-auto justify-center whitespace-nowrap py-2 sm:py-1.5">
              <PlusCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>New Blood Request</span>
            </Button>
          </Link>
          <Link href="/hospital/inventory" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto justify-center whitespace-nowrap py-2 sm:py-1.5">
              <Droplet className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Manage Stock</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Donor Acceptance Alert Banner - Prominent visibility when voluntary donors accept to donate */}
      {metrics.donorRequestsAccepted > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/70 to-white border border-emerald-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-emerald-600 transition-all">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <HeartHandshake className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
              </span>
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-poppins font-bold text-sm sm:text-base text-emerald-950 leading-tight">
                  {metrics.donorRequestsAccepted} Candidate Donor{metrics.donorRequestsAccepted > 1 ? "s" : ""} Have Accepted To Donate!
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold tracking-wide uppercase font-inter">
                  Action Required: Schedule Screening
                </span>
              </div>
              <p className="text-xs text-emerald-900/80 font-inter leading-relaxed">
                Voluntary donors have confirmed interest in your facility&apos;s active blood requests. Next step: inspect candidate details and coordinate health screening / donation appointment.
              </p>
            </div>
          </div>

          <Link href="/hospital/donor-requests?status=accepted" className="w-full sm:w-auto shrink-0">
            <Button
              variant="primary"
              size="sm"
              className="w-full sm:w-auto justify-center whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold px-4 py-2.5 rounded-xl border border-emerald-700/20"
            >
              Review &amp; Schedule Donors →
            </Button>
          </Link>
        </div>
      )}

      {/* Critical Stock Alerts Banner - Redesigned with eye-friendly soft rose tones, high-contrast typography, and crisp red accents */}
      {metrics.criticalStockGroups.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-50 via-red-50/60 to-white border border-rose-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-rose-600 transition-all">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
              </span>
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-poppins font-bold text-sm sm:text-base text-rose-950 leading-tight">
                  Critical Blood Shortage Alert
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold tracking-wide uppercase font-inter">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-rose-900/80 font-inter leading-relaxed">
                Critical reserves for groups:{" "}
                <span className="font-semibold text-rose-900 underline decoration-rose-300 underline-offset-2">
                  {metrics.criticalStockGroups.map((g) => g.bloodGroup).join(", ")}
                </span>{" "}
                (&lt; 3 units available). Consider submitting an emergency replenishment request.
              </p>
            </div>
          </div>

          <Link href="/hospital/blood-requests/new" className="w-full sm:w-auto shrink-0">
            <Button
              variant="blood"
              size="sm"
              className="w-full sm:w-auto justify-center whitespace-nowrap bg-rose-600 hover:bg-rose-700 text-white shadow-xs font-semibold px-4 py-2.5 rounded-xl border border-rose-700/20"
            >
              Submit Blood Request Now →
            </Button>
          </Link>
        </div>
      )}

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-xs uppercase tracking-wider font-inter truncate">
              Available Units
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blood-50 text-blood-600 flex items-center justify-center shrink-0">
              <Droplet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-3xl font-bold font-poppins text-dark">
            {metrics.totalAvailableUnits}
          </h3>
          <p className="text-[10px] sm:text-[11px] text-slate-500 font-inter truncate">
            +{metrics.totalReservedUnits} units reserved
          </p>
        </div>

        <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-xs uppercase tracking-wider font-inter truncate">
              Active Requests
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FilePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-3xl font-bold font-poppins text-blue-700">
            {metrics.requests.active}
          </h3>
          <p className="text-[10px] sm:text-[11px] text-slate-500 font-inter truncate">
            {metrics.requests.fulfilled} requests fulfilled
          </p>
        </div>

        <Link
          href="/hospital/donor-requests?status=accepted"
          className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 shadow-xs space-y-1 transition-all group block"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-xs uppercase tracking-wider font-inter truncate">
              {metrics.donorRequestsAccepted > 0 ? "Donors Accepted" : "Pending Matches"}
            </span>
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                metrics.donorRequestsAccepted > 0
                  ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                  : "bg-teal-50 text-teal-600"
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <h3
            className={`text-xl sm:text-3xl font-bold font-poppins ${
              metrics.donorRequestsAccepted > 0 ? "text-emerald-700" : "text-teal-700"
            }`}
          >
            {metrics.donorRequestsAccepted > 0
              ? `${metrics.donorRequestsAccepted} Accepted`
              : metrics.donorRequestsPending}
          </h3>
          <p className="text-[10px] sm:text-[11px] text-slate-500 font-inter truncate">
            {metrics.donorRequestsAccepted > 0
              ? `${metrics.donorRequestsAccepted} ready for screening • ${metrics.donorRequestsPending} pending`
              : "Awaiting donor responses"}
          </p>
        </Link>

        <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-xs uppercase tracking-wider font-inter truncate">
              Donations Recorded
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-3xl font-bold font-poppins text-emerald-700">
            {metrics.donationsTotal}
          </h3>
          <p className="text-[10px] sm:text-[11px] text-slate-500 font-inter truncate">
            Total transfusions / collections
          </p>
        </div>
      </div>

      {/* 8-Blood-Group Quick Inventory Health Bar */}
      <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-poppins font-bold text-xs sm:text-sm text-dark flex items-center gap-1.5 sm:gap-2 truncate">
            <Droplet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blood-600 shrink-0" />
            <span className="truncate">Facility Blood Reserves (8 Groups)</span>
          </h3>
          <Link
            href="/hospital/inventory"
            className="text-[11px] sm:text-xs text-secondary-600 hover:underline shrink-0 font-medium"
          >
            Full Matrix →
          </Link>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2.5">
          {Object.entries(metrics.stockMap).map(([bg, stock]) => {
            const isCrit = stock.available < 3;
            const isLow = stock.available >= 3 && stock.available < 10;
            return (
              <div
                key={bg}
                className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border text-center font-inter ${
                  isCrit
                    ? "bg-red-50/70 border-red-200 text-red-950"
                    : isLow
                    ? "bg-amber-50/70 border-amber-200 text-amber-950"
                    : "bg-slate-50 border-slate-200 text-dark"
                }`}
              >
                <span className="text-xs font-bold block font-poppins">{bg}</span>
                <span className="text-base sm:text-lg font-bold block">{stock.available}</span>
                <span className="text-[8px] sm:text-[9px] uppercase tracking-wider opacity-70 block truncate">
                  Units
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3-Column / 2-Column: Recent Blood Requests & Recent Donor Responses Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Blood Requests with Donor Acceptance Status & Next Action */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-poppins font-bold text-base text-dark flex items-center gap-2">
              <FilePlus className="w-4 h-4 text-primary-600" />
              <span>Blood Requests &amp; Donor Status</span>
            </h3>
            <Link
              href="/hospital/blood-requests"
              className="text-xs text-primary-600 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {metrics.recentRequests.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              No recent blood requests created.
            </p>
          ) : (
            <div className="space-y-3">
              {metrics.recentRequests.map((req) => {
                const hasAccepted = (req.accepted_donors_count ?? 0) > 0;
                const hasPending = (req.pending_donors_count ?? 0) > 0;

                return (
                  <div
                    key={req.id}
                    className={`p-3.5 rounded-xl border transition-all text-xs font-inter ${
                      hasAccepted
                        ? "border-emerald-200 bg-emerald-50/30 hover:border-emerald-300"
                        : "border-slate-100 hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-8 h-8 rounded-lg bg-blood-50 border border-blood-200 text-blood-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {req.blood_group}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-slate-600">
                              REQ-{req.id.substring(0, 8).toUpperCase()}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                req.urgency === "emergency"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {req.status}
                            </span>
                          </div>
                          <p className="font-bold text-dark truncate mt-0.5">
                            {req.units_required} Units Required ({req.units_fulfilled} fulfilled)
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/hospital/blood-requests/${req.id}`}
                        className="text-xs text-blood-600 hover:underline shrink-0 font-medium"
                      >
                        Manage →
                      </Link>
                    </div>

                    {/* Donor Status Indicator & Next Step CTA */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      {hasAccepted ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>{req.accepted_donors_count} Donor{req.accepted_donors_count! > 1 ? "s" : ""} Accepted</span>
                          </span>
                          <span className="text-[11px] text-emerald-800 font-medium">
                            Ready for screening
                          </span>
                        </div>
                      ) : hasPending ? (
                        <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                          ⏳ Dispatched to {req.pending_donors_count} candidate donors
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Awaiting candidate matches
                        </span>
                      )}

                      {hasAccepted ? (
                        <Link
                          href="/hospital/donor-requests?status=accepted"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-colors shadow-xs"
                        >
                          <CalendarCheck className="w-3 h-3" />
                          <span>Schedule Screening →</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/hospital/blood-requests/${req.id}`}
                          className="text-[11px] text-slate-500 hover:text-dark hover:underline flex items-center gap-1"
                        >
                          <span>Inspect details</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Candidate Donor Responses Feed */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-poppins font-bold text-base text-dark flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Recent Donor Responses</span>
            </h3>
            <Link
              href="/hospital/donor-requests"
              className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-medium shrink-0"
            >
              <span>View All Matches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {metrics.recentDonorResponses.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              No donor responses recorded yet. Dispatched candidate matches will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {metrics.recentDonorResponses.map((dr) => {
                const isAccepted = dr.status === "accepted" || dr.status === "interested";

                return (
                  <div
                    key={dr.id}
                    className={`p-3 rounded-xl border text-xs font-inter flex items-center justify-between gap-3 ${
                      isAccepted
                        ? "bg-emerald-50/50 border-emerald-200/80"
                        : "bg-slate-50/60 border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-8 h-8 rounded-lg bg-blood-50 border border-blood-200 text-blood-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {dr.blood_group}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-dark truncate">
                            {dr.donor_ref}
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                              isAccepted
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {isAccepted ? "Accepted / Interested" : dr.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {Math.round((dr.matching_score || 0.85) * 100)}% Match • {dr.distance_km ? `${dr.distance_km} km away` : "Nearby"}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/hospital/donor-requests/${dr.id}`}
                      className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                        isAccepted
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          : "text-slate-600 hover:underline"
                      }`}
                    >
                      <span>{isAccepted ? "Schedule" : "Inspect"}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {/* Workflow Guide: What to do when a donor accepts */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-inter space-y-2 mt-2">
            <div className="flex items-center gap-1.5 text-slate-900 font-semibold font-poppins text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Next Steps When A Donor Accepts:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
              <li>
                <strong className="text-slate-800">Review &amp; Contact:</strong> Click <em>Schedule</em> to inspect the donor ref and verify suitability.
              </li>
              <li>
                <strong className="text-slate-800">Screening Appointment:</strong> Coordinate the donor&apos;s arrival time at your facility ward.
              </li>
              <li>
                <strong className="text-slate-800">Record Donation:</strong> Collect the blood unit and record it in <Link href="/hospital/donations" className="text-emerald-700 underline font-medium">Facility Donations</Link> to credit inventory and satisfy this request.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
