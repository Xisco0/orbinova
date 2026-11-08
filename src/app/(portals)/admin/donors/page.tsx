import React from "react";
import { adminService } from "@/services/adminService";
import { BloodGroupCode } from "@/types/database";
import { PageHeader, Pagination } from "@/components/ui";
import { FilterBar } from "@/components/admin";
import { DonorsClient } from "./DonorsClient";

interface PageProps {
  searchParams: {
    search?: string;
    bloodGroup?: string;
    availability?: string;
    eligibility?: string;
    page?: string;
  };
}

export const revalidate = 0;

export default async function DonorsPage({ searchParams }: PageProps) {
  const page = parseInt(searchParams.page || "1", 10);
  const search = searchParams.search || "";
  const bloodGroup = (searchParams.bloodGroup || "all") as BloodGroupCode | "all";
  const availability = searchParams.availability || "all";
  const eligibility = searchParams.eligibility || "all";

  const { data: donors, totalCount, totalPages } = await adminService.getDonors({
    search,
    bloodGroup,
    availability,
    eligibility,
    page,
    pageSize: 10,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voluntary Blood Donors"
        description="Strictly isolated registry of voluntary donors across Nigeria ready for emergency matching"
      />

      {/* Filter / Search Bar */}
      <FilterBar
        searchPlaceholder="Search by city or state..."
        selects={[
          {
            name: "bloodGroup",
            label: "Blood Group",
            value: bloodGroup,
            options: [
              { label: "All Blood Groups", value: "all" },
              { label: "O+", value: "O+" },
              { label: "O- (Universal)", value: "O-" },
              { label: "A+", value: "A+" },
              { label: "A-", value: "A-" },
              { label: "B+", value: "B+" },
              { label: "B-", value: "B-" },
              { label: "AB+", value: "AB+" },
              { label: "AB-", value: "AB-" },
            ],
          },
          {
            name: "availability",
            label: "Availability",
            value: availability,
            options: [
              { label: "All Availabilities", value: "all" },
              { label: "Available", value: "available" },
              { label: "Temporarily Unavailable", value: "temporarily_unavailable" },
              { label: "Unavailable", value: "unavailable" },
            ],
          },
          {
            name: "eligibility",
            label: "Eligibility",
            value: eligibility,
            options: [
              { label: "All Eligibility States", value: "all" },
              { label: "Eligible", value: "eligible" },
              { label: "Temporarily Ineligible", value: "temporarily_ineligible" },
              { label: "Permanently Ineligible", value: "permanently_ineligible" },
              { label: "Pending Review", value: "pending_verification" },
            ],
          },
        ]}
      />

      {/* Donors Interactive Client Component */}
      <DonorsClient donors={donors} />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={10}
        totalItems={totalCount}
      />
    </div>
  );
}
