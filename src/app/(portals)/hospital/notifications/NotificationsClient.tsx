"use client";

import React, { useState } from "react";
import { Bell, Check, CheckCheck, HeartHandshake, Droplet, ShieldCheck } from "lucide-react";
import { Notification } from "@/types/database";
import { markHospitalNotificationReadAction, markAllHospitalNotificationsReadAction } from "@/actions";
import { Button, EmptyState } from "@/components/ui";

interface NotificationsClientProps {
  notifications: Notification[];
}

export function NotificationsClient({ notifications }: NotificationsClientProps) {
  const [items, setItems] = useState<Notification[]>(notifications);
  const [filterUnread, setFilterUnread] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const displayed = filterUnread ? items.filter((n) => !n.is_read) : items;

  const handleMarkRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await markHospitalNotificationReadAction(id);
  };

  const handleMarkAllRead = async () => {
    setIsLoading(true);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllHospitalNotificationsReadAction();
    setIsLoading(false);
  };

  const hasUnread = items.some((n) => !n.is_read);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterUnread(false)}
            className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
              !filterUnread ? "bg-secondary-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilterUnread(true)}
            className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
              filterUnread ? "bg-secondary-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Unread ({items.filter((n) => !n.is_read).length})
          </button>
        </div>

        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            isLoading={isLoading}
            className="text-xs text-slate-600"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1" />
            <span>Mark All Read</span>
          </Button>
        )}
      </div>

      {displayed.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-7 h-7 text-slate-400" />}
          title="No Notifications"
          description="All operational alerts and candidate donor match responses are up to date."
        />
      ) : (
        <div className="space-y-2.5">
          {displayed.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                !n.is_read
                  ? "bg-teal-50/40 border-teal-200 shadow-xs"
                  : "bg-white border-slate-200 text-slate-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    !n.is_read ? "bg-secondary-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {n.type === "request_accepted" || n.type === "donor_request" ? (
                    <HeartHandshake className="w-4 h-4" />
                  ) : n.type === "inventory_warning" ? (
                    <Droplet className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <h4
                    className={`font-poppins text-sm font-bold ${
                      !n.is_read ? "text-dark" : "text-slate-800"
                    }`}
                  >
                    {n.title}
                  </h4>
                  <p className="text-xs text-slate-600 font-inter leading-relaxed">
                    {n.message}
                  </p>
                  <span className="text-[10px] text-slate-400 font-inter block pt-1">
                    {new Date(n.created_at).toLocaleString("en-NG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
