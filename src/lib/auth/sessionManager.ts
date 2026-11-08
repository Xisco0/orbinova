import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  SESSION_CONFIG,
  SESSION_MESSAGES,
  SESSION_COOKIE_NAME_PREFIX,
  getSessionCookieName,
} from "./sessionConfig";

export { SESSION_COOKIE_NAME_PREFIX, getSessionCookieName };

export interface ActiveSessionRecord {
  userId: string;
  sessionId: string;
  sessionVersion: number;
  portalScope?: string;
  createdAt: string;
  lastActiveAt: string;
  lastRefreshedAt?: string;
  ip?: string;
  userAgent?: string;
}

function getSessionsFilePath(): string {
  try {
    const cwd = typeof process !== "undefined" && typeof process.cwd === "function" ? process.cwd() : ".";
    const dataDir = path.join(cwd, ".data");
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }
    return path.join(dataDir, "active_sessions.json");
  } catch {
    return ".data/active_sessions.json";
  }
}

// In-memory cache for fast, zero-latency validation
let inMemorySessions: Record<string, ActiveSessionRecord> | null = null;

function readSessionsFromDisk(): Record<string, ActiveSessionRecord> {
  const filePath = getSessionsFilePath();
  try {
    if (!fs.existsSync(filePath)) {
      return {};
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return inMemorySessions || {};
  }
}

function writeSessionsToDisk(data: Record<string, ActiveSessionRecord>): void {
  const filePath = getSessionsFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write active sessions store:", err);
  }
}

function getSessions(): Record<string, ActiveSessionRecord> {
  if (!inMemorySessions) {
    inMemorySessions = readSessionsFromDisk();
  }
  return inMemorySessions;
}

// In-process mutex for atomic concurrency protection (Latest login wins atomically)
let isLockAcquired = false;
async function runWithLock<T>(fn: () => Promise<T> | T): Promise<T> {
  const start = Date.now();
  while (isLockAcquired) {
    if (Date.now() - start > 5000) {
      isLockAcquired = false;
      break;
    }
    await new Promise((r) => setTimeout(r, 10));
  }
  isLockAcquired = true;
  try {
    return await fn();
  } finally {
    isLockAcquired = false;
  }
}

