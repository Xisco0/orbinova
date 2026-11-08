import React from "react";
import { getCurrentUser } from "@/lib/supabase/server";
import { adminService } from "@/services/adminService";
import { PageHeader } from "@/components/ui";
import { NotificationsClient } from "./NotificationsClient";

export const revalidate = 0;

export default async function AdminNotificationsPage() {
  const user = await getCurrentUser();
  const { notifications, unreadCount } = await adminService.getNotifications(
    user?.id || ""
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrative Notifications & Alerts"
        description="System broadcast warnings, urgent verification requests, and operational notifications"
      />

      <NotificationsClient
        notifications={notifications}
        unreadCount={unreadCount}
      />
    </div>
  );
}
