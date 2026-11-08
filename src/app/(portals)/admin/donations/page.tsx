import React from "react";
import Link from "next/link";
import { adminService } from "@/services/adminService";
import { BloodGroupCode } from "@/types/database";
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
  Badge,
  EmptyState,
} from "@/components/ui";
import { FilterBar, BloodGroupBadge } from "@/components/admin";
import { Heart, Droplet, Building2, Calendar, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: {
    bloodGroup?: string;
    status?: string;
    page?: string;
  };
}

export const revalidate = 0;

export default async function DonationsPage({ searchParams }: PageProps) {
  const page = parseInt(searchParams.page || "1", 10);
  const bloodGroup = (searchParams.bloodGroup || "all") as BloodGroupCode | "all";
  const status = searchParams.status || "all";

  const { data: donations, totalCount, totalPages } =
    await adminService.getDonations({
      bloodGroup,
      status,
      page,
      pageSize: 10,
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Donation Transfusion Records"
        description="Official log of fulfilled blood donations and units received at verified healthcare centers"
        action={
          <div className="text-xs text-slate-500 font-medium">
            Total Donations: <strong className="text-dark">{totalCount}</strong>
          </div>
        }
      />

      {/* Filter / Search Bar */}
      <FilterBar
        searchPlaceholder="Filter donation records..."
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
            name: "status",
            label: "Donation Status",
            value: status,
            options: [
              { label: "All Statuses", value: "all" },
              { label: "Completed", value: "completed" },
              { label: "Scheduled", value: "scheduled" },
              { label: "Cancelled", value: "cancelled" },
              { label: "Rejected", value: "rejected" },
            ],
          },
        ]}
      />


      {/* Donations Table */}
      <Card className="p-0 overflow-hidden">
        {donations.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No donation records found"
              description="No donation events match your current filter criteria."
              icon={<Heart className="w-8 h-8 text-blood-500" />}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donation REF</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead>Facility Name</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Donation Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recorded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((don: any) => (
                <TableRow key={don.id}>
                  <TableCell className="font-mono text-xs text-slate-700">
                    DON-{don.id.substring(0, 8).toUpperCase()}
                  </TableCell>

                  <TableCell className="text-dark text-xs">
                    {don.donor_profiles?.profiles?.full_name || "Voluntary Donor"}
                    <span className="block text-[10px] text-slate-400 font-mono">
                      REF: {don.donor_id.substring(0, 8).toUpperCase()}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs text-slate-700">
                    <Link
                      href={`/admin/organizations/${don.organizations?.id}`}
                      className="hover:text-primary-600 hover:underline font-medium"
                    >
                      {don.organizations?.name || "Healthcare Facility"}
                    </Link>
                    <span className="block text-[10px] text-slate-400">
                      {don.organizations?.city}, {don.organizations?.state}
                    </span>
                  </TableCell>

                  <TableCell>
                    <BloodGroupBadge bloodGroup={don.blood_group} size="sm" />
                  </TableCell>

                  <TableCell className="text-xs font-bold text-green-700">
                    +{don.units_donated} unit(s)
                  </TableCell>

                  <TableCell className="text-[11px] text-slate-600">
                    {formatDate(don.donation_date)}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        don.status === "completed"
                          ? "success"
                          : don.status === "scheduled"
                          ? "primary"
                          : "default"
                      }
                      size="sm"
                    >
                      {don.status.toUpperCase()}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs text-slate-600">
                    {don.profiles?.full_name || "Clinical Officer"}
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
