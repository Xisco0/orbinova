/**
 * ORBINOVA USER NOTIFICATION PREFERENCES
 * Non-Essential Communication Management & Mandatory Security Protection
 */

import fs from "fs";
import path from "path";
import { EmailCategory, UserEmailPreferences } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const PREFS_FILE = path.join(DATA_DIR, "email_preferences.json");

function ensureStoreDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function readPreferences(): Record<string, UserEmailPreferences> {
  ensureStoreDir();
  if (!fs.existsSync(PREFS_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(PREFS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writePreferences(data: Record<string, UserEmailPreferences>) {
  ensureStoreDir();
  try {
    fs.writeFileSync(PREFS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write email preferences store:", e);
  }
}

// Mandatory categories that CANNOT be disabled under any circumstances
const MANDATORY_CATEGORIES: EmailCategory[] = [
  "auth",
  "security",
  "account",
];

export const emailPreferencesStore = {
  get(userIdOrEmail: string): UserEmailPreferences {
    const store = readPreferences();
    const key = userIdOrEmail.toLowerCase();
    if (store[key]) {
      return store[key];
    }

    return {
      userId: userIdOrEmail,
      email: userIdOrEmail,
      donorOpportunities: true,
      operationalUpdates: true,
      inventoryDigest: true,
      generalAnnouncements: false, // Default opt-out for marketing/general
      updatedAt: new Date().toISOString(),
    };
  },

  update(
    userIdOrEmail: string,
    updates: Partial<Omit<UserEmailPreferences, "userId" | "email" | "updatedAt">>
  ): UserEmailPreferences {
    const store = readPreferences();
    const key = userIdOrEmail.toLowerCase();
    const current = this.get(key);

    const updated: UserEmailPreferences = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    store[key] = updated;
    writePreferences(store);
    return updated;
  },

  /**
   * Determines whether an email in a given category is permitted for a recipient
   */
  isCategoryAllowed(recipientEmail: string, category: EmailCategory): boolean {
    // 1. Mandatory categories are always permitted
    if (MANDATORY_CATEGORIES.includes(category)) {
      return true;
    }

    // 2. Clinical emergency blood requests are mandatory operational alerts
    if (category === "blood_requests" || category === "reservations") {
      return true;
    }

    const prefs = this.get(recipientEmail);

    if (category === "donors") {
      return prefs.donorOpportunities;
    }

    if (category === "inventory") {
      return prefs.inventoryDigest;
    }

    return prefs.operationalUpdates;
  },
};
