import React from "react";
import { adminService } from "@/services/adminService";
import { getCurrentUser } from "@/lib/supabase/server";
import { PageHeader, Pagination } from "@/components/ui";
import { FilterBar } from "@/components/admin/FilterBar";
import { AdminsClient } from "./AdminsClient";
import { AdminRole } from "@/types/database";

interface PageProps {
  searchParams: {
    search?: string;
    role?: string;
    isActive?: string;
    page?: string;
  };
}

export const revalidate = 0;

export default async function AdminsManagementPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();
  const page = parseInt(searchParams.page || "1", 10);
  const search = searchParams.search || "";
  const adminRole = (searchParams.role || "all") as AdminRole | "all";
  const isActive =
    searchParams.isActive === "true"
      ? true
      : searchParams.isActive === "false"
      ? false
      : ("all" as const);

  const { data: admins, totalCount, totalPages } = await adminService.getAdmins({
    search,
    adminRole,
    isActive,
    page,
    pageSize: 10,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrator Management"
        description="Provision, delegate, and audit privileged administrator accounts across the SmartDonor platform."
        action={
          <div className="text-xs text-slate-500 font-medium">
            Total Administrators: <strong className="text-dark">{totalCount}</strong>
          </div>
        }
      />

      {/* Filter / Search Bar */}
      <FilterBar
        searchPlaceholder="Search admins by name, email, or phone..."
        selects={[
          {
            name: "role",
            label: "Admin Clearance",
            value: adminRole,
            options: [
              { label: "All Clearance Levels", value: "all" },
              { label: "Super Admin", value: "superadmin" },
              { label: "Administrator", value: "admin" },
              { label: "Operations Staff", value: "staff" },
            ],
          },
          {
            name: "isActive",
            label: "Account Status",
            value: String(isActive),
            options: [
              { label: "All Statuses", value: "all" },
              { label: "Active", value: "true" },
              { label: "Deactivated", value: "false" },
            ],
          },
        ]}
      />

      <AdminsClient admins={admins} currentUserId={currentUser?.id || ""} />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={10}
        totalItems={totalCount}
      />
    </div>
  );
}
