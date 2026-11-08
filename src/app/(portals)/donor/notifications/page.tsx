import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { donorService } from "@/services/donorService";
import { PageHeader } from "@/components/ui";
import { NotificationsCenter } from "./NotificationsCenter";

export default async function DonorNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/donor/login");

  const notifications = await donorService.getDonorNotifications(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications & Alerts"
        description="Stay updated on matched blood requests, reminders, and verification notices."
      />

      <NotificationsCenter notifications={notifications} />
    </div>
  );
}
