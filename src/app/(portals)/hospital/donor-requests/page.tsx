import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HeartHandshake, ArrowRight, ShieldCheck, Activity } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { hasPermission, getRolePermissions } from "@/lib/auth/rbac";
import { HospitalFilterBar } from "@/components/hospital";
import { PageHeader, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, EmptyState } from "@/components/ui";

export const revalidate = 0;

interface PageProps {
  searchParams: { status?: string; search?: string };
}

export default async function HospitalDonorRequestsPage({ searchParams }: PageProps) {
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

  // Route Guard: Candidate matches accessible to clinical staff, coordinators, and administrators
  const canAccess =
    context.isOwner ||
    context.isManager ||
    permissions.includes("blood_requests.manage") ||
    permissions.includes("donors.verify") ||
    permissions.includes("blood_requests.create") ||
    permissions.includes("donors.view_records") ||
    permissions.includes("donors.register");
  if (!canAccess) {
    redirect("/hospital/dashboard");
  }

  const donorRequests = await hospitalService.getDonorRequests(
    context.organization.id,
    searchParams.status,
    searchParams.search
  );

  const filters = [
    {
      key: "status",
      label: "Response Status",
      options: [
        { label: "Accepted / Interested", value: "accepted" },
        { label: "Pending Response", value: "pending" },
        { label: "Declined", value: "declined" },
        { label: "Completed Donation", value: "completed" },
        { label: "Expired", value: "expired" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Matched Donor Responses"
          description="Real-time responses from candidate donors dispatched across your facility's active blood requests."
        />

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs text-slate-600 font-medium">
          <ShieldCheck className="w-4 h-4 text-secondary-600" />
          <span>Donor privacy protected (Zero home address disclosure)</span>
        </div>
      </div>

      <HospitalFilterBar filters={filters} searchPlaceholder="Search donor ref..." />

      {donorRequests.length === 0 ? (
        <EmptyState
          icon={<HeartHandshake className="w-7 h-7 text-secondary-600" />}
          title="No Donor Responses"
          description="Matched candidate responses will appear here when donor requests are dispatched."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor Ref</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Match %</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donorRequests.map((dr: any) => (
                <TableRow key={dr.id}>
                  <TableCell className="font-mono text-xs font-bold text-dark">
                    {dr.donor_ref}
                  </TableCell>

                  <TableCell>
                    <span className="px-2 py-0.5 rounded-md bg-blood-50 border border-blood-200 text-blood-700 font-bold text-xs">
                      {dr.blood_group}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                      <Activity className="w-3 h-3 text-teal-600" />
                      <span>{Math.round((dr.matching_score || 0.85) * 100)}%</span>
                    </span>
                  </TableCell>

                  <TableCell className="text-xs text-slate-600 font-inter">
                    {dr.distance_km ? `${dr.distance_km} km` : "Nearby area"}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        dr.status === "accepted" || dr.status === "interested"
                          ? "success"
                          : dr.status === "completed"
                          ? "success"
                          : dr.status === "pending" || dr.status === "viewed"
                          ? "warning"
                          : "secondary"
                      }
                      size="sm"
                    >
                      {dr.status === "interested" || dr.status === "accepted"
                        ? "Accepted / Interested"
                        : dr.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs text-slate-400 font-inter">
                    {new Date(dr.sent_at).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>

                  <TableCell className="text-right">
                    <Link
                      href={`/hospital/donor-requests/${dr.id}`}
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                        dr.status === "accepted" || dr.status === "interested"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          : "text-blood-600 hover:underline"
                      }`}
                    >
                      <span>
                        {dr.status === "accepted" || dr.status === "interested"
                          ? "Schedule Screening"
                          : "Inspect Match"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
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
