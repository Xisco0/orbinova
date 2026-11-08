import React from "react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { RolesClient } from "./RolesClient";
import Link from "next/link";
import { ArrowLeft, Settings, ShieldCheck } from "lucide-react";

export const revalidate = 0;

export default async function RolesManagementPage() {
  const supabase = await createClient();

  // Fetch all admins to compute role distribution
  const { data: admins } = await (supabase
    .from("profiles") as any)
    .select("*")
    .eq("role", "admin");

  const roleCounts: Record<string, number> = {};
  ((admins as any[]) || []).forEach((a: any) => {
    const r = a.admin_role || "superadmin";
    roleCounts[r] = (roleCounts[r] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb Back Link */}
      <div>
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-dark font-medium transition-colors font-inter"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Global Configurations</span>
        </Link>
      </div>

      <PageHeader
        title="Roles & Permissions Management"
        description="Configure granular access controls, permission matrices, and administrative hierarchies across Super Admin, Admin, and Staff roles."
      />

      <RolesClient roleCounts={roleCounts} />
    </div>
  );
}
