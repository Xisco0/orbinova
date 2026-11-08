import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminService } from "@/services/adminService";
import {
  PageHeader,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  EmptyState,
} from "@/components/ui";
import {
  BloodGroupBadge,
  UrgencyBadge,
  RequestStatusBadge,
} from "@/components/admin";
import {
  Droplet,
  Building2,
  Calendar,
  Clock,
  Activity,
  Send,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  MapPin,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PageProps {
  params: {
    id: string;
  };
}

export const revalidate = 0;

export default async function BloodRequestDetailPage({ params }: PageProps) {
  const { request: rawRequest, matchingRuns, donorRequests, error } =
    await adminService.getBloodRequestById(params.id);

  if (error || !rawRequest) {
    notFound();
  }

  const request = rawRequest as any;

  const fulfillmentPercent = Math.min(
    100,
    Math.round((request.units_fulfilled / request.units_required) * 100)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/blood-requests"
          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline font-inter"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Blood Requests</span>
        </Link>
      </div>

      <PageHeader
        title={`Request REQ-${request.id.substring(0, 8).toUpperCase()}`}
        description={`Hospital blood request for ${request.blood_group} transfusion`}
        badge={<UrgencyBadge urgency={request.urgency} size="lg" />}
      />

      {/* Progress & Core Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Fulfillment Progress */}
        <Card className="space-y-3">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-inter">
            Fulfillment Progress
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-poppins text-3xl font-bold text-dark">
              {request.units_fulfilled}
            </span>
            <span className="text-sm text-slate-500 font-inter">
              of {request.units_required} units fulfilled ({fulfillmentPercent}%)
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full ${
                fulfillmentPercent === 100 ? "bg-green-600" : "bg-primary-600"
              }`}
              style={{ width: `${fulfillmentPercent}%` }}
            />
          </div>

          <div className="pt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Lifecycle Status:</span>
            <RequestStatusBadge status={request.status} size="sm" />
          </div>
        </Card>

        {/* Facility Information */}
        <Card className="space-y-3">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-inter">
            Requesting Facility
          </span>
          <h4 className="font-poppins text-base font-bold text-dark">
            {request.organizations?.name}
          </h4>
          <p className="text-xs text-slate-500 font-inter flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{request.organizations?.city}, {request.organizations?.state}</span>
          </p>
          <div className="pt-1">
            <Link
              href={`/admin/organizations/${request.organizations?.id}`}
              className="text-xs text-primary-600 hover:underline"
            >
              View Organization Record →
            </Link>
          </div>
        </Card>

        {/* Medical Deadlines & Group */}
        <Card className="space-y-3">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-inter">
            Clinical Target Group
          </span>
          <div className="flex items-center gap-2">
            <BloodGroupBadge bloodGroup={request.blood_group} size="lg" />
          </div>
          <p className="text-xs text-slate-500 font-inter">
            Required By: <strong>{formatDate(request.required_by)}</strong>
          </p>
          <p className="text-[11px] text-slate-400 font-inter">
            Created: {formatDate(request.created_at)}
          </p>
        </Card>
      </div>

      {/* Clinical Notes */}
      {request.notes && (
        <Card className="p-4 bg-slate-50/70">
          <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">
            Clinical Notes
          </span>
          <p className="text-xs text-slate-700 font-inter leading-relaxed">
            {request.notes}
          </p>
        </Card>
      )}

      {/* Matching Runs & Dispatched Requests Split */}
      <div className="space-y-6">
        {/* Matching Runs */}
        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-poppins text-base font-semibold text-dark">
                Smart Matching Execution Log ({matchingRuns.length})
              </h3>
              <p className="text-xs text-slate-500 font-inter">
                Recorded executions of the smart donor matching algorithm for this request
              </p>
            </div>
          </div>

          {matchingRuns.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No matching executions yet"
                description="The matching engine has not been triggered for this request."
                icon={<Activity className="w-6 h-6 text-slate-400" />}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Execution Time</TableHead>
                  <TableHead>Search Radius</TableHead>
                  <TableHead>Donors Evaluated</TableHead>
                  <TableHead>Eligible Candidates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchingRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="text-xs text-slate-600">
                      {formatDate(run.executed_at)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {run.radius_km} km
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {run.donors_considered} evaluated
                    </TableCell>
                    <TableCell className="text-xs text-green-700">
                      {run.donors_eligible} eligible
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Candidate Donor Requests */}
        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-poppins text-base font-semibold text-dark">
                Dispatched Candidate Matches ({donorRequests.length})
              </h3>
              <p className="text-xs text-slate-500 font-inter">
                Alerts dispatched to compatible donors with matching score rankings (0.00 – 1.00)
              </p>
            </div>
          </div>

          {donorRequests.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No candidate requests dispatched"
                description="When matching runs dispatch alerts to candidate donors, responses will appear here."
                icon={<Send className="w-6 h-6 text-slate-400" />}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Donor Ref</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Matching Score</TableHead>
                  <TableHead>Est. Distance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dispatched At</TableHead>
                  <TableHead>Response Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donorRequests.map((dReq: any) => (
                  <TableRow key={dReq.id}>
                    <TableCell className="font-mono text-xs text-slate-700">
                      REF-{dReq.donor_id.substring(0, 8).toUpperCase()}
                    </TableCell>

                    <TableCell>
                      <BloodGroupBadge
                        bloodGroup={dReq.donor_profiles?.blood_group || "O+"}
                        size="sm"
                      />
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-dark font-poppins">
                        <span>{(Number(dReq.matching_score) * 100).toFixed(1)}%</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({dReq.matching_score})
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-600">
                      {dReq.distance_km ? `${dReq.distance_km} km` : "Nearby"}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          dReq.status === "accepted"
                            ? "success"
                            : dReq.status === "declined"
                            ? "blood"
                            : "warning"
                        }
                        size="sm"
                      >
                        {dReq.status.toUpperCase()}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-[11px] text-slate-500">
                      {formatDate(dReq.sent_at)}
                    </TableCell>

                    <TableCell className="text-[11px] text-slate-500">
                      {formatDate(dReq.responded_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
