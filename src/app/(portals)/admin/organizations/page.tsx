import React from "react";
import { adminService } from "@/services/adminService";
import { OrgType, VerificationStatus } from "@/types/database";
import { PageHeader, Pagination } from "@/components/ui";
import { FilterBar } from "@/components/admin";
import { OrganizationsClient } from "./OrganizationsClient";

interface PageProps {
  searchParams: {
    search?: string;
    type?: string;
    status?: string;
    page?: string;
  };
}

export const revalidate = 0;

export default async function OrganizationsPage({ searchParams }: PageProps) {
  const page = parseInt(searchParams.page || "1", 10);
  const search = searchParams.search || "";
  const type = (searchParams.type || "all") as OrgType | "all";
  const status = (searchParams.status || "all") as VerificationStatus | "all";

  const { data: organizations, totalCount, totalPages } =
    await adminService.getOrganizations({
      search,
      type,
      status,
      page,
      pageSize: 10,
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Healthcare Institutions & Blood Banks"
        description="Onboard, audit licensing clearance, and manage active facility participation on the network."
        action={
          <div className="text-xs text-slate-500 font-medium">
            Total Facilities: <strong className="text-dark">{totalCount}</strong>
          </div>
        }
      />

      {/* Filter / Search Bar */}
      <FilterBar
        searchPlaceholder="Search by facility name, email, city, or state..."
        selects={[
          {
            name: "type",
            label: "Facility Type",
            value: type,
            options: [
              { label: "All Facility Types", value: "all" },
              { label: "Hospitals", value: "hospital" },
              { label: "Blood Banks", value: "blood_bank" },
            ],
          },
          {
            name: "status",
            label: "Verification Status",
            value: status,
            options: [
              { label: "All Verification States", value: "all" },
              { label: "Verified (Active)", value: "verified" },
              { label: "Pending Review", value: "pending" },
              { label: "Suspended", value: "suspended" },
              { label: "Unboarded", value: "unboarded" },
              { label: "Rejected", value: "rejected" },
            ],
          },
        ]}
      />

      <OrganizationsClient organizations={organizations as any} />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={10}
        totalItems={totalCount}
      />
    </div>
  );
}