/**
 * Portable constant-time string comparison preventing timing attacks.
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }
}

export const SESSION_EXPIRED_MESSAGE = "Please sign in again.";

export const sessionManager = {
  /**
   * Generates a cryptographically secure session identifier.
   */
  generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomHex = crypto.randomBytes(32).toString("hex");
    return `sess_${timestamp}_${randomHex}`;
  },

  /**
   * Creates a new active session for the user, atomically invalidating any prior sessions.
   * Latest successful login always wins.
   */
  async createSession(
    userId: string,
    options?: {
      portalScope?: string;
      ip?: string;
      userAgent?: string;
    }
  ): Promise<string> {
    if (!userId) throw new Error("userId is required to create a session");

    return runWithLock(async () => {
      const sessions = getSessions();
      const existing = sessions[userId];
      const newVersion = (existing?.sessionVersion || 0) + 1;
      const newSessionId = sessionManager.generateSessionId();
      const now = new Date().toISOString();

      const newRecord: ActiveSessionRecord = {
        userId,
        sessionId: newSessionId,
        sessionVersion: newVersion,
        portalScope: options?.portalScope || "hospital",
        createdAt: now,
        lastActiveAt: now,
        ip: options?.ip,
        userAgent: options?.userAgent,
      };

      sessions[userId] = newRecord;
      inMemorySessions = sessions;
      writeSessionsToDisk(sessions);

      return newSessionId;
    });
  },

  /**
   * Checks the detailed status of a session (single-session validity, inactivity timeout, max lifetime).
   * Does NOT treat background polling alone as meaningful user activity.
   */
  checkSessionStatus(
    userId: string,
    sessionId: string,
    options?: { isMeaningfulActivity?: boolean }
  ): {
    isValid: boolean;
    reason?: "revoked" | "inactivity_timeout" | "max_lifetime_exceeded" | "not_found";
    remainingInactivitySeconds?: number;
    remainingLifetimeSeconds?: number;
  } {
    if (!userId || !sessionId) return { isValid: false, reason: "not_found" };

    const sessions = getSessions();
    const active = sessions[userId];
    if (!active) return { isValid: false, reason: "not_found" };

    // Strict constant-time string comparison against active session ID
    if (!timingSafeEqualStr(active.sessionId, sessionId)) {
      return { isValid: false, reason: "revoked" };
    }

    const now = Date.now();
    const createdTime = Date.parse(active.createdAt) || now;
    const lastActiveTime = Date.parse(active.lastActiveAt) || now;

    // Check maximum session lifetime (7 days)
    const elapsedLifetimeSeconds = Math.floor((now - createdTime) / 1000);
    const remainingLifetimeSeconds = Math.max(0, SESSION_CONFIG.MAX_SESSION_LIFETIME_SECONDS - elapsedLifetimeSeconds);
    if (elapsedLifetimeSeconds >= SESSION_CONFIG.MAX_SESSION_LIFETIME_SECONDS) {
      return { isValid: false, reason: "max_lifetime_exceeded", remainingLifetimeSeconds: 0 };
    }

    // Check inactivity timeout (30 minutes of meaningful user activity)
    const elapsedInactivitySeconds = Math.floor((now - lastActiveTime) / 1000);
    const remainingInactivitySeconds = Math.max(0, SESSION_CONFIG.INACTIVITY_TIMEOUT_SECONDS - elapsedInactivitySeconds);
    if (elapsedInactivitySeconds >= SESSION_CONFIG.INACTIVITY_TIMEOUT_SECONDS) {
      return { isValid: false, reason: "inactivity_timeout", remainingInactivitySeconds: 0 };
    }

    // Meaningful user activity (clicks, navigation, explicit continuation) updates lastActiveAt
    if (options?.isMeaningfulActivity) {
      active.lastActiveAt = new Date().toISOString();
      writeSessionsToDisk(sessions);
    }

    return {
      isValid: true,
      remainingInactivitySeconds,
      remainingLifetimeSeconds,
    };
  },

  /**
   * Records meaningful user activity (interactions, navigation, continuation).
   */
  recordMeaningfulActivity(userId: string): boolean {
    if (!userId) return false;
    const sessions = getSessions();
    const active = sessions[userId];
    if (!active) return false;

    const now = Date.now();
    const lastActiveTime = Date.parse(active.lastActiveAt) || now;
    if (Math.floor((now - lastActiveTime) / 1000) >= SESSION_CONFIG.INACTIVITY_TIMEOUT_SECONDS) {
      return false;
    }

    active.lastActiveAt = new Date().toISOString();
    writeSessionsToDisk(sessions);
    return true;
  },

  /**
   * Refreshes access token metadata without creating a new independent session.
   * Ordinary token refresh preserves active session identifier.
   */
  touchRefresh(userId: string, sessionId: string): boolean {
    if (!userId || !sessionId) return false;
    const sessions = getSessions();
    const active = sessions[userId];
    if (!active) return false;
    if (!timingSafeEqualStr(active.sessionId, sessionId)) return false;

    active.lastRefreshedAt = new Date().toISOString();
    writeSessionsToDisk(sessions);
    return true;
  },

  /**
   * Validates if the presented session identifier matches the user's active session.
   * Returns true only if the session is currently active and valid.
   */
  validateSession(userId: string, sessionId: string, options?: { isMeaningfulActivity?: boolean }): boolean {
    return this.checkSessionStatus(userId, sessionId, options).isValid;
  },

  /**
   * Retrieves the active session for a user, if any.
   * NEVER exposes this to client-side logs or external API payloads.
   */
  getActiveSession(userId: string): ActiveSessionRecord | undefined {
    if (!userId) return undefined;
    const sessions = getSessions();
    return sessions[userId];
  },

  /**
   * Revokes the active session for a user (e.g., on explicit logout, password reset, or account suspension).
   */
  async revokeSession(userId: string): Promise<void> {
    if (!userId) return;

    await runWithLock(async () => {
      const sessions = getSessions();
      if (sessions[userId]) {
        delete sessions[userId];
        inMemorySessions = sessions;
        writeSessionsToDisk(sessions);
      }
    });
  },

  /**
   * Revokes an active session by its session identifier (e.g., on logout when user ID resolution is unavailable).
   */
  async revokeBySessionId(sessionId: string): Promise<void> {
    if (!sessionId) return;

    await runWithLock(async () => {
      const sessions = getSessions();
      let changed = false;
      for (const [uid, record] of Object.entries(sessions)) {
        if (record.sessionId === sessionId) {
          delete sessions[uid];
          changed = true;
        }
      }
      if (changed) {
        inMemorySessions = sessions;
        writeSessionsToDisk(sessions);
      }
    });
  },

  /**
   * Clears all sessions (primarily for test environments).
   */
  async clearAll(): Promise<void> {
    await runWithLock(async () => {
      inMemorySessions = {};
      writeSessionsToDisk({});
    });
  },
};
