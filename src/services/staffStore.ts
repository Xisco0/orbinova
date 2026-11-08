import fs from "fs";
import path from "path";
import { GranularMemberRole } from "@/types/database";
import { hashPassword, verifyPassword } from "@/lib/auth/passwordHash";

export interface StoredStaffOverride {
  userId: string;
  memberId?: string;
  organizationId: string;
  fullName: string;
  surname?: string;
  email?: string;
  phone?: string;
  memberRole: GranularMemberRole;
  isActive: boolean;
  temporaryPassword?: string;
  passwordHash?: string;
  mustChangePassword?: boolean;
  passwordChangedAt?: string | null;
  customPermissions?: string[];
  delegatedPermissions?: string[];
  updatedAt?: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "staff_roster.json");

function ensureStoreDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function readStore(): Record<string, StoredStaffOverride> {
  ensureStoreDir();
  if (!fs.existsSync(STORE_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeStore(data: Record<string, StoredStaffOverride>) {
  ensureStoreDir();
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write staff store:", e);
  }
}

export const staffStore = {
  getAll(): Record<string, StoredStaffOverride> {
    return readStore();
  },

  get(userIdOrEmail: string): StoredStaffOverride | undefined {
    if (!userIdOrEmail) return undefined;
    const store = readStore();
    const cleanId = userIdOrEmail.startsWith("member-")
      ? userIdOrEmail.replace("member-", "")
      : userIdOrEmail;
    const prefixedId = `member-${cleanId}`;

    if (store[userIdOrEmail]) return store[userIdOrEmail];
    if (store[cleanId]) return store[cleanId];
    if (store[prefixedId]) return store[prefixedId];

    return Object.values(store).find(
      (s) =>
        s.userId === userIdOrEmail ||
        s.userId === cleanId ||
        s.memberId === userIdOrEmail ||
        s.memberId === prefixedId ||
        (s.email && s.email.toLowerCase() === userIdOrEmail.toLowerCase())
    );
  },

  getByOrg(orgId: string): StoredStaffOverride[] {
    const store = readStore();
    return Object.values(store).filter((s) => s.organizationId === orgId);
  },

  save(override: StoredStaffOverride): void {
    const store = readStore();
    const cleanUserId = override.userId.startsWith("member-")
      ? override.userId.replace("member-", "")
      : override.userId;
    const key = cleanUserId || override.email || override.memberId || `staff-${Date.now()}`;
    store[key] = {
      ...override,
      userId: cleanUserId,
      memberId: override.memberId || `member-${cleanUserId}`,
      updatedAt: new Date().toISOString(),
    };
    writeStore(store);
  },

  updateStatus(
    userIdOrMemberId: string,
    isActive: boolean,
    orgId?: string,
    fallbackInfo?: { fullName?: string; email?: string; role?: GranularMemberRole }
  ): void {
    if (!userIdOrMemberId) return;
    const store = readStore();
    const cleanId = userIdOrMemberId.startsWith("member-")
      ? userIdOrMemberId.replace("member-", "")
      : userIdOrMemberId;
    const prefixedId = `member-${cleanId}`;

    let found = false;
    for (const key of Object.keys(store)) {
      if (
        store[key].userId === userIdOrMemberId ||
        store[key].userId === cleanId ||
        store[key].memberId === userIdOrMemberId ||
        store[key].memberId === prefixedId ||
        key === userIdOrMemberId ||
        key === cleanId
      ) {
        store[key].isActive = isActive;
        store[key].updatedAt = new Date().toISOString();
        found = true;
      }
    }

    if (!found) {
      store[cleanId] = {
        userId: cleanId,
        memberId: prefixedId,
        organizationId: orgId || "",
        fullName: fallbackInfo?.fullName || "Healthcare Specialist",
        email: fallbackInfo?.email,
        memberRole: fallbackInfo?.role || "doctor",
        isActive: isActive,
        updatedAt: new Date().toISOString(),
      };
    }

    writeStore(store);
  },

  markPasswordChanged(userIdOrEmail: string, newPassword?: string): boolean {
    if (!userIdOrEmail) return false;
    if (newPassword) {
      return this.setPassword(userIdOrEmail, newPassword);
    }
    const store = readStore();
    const cleanId = userIdOrEmail.startsWith("member-")
      ? userIdOrEmail.replace("member-", "")
      : userIdOrEmail;

    for (const key of Object.keys(store)) {
      const item = store[key];
      if (
        item.userId === userIdOrEmail ||
        item.userId === cleanId ||
        item.memberId === userIdOrEmail ||
        (item.email && item.email.toLowerCase() === userIdOrEmail.toLowerCase()) ||
        key === userIdOrEmail ||
        key === cleanId
      ) {
        store[key] = {
          ...item,
          mustChangePassword: false,
          temporaryPassword: undefined,
          passwordChangedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        writeStore(store);
        return true;
      }
    }
    return false;
  },

  /**
   * Sets a permanent password for a staff member using secure PBKDF2 hashing.
   * Atomically invalidates the temporary password and clears mustChangePassword.
   */
  setPassword(userIdOrEmail: string, newPassword: string): boolean {
    if (!userIdOrEmail || !newPassword) return false;
    const store = readStore();
    const cleanId = userIdOrEmail.startsWith("member-")
      ? userIdOrEmail.replace("member-", "")
      : userIdOrEmail;

    const hash = hashPassword(newPassword);

    let updated = false;
    for (const key of Object.keys(store)) {
      const item = store[key];
      if (
        item.userId === userIdOrEmail ||
        item.userId === cleanId ||
        item.memberId === userIdOrEmail ||
        (item.email && item.email.toLowerCase() === userIdOrEmail.toLowerCase()) ||
        key === userIdOrEmail ||
        key === cleanId
      ) {
        store[key] = {
          ...item,
          passwordHash: hash,
          temporaryPassword: undefined,
          mustChangePassword: false,
          passwordChangedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updated = true;
      }
    }

    if (updated) {
      writeStore(store);
      return true;
    }
    return false;
  },

  /**
   * Authoritatively verifies login credentials for a staff member.
   * Handles permanent PBKDF2 passwords, initial temporary passwords, and default first-login credentials.
   */
  verifyCredentials(
    emailOrId: string,
    passwordAttempt: string
  ): { valid: boolean; staff?: StoredStaffOverride; mustChangePassword: boolean } {
    if (!emailOrId || !passwordAttempt) {
      return { valid: false, mustChangePassword: false };
    }
    const staff = this.get(emailOrId);
    if (!staff || staff.isActive === false) {
      return { valid: false, mustChangePassword: false };
    }

    // 1. Permanent password check (PBKDF2 hash)
    if (staff.passwordHash && verifyPassword(passwordAttempt, staff.passwordHash)) {
      return {
        valid: true,
        staff,
        mustChangePassword: staff.mustChangePassword === true,
      };
    }

    // 2. Temporary password check (Initial unconsumed temporary password)
    if (staff.temporaryPassword && staff.temporaryPassword === passwordAttempt) {
      return {
        valid: true,
        staff,
        mustChangePassword: true, // ALWAYS requires password change
      };
    }

    // 3. System default password fallback (Only valid before custom password is set)
    const isDefaultPassword =
      passwordAttempt === "StaffPassword2026!" &&
      staff.mustChangePassword !== false &&
      !staff.passwordHash &&
      (!staff.temporaryPassword || staff.temporaryPassword === "StaffPassword2026!");

    if (isDefaultPassword) {
      return {
        valid: true,
        staff,
        mustChangePassword: true,
      };
    }

    return { valid: false, staff, mustChangePassword: false };
  },
};
