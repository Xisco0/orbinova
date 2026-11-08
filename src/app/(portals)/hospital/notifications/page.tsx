import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { PageHeader } from "@/components/ui";
import { NotificationsClient } from "./NotificationsClient";

export default async function HospitalNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await hospitalService.getNotifications(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facility Notifications & Alerts"
        description="Live alerts for accepted donor dispatches, inventory warnings, and verified transfusions."
      />

      <NotificationsClient notifications={notifications} />
    </div>
  );
}
