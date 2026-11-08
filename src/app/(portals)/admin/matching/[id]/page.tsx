import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Clock, Compass, CheckCircle2, XCircle, AlertTriangle, User, ShieldCheck, Droplet, Info, Activity } from "lucide-react";
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
  params: { id: string };
}

export default async function AdminMatchingRunDetailPage({ params }: PageProps) {
  const run = await matchingService.getMatchingRunById(params.id);

  if (!run) {
    notFound();
  }

  const req = run.blood_requests;
  const org = req?.organizations;
  const candidates = run.donor_requests || [];

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/admin/matching"
        className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-dark transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Matching Runs</span>
      </Link>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-poppins font-bold text-2xl text-slate-900">
              Matching Audit: RUN-{run.id.substring(0, 8).toUpperCase()}
            </h1>
            <Badge variant="primary" size="md">
              COMPLETED
            </Badge>
          </div>
          <p className="text-xs text-slate-500 font-inter mt-1">
            Executed on{" "}
            {new Date(run.executed_at).toLocaleString("en-NG", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        </div>

        {req && (
          <Link
            href={`/admin/blood-requests/${req.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg shadow-xs transition-colors"
          >
            <Droplet className="w-4 h-4 text-blood-600" />
            <span>View Request REQ-{req.id.substring(0, 8).toUpperCase()}</span>
          </Link>
        )}
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
            Target Blood Group
          </span>
          <p className="text-2xl font-bold text-blood-600 font-poppins">
            {req?.blood_group || "N/A"}
          </p>
          <p className="text-[11px] text-slate-500">
            {req?.units_fulfilled || 0} of {req?.units_required || 0} units fulfilled
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
            Candidates Evaluated
          </span>
          <p className="text-2xl font-bold text-slate-900 font-poppins">
            {run.donors_considered}
          </p>
          <p className="text-[11px] text-slate-500">
            Total in database pool
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
            Eligible Donors
          </span>
          <p className="text-2xl font-bold text-emerald-600 font-poppins">
            {run.donors_eligible}
          </p>
          <p className="text-[11px] text-slate-500">
            Passed hard compatibility & eligibility
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
            Search Radius
          </span>
          <p className="text-2xl font-bold text-slate-900 font-poppins">
            {run.radius_km} km
          </p>
          <p className="text-[11px] text-slate-500">
            Geodesic proximity limit
          </p>
        </div>
      </div>

      {/* Target Hospital Context */}
      <Card className="p-5 border-slate-200 bg-white">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 font-poppins">
            Requesting Facility & Clinical Triage Context
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-inter">
          <div>
            <span className="text-slate-400 block mb-0.5">Facility Name</span>
            <span className="text-slate-800">{org?.name || "N/A"}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Location / City</span>
            <span className="text-slate-800">
              {org?.city ? `${org.city}, ${org.state}` : "Nigeria"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Clinical Urgency</span>
            <Badge
              variant={
                req?.urgency === "emergency"
                  ? "blood"
                  : req?.urgency === "urgent"
                  ? "warning"
                  : "primary"
              }
              size="sm"
            >
              {req?.urgency?.toUpperCase() || "NORMAL"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Candidate Ranking & Score Breakdown Audit Table */}
      <Card className="border-slate-200 bg-white overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 font-poppins">
              Candidate Donor Scoring Breakdown
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Exact mathematical weights: Compatibility (40%), Distance (25%), Availability (20%), Urgency (15%)
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {candidates.length} Dispatched Candidates
          </span>
        </div>

        {candidates.length === 0 ? (
          <EmptyState
            title="No Candidates Dispatched"
            description="No eligible donors met the hard compatibility, availability, and geographic proximity criteria for this run."
            icon={<Activity className="w-8 h-8 text-slate-400" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank & Donor</TableHead>
                  <TableHead>Blood Group</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead className="min-w-[200px]">Sub-Scores Breakdown</TableHead>
                  <TableHead>Final Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dispatched / Responded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((cand, index) => {
                  const donorName = cand.profiles?.full_name || `Donor ${cand.donor_id.substring(0, 6)}`;
                  const percentage = Math.round(cand.matching_score * 100);

                  return (
                    <TableRow key={cand.id}>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px]">
                            #{index + 1}
                          </span>
                          <div>
                            <div className="text-slate-900">{donorName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {cand.donor_id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-bold text-blood-600 font-poppins">
                        {cand.donor_profiles?.blood_group || "N/A"}
                      </TableCell>

                      <TableCell className="text-xs text-slate-700">
                        {cand.distance_km !== null ? `${cand.distance_km} km` : "N/A"}
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between text-slate-600">
                            <span>Compatibility (40%):</span>
                            <span className="font-mono">
                              {Math.round(cand.compatibility_score * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Distance (25%):</span>
                            <span className="font-mono">
                              {Math.round(cand.distance_score * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Availability (20%):</span>
                            <span className="font-mono">
                              {Math.round(cand.availability_score * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Urgency (15%):</span>
                            <span className="font-mono">
                              {Math.round(cand.urgency_score * 100)}%
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="font-bold text-slate-900 text-sm font-poppins">
                          {percentage}%
                        </div>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className="bg-blood-600 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                          />
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <Badge
                          variant={
                            cand.status === "accepted"
                              ? "success"
                              : cand.status === "declined"
                              ? "blood"
                              : cand.status === "expired"
                              ? "default"
                              : "warning"
                          }
                          size="sm"
                        >
                          {cand.status.toUpperCase()}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-slate-500">
                        <div>
                          Sent: {new Date(cand.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        {cand.responded_at && (
                          <div className="text-slate-700 font-medium">
                            Responded: {new Date(cand.responded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
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
