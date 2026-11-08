import React from "react";
import { redirect } from "next/navigation";
import { User, Building2, Bell, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { PageHeader, Card } from "@/components/ui";

export default async function HospitalSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await hospitalService.getHospitalContext(user.id);
  if (!context) redirect("/hospital");

  // Route Guard: Facility Settings restricted to Facility Owner & Hospital Administrator
  if (!context.isOwner && !context.isManager) {
    redirect("/hospital/dashboard");
  }

  const { organization, membership } = context;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Facility & User Settings"
        description="Manage your staff account credentials and operational notification preferences."
      />

      {/* Staff Account Summary */}
      <Card className="p-6 space-y-4 bg-white border-slate-200">
        <h3 className="font-poppins font-bold text-base text-dark flex items-center gap-2">
          <User className="w-5 h-5 text-secondary-600" />
          <span>Staff Identity & Permissions</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm font-inter">
          <div>
            <span className="text-slate-400 block text-[11px] uppercase">
              Staff Full Name
            </span>
            <span className="text-dark">{user.profile?.full_name || "Staff Member"}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] uppercase">
              Email (User ID)
            </span>
            <span className="font-medium text-dark">{user.email}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] uppercase">
              Assigned Facility Role
            </span>
            <span className="font-bold text-secondary-700 capitalize">
              {membership.member_role}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] uppercase">
              Organization
            </span>
            <span className="font-bold text-dark">{organization.name}</span>
          </div>
        </div>
      </Card>

      {/* Facility Operational Notifications */}
      <Card className="p-6 space-y-4 bg-white border-slate-200">
        <h3 className="font-poppins font-bold text-base text-dark flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-600" />
          <span>Operational Notifications</span>
        </h3>

        <div className="space-y-3 text-xs sm:text-sm font-inter">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <span className="text-dark block">Candidate Donor Acceptances</span>
              <span className="text-xs text-slate-500">
                Instant notification when a dispatched donor accepts an emergency request.
              </span>
            </div>
            <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
              Enabled
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <span className="text-dark block">Low Stock Automated Alerts</span>
              <span className="text-xs text-slate-500">
                Trigger alerts when any blood group available inventory falls below 3 units.
              </span>
            </div>
            <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
              Enabled
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
