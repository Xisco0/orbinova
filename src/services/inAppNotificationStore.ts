import fs from "fs";
import path from "path";
import { NotificationType } from "@/types/database";

export interface StoredInAppNotification {
  id: string;
  user_id: string;
  organization_id?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "in_app_notifications.json");

function ensureStoreDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function readNotifications(): StoredInAppNotification[] {
  ensureStoreDir();
  if (!fs.existsSync(NOTIFICATIONS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(NOTIFICATIONS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeNotifications(data: StoredInAppNotification[]) {
  ensureStoreDir();
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write in-app notifications store:", e);
  }
}

export const inAppNotificationStore = {
  getAll(): StoredInAppNotification[] {
    return readNotifications();
  },

  getByUser(userId: string, orgId?: string): StoredInAppNotification[] {
    if (!userId && !orgId) return [];
    const all = readNotifications();
    return all
      .filter((n) => (userId && n.user_id === userId) || (orgId && n.organization_id === orgId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getByOrganization(orgId: string): StoredInAppNotification[] {
    if (!orgId) return [];
    const all = readNotifications();
    return all
      .filter((n) => n.organization_id === orgId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  create(params: {
    userId: string;
    organizationId?: string | null;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown> | null;
  }): StoredInAppNotification {
    const all = readNotifications();
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newNotif: StoredInAppNotification = {
      id,
      user_id: params.userId,
      organization_id: params.organizationId || null,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data || null,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    all.unshift(newNotif);
    writeNotifications(all);
    return newNotif;
  },

  markAsRead(notificationId: string, actorUserId: string): boolean {
    const all = readNotifications();
    const notif = all.find((n) => n.id === notificationId);
    if (!notif) return false;

    const notifUserClean = notif.user_id?.replace(/^(donor-|dp-)+/, "");
    const actorUserClean = actorUserId?.replace(/^(donor-|dp-)+/, "");
    if (notif.user_id !== actorUserId && notifUserClean !== actorUserClean) {
      throw new Error("Security violation: Cannot mark another user's notification as read.");
    }

    notif.is_read = true;
    notif.read_at = new Date().toISOString();
    writeNotifications(all);
    return true;
  },

  markAsUnread(notificationId: string, actorUserId: string): boolean {
    const all = readNotifications();
    const notif = all.find((n) => n.id === notificationId);
    if (!notif) return false;

    const notifUserClean = notif.user_id?.replace(/^(donor-|dp-)+/, "");
    const actorUserClean = actorUserId?.replace(/^(donor-|dp-)+/, "");
    if (notif.user_id !== actorUserId && notifUserClean !== actorUserClean) {
      throw new Error("Security violation: Cannot mark another user's notification as unread.");
    }

    notif.is_read = false;
    notif.read_at = null;
    writeNotifications(all);
    return true;
  },

  markAllAsRead(actorUserId: string): number {
    const all = readNotifications();
    let count = 0;
    const now = new Date().toISOString();
    const actorUserClean = actorUserId?.replace(/^(donor-|dp-)+/, "");
    for (const notif of all) {
      const notifUserClean = notif.user_id?.replace(/^(donor-|dp-)+/, "");
      if ((notif.user_id === actorUserId || notifUserClean === actorUserClean) && !notif.is_read) {
        notif.is_read = true;
        notif.read_at = now;
        count++;
      }
    }
    if (count > 0) {
      writeNotifications(all);
    }
    return count;
  },

  markAllAsUnread(actorUserId: string): number {
    const all = readNotifications();
    let count = 0;
    const actorUserClean = actorUserId?.replace(/^(donor-|dp-)+/, "");
    for (const notif of all) {
      const notifUserClean = notif.user_id?.replace(/^(donor-|dp-)+/, "");
      if ((notif.user_id === actorUserId || notifUserClean === actorUserClean) && notif.is_read) {
        notif.is_read = false;
        notif.read_at = null;
        count++;
      }
    }
    if (count > 0) {
      writeNotifications(all);
    }
    return count;
  },

  getUnreadCount(userIdOrOrgId: string): number {
    const all = readNotifications();
    return all.filter(
      (n) => (n.user_id === userIdOrOrgId || n.organization_id === userIdOrOrgId) && !n.is_read
    ).length;
  },

  clear(): void {
    writeNotifications([]);
  },
};
