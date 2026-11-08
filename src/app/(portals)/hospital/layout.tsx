import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { HospitalSidebar, HospitalHeader } from "@/components/hospital";
import { getRolePermissions } from "@/lib/auth/rbac";
import { staffStore } from "@/services/staffStore";
import { SessionGuard } from "@/components/auth";

export default async function HospitalPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser("hospital");

  if (!user) {
    redirect("/login?redirect=/hospital/dashboard");
  }

  const role = user.profile?.role;

  // Super Administrators belong to the Admin Console, not clinical hospital staff
  if (role === "admin") {
    redirect("/admin/dashboard");
  }

  // Enforce hospital or blood_bank role
  if (role !== "hospital" && role !== "blood_bank") {
    redirect("/unauthorized?required=organization");
  }

  // Load organization context
  const context = await hospitalService.getHospitalContext(user.id);
  if (!context) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center font-bold text-lg">
            !
          </div>
          <h2 className="font-poppins font-bold text-xl text-dark">
            Organization Affiliation Required
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-inter leading-relaxed">
            Your user profile is registered as an organization account, but is not currently linked to an active hospital or blood bank branch. Please contact your system administrator.
          </p>
          <a
            href="/login"
            className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs hover:bg-black transition-colors"
          >
            Sign in with another account
          </a>
        </div>
      </div>
    );
  }

  const { organization, membership } = context;

  // Requirement 8: Mandatory password change after first successful login with temporary password
  const staffRecord = staffStore.get(user.id) || (user.email ? staffStore.get(user.email) : undefined);
  const mustChangePassword =
    (user.profile as any)?.must_change_password === true ||
    (user as any).user_metadata?.must_change_password === true ||
    (membership as any).must_change_password === true ||
    staffRecord?.mustChangePassword === true;

  if (mustChangePassword) {
    redirect("/reset-password?first_login=true");
  }

  // Requirement: Radiologists do not see the ordinary Hospital Portal; directed to ORBINOVA Imaging
  if (membership.member_role === "radiologist" || (user.profile?.role as any) === "radiologist") {
    redirect("/imaging");
  }

  const permissions = getRolePermissions(
    user.profile?.role || "hospital",
    membership.member_role,
    staffRecord?.customPermissions || staffRecord?.delegatedPermissions
  );
  const metrics = await hospitalService.getDashboardMetrics(organization.id, user.id);

  const safeUser = {
    email: user.email || "",
    profile: user.profile || null,
  };

  return (
    <SessionGuard portalScope="hospital">
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        {/* Responsive Dynamic Sidebar */}
        <HospitalSidebar
          user={safeUser}
          organization={organization}
          memberRole={membership.member_role}
          permissions={permissions}
          isOwner={context.isOwner}
          isManager={context.isManager}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <HospitalHeader
            user={safeUser}
            organization={organization}
            unreadNotifications={metrics.unreadNotificationsCount}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fadeIn">
            {children}
          </main>
        </div>
      </div>
    </SessionGuard>
  );
}
