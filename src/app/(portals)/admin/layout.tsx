import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { AdminSidebar, AdminHeader } from "@/components/admin";
import { adminService } from "@/services/adminService";
import { SessionGuard } from "@/components/auth";

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser("admin");

  // Strict Server-Side Role Enforcement
  if (!user) {
    redirect("/login?redirect=/admin/dashboard");
  }

  if (user.profile?.role !== "admin") {
    redirect("/unauthorized?required=admin");
  }

  // Fetch unread notifications count for header badge
  const { unreadCount } = await adminService.getNotifications(user.id);

  return (
    <SessionGuard portalScope="admin">
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-inter">
        {/* Sidebar Navigation */}
        <AdminSidebar
          user={{
            id: user.id,
            email: user.email,
            profile: user.profile,
          }}
          unreadNotificationsCount={unreadCount}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <AdminHeader
            user={{
              id: user.id,
              email: user.email,
              profile: user.profile,
            }}
            unreadNotificationsCount={unreadCount}
          />

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-16">
            {children}
          </main>
        </div>
      </div>
    </SessionGuard>
  );
}
