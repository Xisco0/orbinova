import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, History, Droplet, CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { hasPermission } from "@/lib/auth/rbac";
import { HospitalFilterBar } from "@/components/hospital";
import { PageHeader, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, EmptyState } from "@/components/ui";

export const revalidate = 0;

interface PageProps {
  searchParams: { bloodGroup?: string; txType?: string; search?: string };
}

export default async function HospitalInventoryTransactionsPage({
  searchParams,
}: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await hospitalService.getHospitalContext(user.id);
  if (!context) redirect("/hospital");

  // Route Guard: Stock Ledger requires inventory management authorization
  const canAccess =
    context.isOwner ||
    context.isManager ||
    hasPermission(user.profile?.role, "blood_inventory.manage", context.membership.member_role);
  if (!canAccess) {
    redirect("/hospital/inventory");
  }

  const transactions = await hospitalService.getInventoryTransactions(
    context.organization.id,
    searchParams.bloodGroup,
    searchParams.txType,
    searchParams.search
  );

  const filters = [
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
    {
      key: "txType",
      label: "Transaction Type",
      options: [
        { label: "Donation Received", value: "donation_received" },
        { label: "Blood Issued", value: "blood_issued" },
        { label: "Blood Reserved", value: "blood_reserved" },
        { label: "Reservation Released", value: "reservation_released" },
        { label: "Expired Unit", value: "expired_unit" },
        { label: "Manual Adjustment", value: "manual_adjustment" },
        { label: "Transfer", value: "transfer" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/hospital/inventory"
        className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-dark transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Blood Inventory</span>
      </Link>

      <PageHeader
        title="Inventory Transaction Ledger"
        description="Complete immutable log of all additions, reservations, transfusions, and adjustments."
      />

      <HospitalFilterBar filters={filters} searchPlaceholder="Search ledger records..." />

      {transactions.length === 0 ? (
        <EmptyState
          icon={<History className="w-7 h-7 text-slate-400" />}
          title="No Transactions Recorded"
          description="Stock movement transactions will appear here when inventory is adjusted or donations are recorded."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Reference ID</TableHead>
                <TableHead>Notes & Reason</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <Badge
                      variant={
                        tx.transaction_type === "donation_received"
                          ? "success"
                          : tx.transaction_type === "blood_issued"
                          ? "primary"
                          : tx.transaction_type === "manual_adjustment"
                          ? "warning"
                          : "default"
                      }
                      size="sm"
                    >
                      {tx.transaction_type.replace("_", " ")}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span className="px-2 py-0.5 rounded-md bg-blood-50 border border-blood-200 text-blood-700 font-bold text-xs font-poppins">
                      {tx.blood_group}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs font-bold text-dark font-inter">
                    {tx.quantity} Unit{tx.quantity > 1 ? "s" : ""}
                  </TableCell>

                  <TableCell className="font-mono text-xs text-slate-500">
                    {tx.reference_id ? tx.reference_id.substring(0, 8) : "—"}
                  </TableCell>

                  <TableCell className="text-xs text-slate-600 font-inter max-w-xs truncate">
                    {tx.notes || "Standard stock movement"}
                  </TableCell>

                  <TableCell className="text-right text-xs text-slate-500 font-inter">
                    {new Date(tx.created_at).toLocaleString("en-NG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
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
