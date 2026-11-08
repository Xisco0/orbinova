import React from "react";
import Link from "next/link";
import { Search, Activity, CheckCircle2, Clock, Compass, Sliders, ChevronRight, ShieldCheck, Building2, Users } from "lucide-react";
import { matchingService } from "@/services/matchingService";
import {
  PageHeader,
  Card,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
} from "@/components/ui";

interface PageProps {
  searchParams: { page?: string };
}

export default async function AdminMatchingOverviewPage({ searchParams }: PageProps) {
  const currentPage = parseInt(searchParams.page || "1", 10);
  const limit = 20;
  const offset = (currentPage - 1) * limit;

  const [analytics, { runs, total }] = await Promise.all([
    matchingService.getMatchingAnalytics(),
    matchingService.getMatchingRuns({ limit, offset }),
  ]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Smart Matching Engine"
        description="Explainable 4-factor deterministic scoring and staged dispatch analytics across Nigerian healthcare facilities."
      />

      {/* KPI Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase tracking-wider font-inter">
              Total Runs Executed
            </span>
            <Activity className="w-4 h-4 text-blood-600" />
          </div>
          <p className="text-2xl font-bold font-poppins text-slate-900">
            {analytics.totalRuns.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 font-inter">
            {analytics.totalDonorsConsidered.toLocaleString()} candidates evaluated
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase tracking-wider font-inter">
              Donor Acceptance Rate
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-poppins text-slate-900">
            {analytics.acceptanceRatePercentage}%
          </p>
          <p className="text-[11px] text-slate-500 font-inter">
            {analytics.totalAccepted} accepted / {analytics.totalNotificationsSent} dispatched
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase tracking-wider font-inter">
              Avg Matching Score
            </span>
            <Activity className="w-4 h-4 text-primary-600" />
          </div>
          <p className="text-2xl font-bold font-poppins text-slate-900">
            {Math.round(analytics.averageMatchingScore * 100)}%
          </p>
          <p className="text-[11px] text-slate-500 font-inter">
            Normalized 4-factor composite
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase tracking-wider font-inter">
              Avg Donor Distance
            </span>
            <Compass className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold font-poppins text-slate-900">
            {analytics.averageDistanceKm} km
          </p>
          <p className="text-[11px] text-slate-500 font-inter">
            Haversine geodesic proximity
          </p>
        </div>
      </div>

      {/* Algorithm Weights Breakdown Card */}
      <Card className="p-5 border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 font-poppins flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blood-600" />
              <span>Matching Engine Formula & Weights</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Score = (Compatibility &times; 0.40) + (Distance &times; 0.25) + (Availability &times; 0.20) + (Urgency &times; 0.15)
            </p>
          </div>
          <Badge variant="primary" size="sm">
            Deterministic &bull; Auditable
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-inter">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-700">1. Compatibility</span>
              <span className="font-bold text-blood-600">40%</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Red-cell ABO/Rh universal & specific donor compatibility rules.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-700">2. Distance</span>
              <span className="font-bold text-blood-600">25%</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Proximity decay within 50 km Nigerian urban/rural radius.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-700">3. Availability</span>
              <span className="font-bold text-blood-600">20%</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Active eligibility, 90-day cooldown, and donor status.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-700">4. Urgency</span>
              <span className="font-bold text-blood-600">15%</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Hospital request triage (Emergency 1.0, Urgent 0.75, Normal 0.50).
            </p>
          </div>
        </div>
      </Card>

      {/* Historical Matching Runs Table */}
      <Card className="border-slate-200 bg-white overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 font-poppins">
              Matching Runs Audit Log
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive log of candidate evaluation runs and staged dispatches
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {runs.length} of {total} runs
          </span>
        </div>

        {runs.length === 0 ? (
          <EmptyState
            title="No Matching Runs Yet"
            description="Matching runs are initiated when hospital staff request donors for blood requests."
            icon={<Activity className="w-8 h-8 text-slate-400" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run ID / Request</TableHead>
                  <TableHead>Hospital / Location</TableHead>
                  <TableHead>Blood Group & Need</TableHead>
                  <TableHead>Candidates Evaluated</TableHead>
                  <TableHead>Search Radius</TableHead>
                  <TableHead>Executed At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => {
                  const req = run.blood_requests;
                  const org = req?.organizations;

                  return (
                    <TableRow key={run.id}>
                      <TableCell className="font-mono text-xs text-slate-900">
                        <div>RUN-{run.id.substring(0, 8).toUpperCase()}</div>
                        {req && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            REQ-{req.id.substring(0, 8).toUpperCase()}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{org?.name || "Unknown Facility"}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {org?.city ? `${org.city}, ${org.state}` : "Nigeria"}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blood-600 font-poppins">
                            {req?.blood_group || "N/A"}
                          </span>
                          <span className="text-slate-500">
                            ({req?.units_fulfilled || 0}/{req?.units_required || 0} units)
                          </span>
                        </div>
                        {req?.urgency && (
                          <Badge
                            variant={
                              req.urgency === "emergency"
                                ? "blood"
                                : req.urgency === "urgent"
                                ? "warning"
                                : "primary"
                            }
                            size="sm"
                            className="mt-1"
                          >
                            {req.urgency.toUpperCase()}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="text-slate-900">
                          {run.donors_eligible} eligible
                        </div>
                        <div className="text-[11px] text-slate-500">
                          from {run.donors_considered} evaluated
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-medium text-slate-700">
                        {run.radius_km} km
                      </TableCell>

                      <TableCell className="text-xs text-slate-500">
                        {new Date(run.executed_at).toLocaleString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>

                      <TableCell className="text-right">
                        <Link
                          href={`/admin/matching/${run.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <span>Audit Breakdown</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
