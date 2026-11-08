import React from "react";
import Link from "next/link";
import { adminService } from "@/services/adminService";
import { UserRole } from "@/types/database";
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
import { FilterBar } from "@/components/admin";
import { Users, Eye, Mail, Phone, Shield } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: {
    search?: string;
    role?: string;
    isActive?: string;
    page?: string;
  };
}

export const revalidate = 0;

export default async function UsersPage({ searchParams }: PageProps) {
  const page = parseInt(searchParams.page || "1", 10);
  const search = searchParams.search || "";
  const role = (searchParams.role || "all") as UserRole | "all";
  const isActive =
    searchParams.isActive === "true"
      ? true
      : searchParams.isActive === "false"
      ? false
      : "all";

  const { data: users, totalCount, totalPages } = await adminService.getUsers({
    search,
    role,
    isActive,
    page,
    pageSize: 10,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Accounts & Clearance"
        description="System identities, portal clearances, security statuses, and access permissions"
        action={
          <div className="text-xs text-slate-500 font-medium">
            Total Accounts: <strong className="text-dark">{totalCount}</strong>
          </div>
        }
      />

      {/* Filter / Search Bar */}
      <FilterBar
        searchPlaceholder="Search by name, email, or phone number..."
        selects={[
          {
            name: "role",
            label: "User Role",
            value: role,
            options: [
              { label: "All Account Roles", value: "all" },
              { label: "Administrators", value: "admin" },
              { label: "Hospitals", value: "hospital" },
              { label: "Blood Banks", value: "blood_bank" },
              { label: "Voluntary Donors", value: "donor" },
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


      {/* Users Table */}
      <Card className="p-0 overflow-hidden">
        {users.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No users found"
              description="No user profiles match your current search or filter criteria."
              icon={<Users className="w-8 h-8 text-primary-500" />}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Name</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>System Role</TableHead>
                <TableHead>Account Status</TableHead>
                <TableHead>Joined Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="text-dark text-xs">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="hover:text-primary-600 hover:underline"
                    >
                      {user.full_name || "Unnamed User"}
                    </Link>
                  </TableCell>

                  <TableCell className="text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{user.email}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-slate-600">
                    {user.phone ? (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{user.phone}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        user.role === "admin"
                          ? "primary"
                          : user.role === "donor"
                          ? "blood"
                          : "secondary"
                      }
                      size="sm"
                    >
                      {user.role === "blood_bank" ? "Blood Bank" : user.role.toUpperCase()}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={user.is_active ? "success" : "default"}
                      size="sm"
                    >
                      {user.is_active ? "Active" : "Deactivated"}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-[11px] text-slate-500">
                    {formatDate(user.created_at)}
                  </TableCell>

                  <TableCell className="text-right">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
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
