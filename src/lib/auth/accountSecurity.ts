/**
 * ORBINOVA ENTERPRISE ACCOUNT SECURITY & LOCKOUT ENGINE
 * Enforces 5-Attempt Lockout Policy, Account Enumeration Protection, Security Alerts,
 * Audit Trails, & Admin Recovery.
 * 
 * Rules:
 * 1. Invalid credentials always return "Invalid email or password."
 * 2. Five consecutive failed password attempts on an existing account lock the account.
 * 3. Lockout message: "Your account has been locked due to multiple unsuccessful login attempts. Please contact your institution administrator for assistance."
 * 4. Account remains locked until an authorized administrator completes recovery.
 * 5. Unknown email addresses do NOT create fake user accounts.
 */

import fs from "fs";
import path from "path";
import { orbinovaEmail } from "@/lib/email";
import { auditLogger } from "@/lib/audit/auditLogger";
import { staffStore } from "@/services/staffStore";
import { KNOWN_ORGANIZATIONS } from "@/services/facilityRelationships";
import { createClient } from "@/lib/supabase/server";
import { sessionManager } from "@/lib/auth/sessionManager";

export interface AccountLockoutRecord {
  email: string;
  failedCount: number;
  isLocked: boolean;
  lockedAt: string | null;
  unlockedAt: string | null;
  unlockedBy: string | null;
  lastAttemptAt: string;
  lockedUntil?: number | null; // Kept for interface compatibility
}

export interface LockoutStatus {
  isLocked: boolean;
  lockedAt?: string | null;
  message?: string;
  remainingMinutes?: number;
}

export interface AccountSuspensionRecord {
  id: string;
  email?: string;
  userId?: string;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspendedBy: string | null;
  reason: string | null;
  reactivatedAt?: string | null;
  reactivatedBy?: string | null;
  updatedAt: string;
}

export interface SuspensionStatus {
  isSuspended: boolean;
  suspendedAt?: string | null;
  suspendedBy?: string | null;
  reason?: string | null;
  message?: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const ATTEMPTS_FILE = path.join(DATA_DIR, "login_attempts.json");
const SUSPENSIONS_FILE = path.join(DATA_DIR, "account_suspensions.json");

export const ACCOUNT_SECURITY_CONFIG = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_MESSAGE:
    "Your account has been locked due to multiple unsuccessful login attempts. Please contact your administrator for assistance.",
  SUSPENSION_MESSAGE:
    "Your account has been suspended. Please contact your administrator for assistance.",
  GENERIC_INVALID_MESSAGE: "Invalid email or password.",
};

// Known test/dev accounts registry for non-DB test scenarios
const knownTestAccounts = new Set<string>();

// Transient tracking for non-existent emails (never written to persistent store)
const unknownEmailAttempts = new Map<string, { count: number; lastAttempt: number }>();

// In-memory per-account mutex to prevent race conditions during concurrent authentication
const accountMutexes = new Map<string, Promise<any>>();

async function runWithAccountLock<T>(email: string, fn: () => Promise<T>): Promise<T> {
  const currentMutex = accountMutexes.get(email) || Promise.resolve();
  let release: () => void;
  const nextMutex = new Promise<void>((resolve) => {
    release = resolve;
  });
  accountMutexes.set(email, currentMutex.then(() => nextMutex));

  try {
    await currentMutex;
    return await fn();
  } finally {
    release!();
    if (accountMutexes.get(email) === nextMutex) {
      accountMutexes.delete(email);
    }
  }
}

function ensureStoreDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function readAttempts(): Record<string, AccountLockoutRecord> {
  ensureStoreDir();
  if (!fs.existsSync(ATTEMPTS_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(ATTEMPTS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeAttempts(data: Record<string, AccountLockoutRecord>) {
  ensureStoreDir();
  const tempFile = `${ATTEMPTS_FILE}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, ATTEMPTS_FILE);
  } catch {
    try {
      fs.writeFileSync(ATTEMPTS_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not write login attempts store:", e);
    }
  }
}

function readSuspensions(): Record<string, AccountSuspensionRecord> {
  ensureStoreDir();
  if (!fs.existsSync(SUSPENSIONS_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(SUSPENSIONS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeSuspensions(data: Record<string, AccountSuspensionRecord>) {
  ensureStoreDir();
  const tempFile = `${SUSPENSIONS_FILE}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, SUSPENSIONS_FILE);
  } catch {
    try {
      fs.writeFileSync(SUSPENSIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not write account suspensions store:", e);
    }
  }
}

export const accountSecurity = {
  /**
   * Registers a recognized account for testing or runtime tracking
   */
  registerKnownAccount(email: string): void {
    if (!email) return;
    knownTestAccounts.add(email.trim().toLowerCase());
  },

  /**
   * Verifies if an email belongs to an existing registered user or institution
   */
  async isExistingAccount(email: string): Promise<boolean> {
    if (!email) return false;
    const key = email.trim().toLowerCase();

    if (knownTestAccounts.has(key)) return true;

    // 1. Staff roster check
    if (staffStore.get(key)) return true;

    // 2. Known organizations check
    if (KNOWN_ORGANIZATIONS.some((o) => o.email.toLowerCase() === key)) return true;

    // 3. Known default portal accounts
    const knownPortalEmails = [
      "hospital@orbinova.com",
      "bloodbank@orbinova.com",
      "donor@orbinova.com",
      "superadmin@orbinova.com",
      "admin@orbinova.com",
      "internal-bloodbank@orbinova.com",
      "orthopaedic@orbinova.com",
      "abujahospital@orbinova.com",
      "national-bloodbank@orbinova.com",
    ];
    if (knownPortalEmails.includes(key)) return true;

    // 4. Supabase profiles check
    try {
      const supabase = await createClient();
      const res: any = await supabase
        .from("profiles")
        .select("id")
        .eq("email", key)
        .maybeSingle();
      if (res?.data?.id) {
        return true;
      }
    } catch {}

    return false;
  },

  /**
   * Checks if an account is currently locked out.
   * Lockout remains indefinite until explicitly unlocked by an authorized administrator.
   */
  isAccountLocked(email: string): LockoutStatus {
    if (!email) return { isLocked: false };
    const key = email.trim().toLowerCase();
    const attempts = readAttempts();
    const record = attempts[key];

    if (!record) {
      return { isLocked: false };
    }

    if (record.isLocked) {
      return {
        isLocked: true,
        lockedAt: record.lockedAt,
        message: ACCOUNT_SECURITY_CONFIG.LOCKOUT_MESSAGE,
        remainingMinutes: 15,
      };
    }

    return { isLocked: false };
  },

  /**
   * Records an incorrect password attempt.
   * - For unknown email addresses: returns generic error without persisting fake user account.
   * - For existing accounts: increments failed counter. At 5 failures, locks the account.
   */
  async recordFailedAttempt(
    email: string,
    metadata?: { ip?: string; userAgent?: string; isKnownAccount?: boolean }
  ): Promise<{
    isLocked: boolean;
    failedCount: number;
    remainingAttempts: number;
    message: string;
  }> {
    const key = email.trim().toLowerCase();

    return runWithAccountLock(key, async () => {
      // Determine if account is an existing account
      const accountExists =
        metadata?.isKnownAccount ?? (await this.isExistingAccount(key));

      // Unknown account protection: do NOT create fake user account records in database or store
      if (!accountExists) {
        const prev = unknownEmailAttempts.get(key) || { count: 0, lastAttempt: Date.now() };
        unknownEmailAttempts.set(key, { count: prev.count + 1, lastAttempt: Date.now() });

        // Generic error message: identical to existing account attempts 1-4
        return {
          isLocked: false,
          failedCount: prev.count + 1,
          remainingAttempts: Math.max(0, ACCOUNT_SECURITY_CONFIG.MAX_FAILED_ATTEMPTS - (prev.count + 1)),
          message: ACCOUNT_SECURITY_CONFIG.GENERIC_INVALID_MESSAGE,
        };
      }

      // Existing Account Tracking:
      const attempts = readAttempts();
      const record: AccountLockoutRecord = attempts[key] || {
        email: key,
        failedCount: 0,
        isLocked: false,
        lockedAt: null,
        unlockedAt: null,
        unlockedBy: null,
        lastAttemptAt: new Date().toISOString(),
      };

      // If already locked, preserve lockout state and return lockout message
      if (record.isLocked) {
        return {
          isLocked: true,
          failedCount: record.failedCount,
          remainingAttempts: 0,
          message: ACCOUNT_SECURITY_CONFIG.LOCKOUT_MESSAGE,
        };
      }

      record.failedCount += 1;
      record.lastAttemptAt = new Date().toISOString();

      // Attempt 5 -> Enforce permanent account lockout
      if (record.failedCount >= ACCOUNT_SECURITY_CONFIG.MAX_FAILED_ATTEMPTS) {
        record.isLocked = true;
        record.lockedAt = new Date().toISOString();
        record.lockedUntil = Date.now() + 15 * 60 * 1000; // Compatibility field
        attempts[key] = record;
        writeAttempts(attempts);

        // Security: Revoke any active session immediately upon account lockout
        try {
          await sessionManager.revokeSession(key);
          const staffRec = staffStore.get(key);
          if (staffRec?.userId) {
            await sessionManager.revokeSession(staffRec.userId);
          }
        } catch {}

        // 1. Audit Trail Record
        await auditLogger.log({
          action: "ACCOUNT_LOCKED",
          entityType: "account_security",
          entityId: key,
          metadata: {
            reason: "5 consecutive failed password attempts",
            failedCount: record.failedCount,
            lockedAt: record.lockedAt,
            ip: metadata?.ip || null,
          },
          ipAddress: metadata?.ip || null,
          userAgent: metadata?.userAgent || null,
        });

        // 2. Security Lockout Email Alert
        try {
          await orbinovaEmail.sendAccountLockoutAlert({
            userEmail: key,
            adminContactEmail: "support@orbinova.health",
          });
        } catch (e) {
          console.warn("Failed to dispatch account lockout email:", e);
        }

        return {
          isLocked: true,
          failedCount: record.failedCount,
          remainingAttempts: 0,
          message: ACCOUNT_SECURITY_CONFIG.LOCKOUT_MESSAGE,
        };
      }

      attempts[key] = record;
      writeAttempts(attempts);

      const remaining = ACCOUNT_SECURITY_CONFIG.MAX_FAILED_ATTEMPTS - record.failedCount;

      // Generic error message: never reveal password vs email
      return {
        isLocked: false,
        failedCount: record.failedCount,
        remainingAttempts: remaining,
        message: ACCOUNT_SECURITY_CONFIG.GENERIC_INVALID_MESSAGE,
      };
    });
  },

  /**
   * Resets failed login attempts upon successful password authentication
   */
  recordSuccessfulLogin(email: string): void {
    if (!email) return;
    const key = email.trim().toLowerCase();
    const attempts = readAttempts();

    if (attempts[key]) {
      // If locked, cannot be cleared by successful login attempt (requires admin recovery)
      if (attempts[key].isLocked) {
        return;
      }
      delete attempts[key];
      writeAttempts(attempts);
    }
  },

  /**
   * Unlocks an account by an authorized administrator after appropriate verification.
   * Records immutable unlock event in the audit trail.
   */
  async unlockAccount(
    email: string,
    actor?: {
      userId?: string;
      role?: string;
      organizationId?: string;
      ipAddress?: string;
    }
  ): Promise<boolean> {
    if (!email) return false;
    const key = email.trim().toLowerCase();

    return runWithAccountLock(key, async () => {
      const attempts = readAttempts();
      const existing = attempts[key];

      const unlockedRecord: AccountLockoutRecord = {
        email: key,
        failedCount: 0,
        isLocked: false,
        lockedAt: null,
        unlockedAt: new Date().toISOString(),
        unlockedBy: actor?.userId || "system_administrator",
        lastAttemptAt: new Date().toISOString(),
        lockedUntil: null,
      };

      attempts[key] = unlockedRecord;
      writeAttempts(attempts);

      // Record unlock event in audit trail
      await auditLogger.log({
        userId: actor?.userId || null,
        organizationId: actor?.organizationId || null,
        action: "ACCOUNT_UNLOCKED",
        entityType: "account_security",
        entityId: key,
        metadata: {
          previousState: existing?.isLocked ? "locked" : "active",
          unlockedBy: actor?.userId || "system_administrator",
          actorRole: actor?.role || "administrator",
          unlockedAt: unlockedRecord.unlockedAt,
        },
        ipAddress: actor?.ipAddress || null,
      });

      return true;
    });
  },

  /**
   * Administratively suspends an account.
   * Distinct from automated security lockout: sets administrative suspension,
   * revokes active sessions, and records audit trail without erasing lockout logs.
   */
  async suspendAccount(
    identifier: string,
    details?: {
      userId?: string;
      email?: string;
      suspendedBy?: string;
      reason?: string;
    }
  ): Promise<void> {
    if (!identifier) return;
    const cleanId = identifier.trim().toLowerCase();
    const suspensions = readSuspensions();
    const nowIso = new Date().toISOString();

    const record: AccountSuspensionRecord = {
      id: cleanId,
      userId: details?.userId || (cleanId.includes("-") ? cleanId : undefined),
      email: details?.email || (cleanId.includes("@") ? cleanId : undefined),
      isSuspended: true,
      suspendedAt: nowIso,
      suspendedBy: details?.suspendedBy || "system_administrator",
      reason: details?.reason || "Administrative suspension by authorized administrator",
      updatedAt: nowIso,
    };

    suspensions[cleanId] = record;
    if (details?.userId && details.userId.toLowerCase() !== cleanId) {
      suspensions[details.userId.toLowerCase()] = record;
    }
    if (details?.email && details.email.toLowerCase() !== cleanId) {
      suspensions[details.email.toLowerCase()] = record;
    }
    writeSuspensions(suspensions);

    // Update staff store if staff member
    try {
      const staff = staffStore.get(cleanId);
      if (staff) {
        staffStore.save({
          ...staff,
          isActive: false,
          updatedAt: nowIso,
        });
      }
    } catch {}

    // Revoke any active session immediately upon administrative suspension
    try {
      await sessionManager.revokeSession(cleanId);
      if (details?.userId && details.userId !== cleanId) {
        await sessionManager.revokeSession(details.userId);
      }
      if (details?.email && details.email.toLowerCase() !== cleanId) {
        await sessionManager.revokeSession(details.email.toLowerCase());
      }
    } catch {}

    // Central audit log
    await auditLogger.log({
      userId: details?.suspendedBy || null,
      action: "ACCOUNT_SUSPENDED",
      entityType: "account_security",
      entityId: cleanId,
      metadata: {
        targetIdentifier: cleanId,
        suspendedBy: details?.suspendedBy || "system_administrator",
        reason: record.reason,
        suspendedAt: record.suspendedAt,
      },
    });
  },

  /**
   * Reactivates an administratively suspended account.
   * Only clears the administrative suspension; does NOT clear independent
   * failed-login security lockouts unless explicitly unlocked via unlockAccount.
   */
  async reactivateAccount(
    identifier: string,
    details?: {
      reactivatedBy?: string;
    }
  ): Promise<void> {
    if (!identifier) return;
    const cleanId = identifier.trim().toLowerCase();
    const suspensions = readSuspensions();
    const nowIso = new Date().toISOString();

    if (suspensions[cleanId]) {
      suspensions[cleanId] = {
        ...suspensions[cleanId],
        isSuspended: false,
        suspendedAt: null,
        suspendedBy: null,
        reason: null,
        reactivatedAt: nowIso,
        reactivatedBy: details?.reactivatedBy || "system_administrator",
        updatedAt: nowIso,
      };
      writeSuspensions(suspensions);
    }

    // Also update staff store if staff
    try {
      const staff = staffStore.get(cleanId);
      if (staff) {
        staffStore.save({
          ...staff,
          isActive: true,
          updatedAt: nowIso,
        });
      }
    } catch {}

    // Central audit log
    await auditLogger.log({
      userId: details?.reactivatedBy || null,
      action: "ACCOUNT_REACTIVATED",
      entityType: "account_security",
      entityId: cleanId,
      metadata: {
        targetIdentifier: cleanId,
        reactivatedBy: details?.reactivatedBy || "system_administrator",
        reactivatedAt: nowIso,
      },
    });
  },

  /**
   * Checks whether an account is administratively suspended.
   * Checks local suspension records, staffStore, and DB profiles table.
   */
  async isAccountSuspended(
    identifier: string
  ): Promise<SuspensionStatus> {
    if (!identifier) return { isSuspended: false };
    const key = identifier.trim().toLowerCase();

    // 1. Check local suspension store
    const suspensions = readSuspensions();
    const rec = suspensions[key];
    if (rec && rec.isSuspended) {
      return {
        isSuspended: true,
        suspendedAt: rec.suspendedAt,
        suspendedBy: rec.suspendedBy,
        reason: rec.reason,
        message: ACCOUNT_SECURITY_CONFIG.SUSPENSION_MESSAGE,
      };
    }

    // 2. Check staff store
    const staff = staffStore.get(key);
    if (staff && staff.isActive === false) {
      return {
        isSuspended: true,
        suspendedAt: staff.updatedAt || null,
        reason: "Administratively deactivated staff account",
        message: ACCOUNT_SECURITY_CONFIG.SUSPENSION_MESSAGE,
      };
    }

    // 3. Check Supabase profiles table
    try {
      const supabase = await createClient();
      const { data: profile } = await (supabase
        .from("profiles") as any)
        .select("id, email, is_active, is_suspended, suspended_at, suspended_by, suspension_reason")
        .or(`id.eq.${key},email.eq.${key}`)
        .maybeSingle();

      if (profile && (profile.is_suspended === true || profile.is_active === false)) {
        return {
          isSuspended: true,
          suspendedAt: profile.suspended_at || null,
          suspendedBy: profile.suspended_by || null,
          reason: profile.suspension_reason || "Account is not active",
          message: ACCOUNT_SECURITY_CONFIG.SUSPENSION_MESSAGE,
        };
      }
    } catch {}

    return { isSuspended: false };
  },

  /**
   * Resets all lockout and suspension records (for testing and maintenance)
   */
  resetAll(): void {
    writeAttempts({});
    writeSuspensions({});
    unknownEmailAttempts.clear();
    knownTestAccounts.clear();
  },
};
