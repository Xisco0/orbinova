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

const DATA_DIR = path.join(process.cwd(), ".data");
const ATTEMPTS_FILE = path.join(DATA_DIR, "login_attempts.json");

export const ACCOUNT_SECURITY_CONFIG = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_MESSAGE:
    "Your account has been locked due to multiple unsuccessful login attempts. Please contact your institution administrator for assistance.",
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
   * Resets all lockout records (for testing and maintenance)
   */
  resetAll(): void {
    writeAttempts({});
    unknownEmailAttempts.clear();
    knownTestAccounts.clear();
  },
};
