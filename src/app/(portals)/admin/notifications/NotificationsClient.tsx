"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Notification } from "@/types/database";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/actions";
import { Button, Badge, EmptyState } from "@/components/ui";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Droplet,
  ShieldCheck,
  Building2,
  Clock,
  CheckCheck,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface NotificationsClientProps {
  notifications: Notification[];
  unreadCount: number;
}

export const NotificationsClient: React.FC<NotificationsClientProps> = ({
  notifications,
  unreadCount: initialUnreadCount,
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationReadAction(id);
    router.refresh();
  };

  const handleMarkAllRead = async () => {
    setIsLoading(true);
    await markAllNotificationsReadAction();
    setIsLoading(false);
    router.refresh();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "blood_request":
        return <Droplet className="w-5 h-5 text-blood-600" />;
      case "verification":
        return <ShieldCheck className="w-5 h-5 text-primary-600" />;
      case "inventory_warning":
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case "system_notification":
      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header Bar */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-700 font-inter">
            Inbox:
          </span>
          <Badge
            variant={initialUnreadCount > 0 ? "emergency" : "success"}
            size="sm"
          >
            {initialUnreadCount} unread
          </Badge>
        </div>

        {initialUnreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isLoading}
            leftIcon={<CheckCheck className="w-4 h-4" />}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200">
          <EmptyState
            title="All caught up!"
            description="You have no administrative alerts or notifications at this time."
            icon={<Bell className="w-8 h-8 text-slate-400" />}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                notif.is_read
                  ? "bg-white border-slate-200/80"
                  : "bg-primary-50/40 border-primary-200 shadow-xs"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    notif.is_read ? "bg-slate-100" : "bg-white border border-primary-200 shadow-xs"
                  }`}
                >
                  {getTypeIcon(notif.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-poppins text-sm font-semibold text-dark">
                      {notif.title}
                    </h4>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-inter leading-relaxed">
                    {notif.message}
                  </p>
                  <span className="text-[10px] text-slate-400 font-inter block">
                    {formatDate(notif.created_at)}
                  </span>
                </div>
              </div>

              {!notif.is_read && (
                <button
                  type="button"
                  onClick={() => handleMarkAsRead(notif.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-100 transition-colors shrink-0"
                  title="Mark as read"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
