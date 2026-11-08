import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FilePlus, PlusCircle, ArrowRight, Clock, AlertTriangle, HeartHandshake, CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { hasPermission } from "@/lib/auth/rbac";
import { HospitalFilterBar } from "@/components/hospital";
import { PageHeader, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, EmptyState } from "@/components/ui";

export const revalidate = 0;

interface PageProps {
  searchParams: { status?: string; urgency?: string; bloodGroup?: string; search?: string };
}

export default async function HospitalBloodRequestsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await hospitalService.getHospitalContext(user.id);
  if (!context) redirect("/hospital");

  // Route Guard: Accessing blood requests requires blood request clearance
  const canAccess =
    context.isOwner ||
    context.isManager ||
    hasPermission(user.profile?.role, "blood_requests.create", context.membership.member_role) ||
    hasPermission(user.profile?.role, "blood_requests.manage", context.membership.member_role);
  if (!canAccess) {
    redirect("/hospital/dashboard");
  }

  const requests = await hospitalService.getBloodRequests(context.organization.id, {
    status: searchParams.status,
    urgency: searchParams.urgency,
    bloodGroup: searchParams.bloodGroup,
    search: searchParams.search,
  });

  const filters = [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Pending / Open", value: "pending" },
        { label: "Donors Accepted", value: "accepted_donors" },
        { label: "Donor Matching", value: "matching" },
        { label: "Stock Reserved", value: "reserved" },
        { label: "Partially Fulfilled", value: "partially_fulfilled" },
        { label: "Fulfilled", value: "fulfilled" },
        { label: "Cancelled", value: "cancelled" },
      ],
    },
    {
      key: "urgency",
      label: "Urgency",
      options: [
        { label: "Emergency (Level 1)", value: "emergency" },
        { label: "Urgent (Level 2)", value: "urgent" },
        { label: "Normal (Level 3)", value: "normal" },
      ],
    },
    {
      key: "bloodGroup",
      label: "Blood Group",
      options: [
        { label: "A+", value: "A+" },
        { label: "A-", value: "A-" },
        { label: "B+", value: "B+" },
        { label: "B-", value: "B-" },
        { label: "AB+", value: "AB+" },
        { label: "AB-", value: "AB-" },
        { label: "O+", value: "O+" },
        { label: "O-", value: "O-" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facility Blood Requests"
        description="Monitor active requests, fulfillment progress, and candidate donor responses."
        action={
          <Link href="/hospital/blood-requests/new" className="w-full sm:w-auto">
            <Button variant="blood" size="sm" className="text-xs w-full sm:w-auto justify-center whitespace-nowrap">
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              <span>Create New Request</span>
            </Button>
          </Link>
        }
      />

      <HospitalFilterBar filters={filters} searchPlaceholder="Search requests..." />

      {requests.length === 0 ? (
        <EmptyState
          icon={<FilePlus className="w-7 h-7 text-blood-600" />}
          title="No Blood Requests Found"
          description="You haven't submitted any blood requests matching the current filters."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Units Progress</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Required By</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs text-slate-700">
                    REQ-{r.id.substring(0, 8).toUpperCase()}
                  </TableCell>

                  <TableCell>
                    <span className="px-2 py-0.5 rounded-md bg-blood-50 border border-blood-200 text-blood-700 font-bold text-xs">
                      {r.blood_group}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs font-inter">
                    <span className="font-bold text-dark">
                      {r.units_fulfilled} / {r.units_required} Units
                    </span>
                    <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div
                        className="bg-blood-600 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (r.units_fulfilled / r.units_required) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </TableCell>

                  <TableCell>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        r.urgency === "emergency"
                          ? "bg-red-100 text-red-800"
                          : r.urgency === "urgent"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {r.urgency}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={
                            r.status === "fulfilled"
                              ? "success"
                              : r.status === "open" || r.status === "matching"
                              ? "primary"
                              : r.status === "partially_fulfilled"
                              ? "warning"
                              : "secondary"
                          }
                          size="sm"
                        >
                          {r.status.replace("_", " ")}
                        </Badge>
                      </div>

                      {/* Donor Response Indicator & Next Action */}
                      {(r.accepted_donors_count ?? 0) > 0 ? (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{r.accepted_donors_count} Donor{r.accepted_donors_count! > 1 ? "s" : ""} Accepted</span>
                        </div>
                      ) : (r.pending_donors_count ?? 0) > 0 ? (
                        <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded block truncate">
                          {r.pending_donors_count} Dispatched
                        </span>
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-slate-600 font-inter">
                    {r.required_by
                      ? new Date(r.required_by).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Immediate"}
                  </TableCell>

                  <TableCell className="text-xs text-slate-400 font-inter">
                    {new Date(r.created_at).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(r.accepted_donors_count ?? 0) > 0 && (
                        <Link
                          href={`/hospital/donor-requests?status=accepted`}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors shadow-xs inline-flex items-center gap-1"
                        >
                          <span>Schedule ({r.accepted_donors_count})</span>
                        </Link>
                      )}
                      <Link
                        href={`/hospital/blood-requests/${r.id}`}
                        className="inline-flex items-center gap-1 text-xs text-blood-600 hover:underline px-2 py-1"
                      >
                        <span>Manage</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
