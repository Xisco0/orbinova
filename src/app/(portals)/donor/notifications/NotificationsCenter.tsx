"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  RotateCcw,
  Clock,
  HeartHandshake,
  ShieldCheck,
  Mail,
  MailOpen,
} from "lucide-react";
import { Notification } from "@/types/database";
import {
  markDonorNotificationReadAction,
  markDonorNotificationUnreadAction,
  markAllDonorNotificationsReadAction,
  markAllDonorNotificationsUnreadAction,
} from "@/actions";
import { Button, EmptyState } from "@/components/ui";

interface NotificationsCenterProps {
  notifications: Notification[];
}

type FilterMode = "all" | "unread" | "read";

export function NotificationsCenter({ notifications }: NotificationsCenterProps) {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>(notifications);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  const unreadCount = items.filter((n) => !n.is_read).length;
  const readCount = items.filter((n) => n.is_read).length;

  const displayedItems = items.filter((n) => {
    if (filterMode === "unread") return !n.is_read;
    if (filterMode === "read") return n.is_read;
    return true;
  });

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLoadingItemId(id);
    // Optimistic UI update
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
    try {
      await markDonorNotificationReadAction(id);
      router.refresh();
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleMarkUnread = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLoadingItemId(id);
    // Optimistic UI update
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: false, read_at: null } : n))
    );
    try {
      await markDonorNotificationUnreadAction(id);
      router.refresh();
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setIsBulkLoading(true);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
    try {
      await markAllDonorNotificationsReadAction();
      router.refresh();
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleMarkAllUnread = async () => {
    setIsBulkLoading(true);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: false, read_at: null })));
    try {
      await markAllDonorNotificationsUnreadAction();
      router.refresh();
    } finally {
      setIsBulkLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Controls & Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterMode === "all"
                ? "bg-white text-dark shadow-xs"
                : "text-slate-600 hover:text-dark hover:bg-slate-200/50"
            }`}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("unread")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterMode === "unread"
                ? "bg-white text-blood-700 shadow-xs"
                : "text-slate-600 hover:text-blood-700 hover:bg-slate-200/50"
            }`}
          >
            {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-blood-600 animate-pulse" />}
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("read")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterMode === "read"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50"
            }`}
          >
            Read ({readCount})
          </button>
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              isLoading={isBulkLoading}
              className="text-xs text-slate-700 hover:text-dark border-slate-300"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1.5 text-green-600" />
              <span>Mark All as Read</span>
            </Button>
          )}

          {readCount > 0 && unreadCount === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllUnread}
              isLoading={isBulkLoading}
              className="text-xs text-slate-700 hover:text-dark border-slate-300"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <span>Mark All as Unread</span>
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {displayedItems.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-7 h-7 text-slate-400" />}
          title={
            filterMode === "unread"
              ? "No Unread Notifications"
              : filterMode === "read"
              ? "No Read Notifications"
              : "You're All Caught Up"
          }
          description={
            filterMode === "unread"
              ? "All your notifications have been marked as read."
              : filterMode === "read"
              ? "You do not have any read notifications yet."
              : "There are no notifications to show right now."
          }
        />
      ) : (
        <div className="space-y-2.5">
          {displayedItems.map((n) => {
            const isItemLoading = loadingItemId === n.id;
            const isUnread = !n.is_read;

            return (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  isUnread
                    ? "bg-blood-50/40 border-blood-200/90 shadow-xs hover:border-blood-300"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Icon Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isUnread
                        ? "bg-blood-600 text-white shadow-xs shadow-blood-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {n.type === "blood_request" || n.type === "donor_request" ? (
                      <HeartHandshake className="w-4 h-4" />
                    ) : n.type === "verification" ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`font-poppins text-sm font-bold ${
                          isUnread ? "text-dark" : "text-slate-800"
                        }`}
                      >
                        {n.title}
                      </h4>
                      {isUnread && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blood-100 text-blood-700 text-[10px] font-bold tracking-wide uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-blood-600 animate-pulse" />
                          New
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 font-inter leading-relaxed break-words">
                      {n.message}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-inter">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(n.created_at).toLocaleString("en-NG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      {n.read_at && (
                        <span className="text-[10px] text-slate-400">
                          Read {new Date(n.read_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Read / Unread Toggle Actions */}
                <div className="shrink-0 flex items-center gap-1.5 self-center">
                  {isUnread ? (
                    <button
                      type="button"
                      disabled={isItemLoading}
                      onClick={(e) => handleMarkRead(n.id, e)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-blood-700 bg-blood-100/70 hover:bg-blood-200/80 transition-colors cursor-pointer"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5 text-blood-700" />
                      <span className="hidden sm:inline">Mark as Read</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isItemLoading}
                      onClick={(e) => handleMarkUnread(n.id, e)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                      title="Mark as unread"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">Mark as Unread</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
