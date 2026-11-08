import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { donorService } from "@/services/donorService";
import { DonorSidebar, DonorHeader } from "@/components/donor";
import { SessionGuard } from "@/components/auth";

export default async function DonorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser("donor");

  if (!user) {
    redirect("/donor/login?redirect=/donor/dashboard");
  }

  // Enforce donor role (or allow admin to inspect)
  const role = user.profile?.role;
  if (role !== "donor" && role !== "admin") {
    redirect("/unauthorized?required=donor");
  }

  // Load or auto-initialize donor context
  const donorContext = await donorService.getDonorContext(user.id);
  const metrics = donorContext
    ? await donorService.getDashboardMetrics(donorContext.donorProfile.id, user.id)
    : null;

  const bloodGroup = donorContext?.donorProfile.blood_group || "O+";
  const isAvailable = donorContext?.donorProfile.availability_status === "available";

  const safeUser = {
    email: user.email || "",
    profile: user.profile || null,
  };

  return (
    <SessionGuard portalScope="donor">
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        {/* Responsive Sidebar */}
        <DonorSidebar
          user={safeUser}
          bloodGroup={bloodGroup}
          isAvailable={isAvailable}
        />

        {/* Main Screen Layout */}
        <div className="flex-1 flex flex-col min-w-0">
          <DonorHeader
            user={safeUser}
            bloodGroup={bloodGroup}
            isAvailable={isAvailable}
            unreadNotifications={metrics?.unreadNotificationsCount || 0}
            pendingRequestsCount={metrics?.pendingRequestsCount || 0}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fadeIn">
            {children}
          </main>
        </div>
      </div>
    </SessionGuard>
  );
}
