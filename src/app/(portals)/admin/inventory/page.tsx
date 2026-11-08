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
import {
  FilterBar,
  BloodGroupBadge,
  InventoryStatusBadge,
} from "@/components/admin";
import { Package, Droplet, History, Building2, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: {
    bloodGroup?: string;
    status?: string;
    page?: string;
  };
}

export const revalidate = 0;

export default async function BloodInventoryPage({ searchParams }: PageProps) {
  const page = parseInt(searchParams.page || "1", 10);
  const bloodGroup = (searchParams.bloodGroup || "all") as BloodGroupCode | "all";
  const status = (searchParams.status || "all") as "all" | "critical" | "low" | "healthy";

  const [inventoryRes, transactionsRes] = await Promise.all([
    adminService.getInventory({
      bloodGroup,
      status,
      page,
      pageSize: 15,
    }),
    adminService.getInventoryTransactions({ limit: 10 }),
  ]);

  const { data: inventory, totalCount, totalPages } = inventoryRes;
  const { transactions } = transactionsRes;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Blood Bank Reserve & Inventory"
        description="Monitor physical blood bank stocks, reserve allocations, and stock health thresholds across facilities"
        action={
          <div className="text-xs text-slate-500 font-medium">
            Tracked Stock Records: <strong className="text-dark">{totalCount}</strong>
          </div>
        }
      />

      {/* Filter / Search Bar */}
      <FilterBar
        searchPlaceholder="Filter inventory..."
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
            label: "Stock Status",
            value: status,
            options: [
              { label: "All Stock Levels", value: "all" },
              { label: "🔴 Critical (< 3 units)", value: "critical" },
              { label: "🟠 Low Reserve (< 10 units)", value: "low" },
              { label: "🟢 Healthy (10+ units)", value: "healthy" },
            ],
          },
        ]}
      />


      {/* Main Inventory Table */}
      <Card className="p-0 overflow-hidden">
        {inventory.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No blood stock records found"
              description="No facility inventory entries match your selected filter criteria."
              icon={<Package className="w-8 h-8 text-primary-500" />}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility Name</TableHead>
                <TableHead>Facility Type</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Total Quantity</TableHead>
                <TableHead>Reserved Units</TableHead>
                <TableHead>Available Units</TableHead>
                <TableHead>Health Status</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="text-dark text-xs">
                    <Link
                      href={`/admin/organizations/${item.organizations?.id}`}
                      className="hover:text-primary-600 hover:underline"
                    >
                      {item.organizations?.name || "Facility"}
                    </Link>
                    <span className="block text-[10px] text-slate-400 font-normal">
                      {item.organizations?.city}, {item.organizations?.state}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        item.organizations?.organization_type === "blood_bank"
                          ? "secondary"
                          : "primary"
                      }
                      size="sm"
                    >
                      {item.organizations?.organization_type === "blood_bank"
                        ? "Blood Bank"
                        : "Hospital"}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <BloodGroupBadge bloodGroup={item.blood_group} size="sm" />
                  </TableCell>

                  <TableCell className="text-xs text-slate-700">
                    {item.quantity} units
                  </TableCell>

                  <TableCell className="text-xs text-amber-700 font-medium">
                    {item.reserved_quantity} units
                  </TableCell>

                  <TableCell className="text-xs font-bold text-dark font-poppins">
                    {item.available_quantity} units
                  </TableCell>

                  <TableCell>
                    <InventoryStatusBadge
                      availableQuantity={item.available_quantity}
                      size="sm"
                    />
                  </TableCell>

                  <TableCell className="text-[11px] text-slate-500">
                    {formatDate(item.updated_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={15}
          totalItems={totalCount}
        />

      </Card>

      {/* Inventory Transaction Audit Trail */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-poppins text-base font-semibold text-dark">
              Stock Movement & Transaction Ledger
            </h3>
            <p className="text-xs text-slate-500 font-inter">
              Auditable log of donations received, blood issued, reservations, and manual stock updates
            </p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No transactions logged yet"
              description="Inventory transactions recorded by hospitals and blood banks will stream here."
              icon={<History className="w-6 h-6 text-slate-400" />}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Transaction Type</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx: any) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-[11px] text-slate-500">
                    {formatDate(tx.created_at)}
                  </TableCell>
                  <TableCell className="font-medium text-dark text-xs">
                    {tx.organizations?.name || "Facility"}
                  </TableCell>
                  <TableCell>
                    <BloodGroupBadge bloodGroup={tx.blood_group} size="sm" />
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" size="sm">
                      {tx.transaction_type.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-dark">
                    {tx.quantity} units
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {tx.profiles?.full_name || "Authorized Staff"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {tx.notes || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
