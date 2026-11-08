import React from "react";
import Link from "next/link";
import { adminService } from "@/services/adminService";
import { BloodGroupCode, RequestUrgency, RequestStatus } from "@/types/database";
import {
  PageHeader,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Pagination,
  EmptyState,
} from "@/components/ui";
import {
  FilterBar,
  BloodGroupBadge,
  UrgencyBadge,
  RequestStatusBadge,
} from "@/components/admin";
import { Droplet, Eye, Building2, Calendar, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: {
    bloodGroup?: string;
    urgency?: string;
    status?: string;
    page?: string;
  };
}

export const revalidate = 0;

export default async function BloodRequestsPage({ searchParams }: PageProps) {
  const page = parseInt(searchParams.page || "1", 10);
  const bloodGroup = (searchParams.bloodGroup || "all") as BloodGroupCode | "all";
  const urgency = (searchParams.urgency || "all") as RequestUrgency | "all";
  const status = (searchParams.status || "all") as RequestStatus | "all";

  const { data: requests, totalCount, totalPages } =
    await adminService.getBloodRequests({
      bloodGroup,
      urgency,
      status,
      page,
      pageSize: 10,
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blood Transfusion Requests"
        description="Monitor platform-wide emergency alerts, hospital blood orders, and fulfillment progress"
        action={
          <div className="text-xs text-slate-500 font-medium">
            Total Broadcasts: <strong className="text-dark">{totalCount}</strong>
          </div>
        }
      />

      {/* Filter / Search Bar */}
      <FilterBar
        searchPlaceholder="Filter requests..."
        selects={[
          {
            name: "bloodGroup",
            label: "Blood Group",
            value: bloodGroup,
            options: [
              { label: "All Blood Groups", value: "all" },
              { label: "O+", value: "O+" },
              { label: "O-", value: "O-" },
              { label: "A+", value: "A+" },
              { label: "A-", value: "A-" },
              { label: "B+", value: "B+" },
              { label: "B-", value: "B-" },
              { label: "AB+", value: "AB+" },
              { label: "AB-", value: "AB-" },
            ],
          },
          {
            name: "urgency",
            label: "Urgency Level",
            value: urgency,
            options: [
              { label: "All Urgency Levels", value: "all" },
              { label: "🔴 Emergency Only", value: "emergency" },
              { label: "🟠 Urgent", value: "urgent" },
              { label: "Standard", value: "normal" },
            ],
          },
          {
            name: "status",
            label: "Request Status",
            value: status,
            options: [
              { label: "All Statuses", value: "all" },
              { label: "Open", value: "open" },
              { label: "Matching Active", value: "matching" },
              { label: "Partially Fulfilled", value: "partially_fulfilled" },
              { label: "Fulfilled", value: "fulfilled" },
              { label: "Cancelled", value: "cancelled" },
              { label: "Expired", value: "expired" },
            ],
          },
        ]}
      />


      {/* Blood Requests Table */}
      <Card className="p-0 overflow-hidden">
        {requests.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No blood requests found"
              description="No blood requests match your selected filter criteria."
              icon={<Droplet className="w-8 h-8 text-primary-500" />}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request REF</TableHead>
                <TableHead>Facility Name</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Units Progress</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Required By</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req: any) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-xs text-slate-700">
                    REQ-{req.id.substring(0, 8).toUpperCase()}
                  </TableCell>

                  <TableCell className="text-dark text-xs">
                    <Link
                      href={`/admin/blood-requests/${req.id}`}
                      className="hover:text-primary-600 hover:underline"
                    >
                      {req.organizations?.name || "Facility"}
                    </Link>
                    <span className="block text-[10px] text-slate-400 font-normal">
                      {req.organizations?.city}, {req.organizations?.state}
                    </span>
                  </TableCell>

                  <TableCell>
                    <BloodGroupBadge bloodGroup={req.blood_group} size="sm" />
                  </TableCell>

                  <TableCell className="text-xs">
                    <div className="space-y-1">
                      <span className="text-dark">
                        {req.units_fulfilled} / {req.units_required} units
                      </span>
                      <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary-600 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((req.units_fulfilled / req.units_required) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <UrgencyBadge urgency={req.urgency} size="sm" />
                  </TableCell>

                  <TableCell>
                    <RequestStatusBadge status={req.status} size="sm" />
                  </TableCell>

                  <TableCell className="text-[11px] text-slate-500">
                    {formatDate(req.required_by)}
                  </TableCell>

                  <TableCell className="text-[11px] text-slate-500">
                    {formatDate(req.created_at)}
                  </TableCell>

                  <TableCell className="text-right">
                    <Link
                      href={`/admin/blood-requests/${req.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={10}
          totalItems={totalCount}
        />

      </Card>
    </div>
  );
}
