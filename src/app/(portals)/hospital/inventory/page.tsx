import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Droplet, History, PlusCircle, AlertTriangle, Building2, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { getLinkedBloodBank } from "@/services/facilityRelationships";
import { InventoryCard } from "@/components/hospital";
import { PageHeader, Button, Badge } from "@/components/ui";
import { hasPermission } from "@/lib/auth/rbac";

export default async function HospitalInventoryPage() {
  const user = await getCurrentUser("hospital");
  if (!user) redirect("/login");

  const context = await hospitalService.getHospitalContext(user.id);
  if (!context) redirect("/hospital");

  const canAccessInventory =
    context.isOwner ||
    context.isManager ||
    hasPermission(user.profile?.role || "hospital", "inventory.view", context.membership.member_role);

  if (!canAccessInventory) {
    redirect("/hospital/dashboard");
  }

  const linkedBB = getLinkedBloodBank(context.organization.id);
  const inventory = await hospitalService.getInventory(context.organization.id);
  const totalUnits = inventory.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const totalAvailable = inventory.reduce((acc, curr) => acc + (curr.available_quantity || 0), 0);
  const totalReserved = inventory.reduce((acc, curr) => acc + (curr.reserved_quantity || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <PageHeader
            title="Blood Inventory & Stock Management"
            description="Real-time reserve levels across all 8 standard blood groups with audit tracking."
            className="pb-0 border-none mb-0"
          />
          {linkedBB && (
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Operating Facility: <strong>{linkedBB.name}</strong></span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Single Authoritative Owner
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 w-full lg:w-auto">
          <Link href="/hospital/inventory/transactions" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="text-xs w-full sm:w-auto justify-center whitespace-nowrap py-2 sm:py-1.5"
            >
              <History className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Transaction Ledger</span>
            </Button>
          </Link>
          <Link href="/hospital/blood-requests/new" className="w-full sm:w-auto">
            <Button
              variant="blood"
              size="sm"
              className="text-xs w-full sm:w-auto justify-center whitespace-nowrap py-2 sm:py-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Broadcast Request</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Aggregated Total Stock Banner */}
      <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs grid grid-cols-3 gap-2 sm:gap-4 text-center font-inter">
        <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider block">
            Total Units
          </span>
          <span className="text-lg sm:text-2xl font-bold font-poppins text-dark">
            {totalUnits}
          </span>
        </div>

        <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-green-50 border border-green-100">
          <span className="text-[10px] sm:text-xs text-green-700 uppercase tracking-wider block">
            Available
          </span>
          <span className="text-lg sm:text-2xl font-bold font-poppins text-green-800">
            {totalAvailable}
          </span>
        </div>

        <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-amber-50 border border-amber-100">
          <span className="text-[10px] sm:text-xs text-amber-700 uppercase tracking-wider block">
            Reserved
          </span>
          <span className="text-lg sm:text-2xl font-bold font-poppins text-amber-800">
            {totalReserved}
          </span>
        </div>
      </div>

      {/* 8-Card Stock Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {inventory.map((item) => (
          <InventoryCard
            key={item.blood_group}
            item={item}
            canManage={context.isManager && linkedBB !== null}
          />
        ))}
      </div>
    </div>
  );
}
