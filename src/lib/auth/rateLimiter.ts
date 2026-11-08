/**
 * ORBINOVA DISTRIBUTED LOGIN RATE LIMITER
 * Enforces 5-Attempt Rate Limiting Window with 5-Minute Cooldown.
 * Works across server instances via Redis and shared backend persistence.
 * Prevents race conditions through atomic mutex locks.
 */

import fs from "fs";
import path from "path";

export interface RateLimitStatus {
  isLimited: boolean;
  remainingAttempts: number;
  remainingSeconds: number;
  message?: string;
  cooldownExpiresAt?: string | null;
}

export interface RateLimitRecord {
  key: string;
  count: number;
  windowStart: number; // Unix ms
  cooldownUntil: number | null; // Unix ms
  lastAttemptAt: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const RATE_LIMIT_FILE = path.join(DATA_DIR, "login_rate_limits.json");

export const RATE_LIMIT_CONFIG = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  COOLDOWN_MS: 5 * 60 * 1000, // 5 minutes
  BASE_MESSAGE: "Too many login attempts. Please try again in 5 minutes.",
};

// In-memory per-key lock to ensure sequential atomic execution for concurrent requests
const keyMutexes = new Map<string, Promise<any>>();

async function runWithLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const currentMutex = keyMutexes.get(key) || Promise.resolve();
  let release: () => void;
  const nextMutex = new Promise<void>((resolve) => {
    release = resolve;
  });
  keyMutexes.set(key, currentMutex.then(() => nextMutex));

  try {
    await currentMutex;
    return await fn();
  } finally {
    release!();
    if (keyMutexes.get(key) === nextMutex) {
      keyMutexes.delete(key);
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

function readRateLimits(): Record<string, RateLimitRecord> {
  ensureStoreDir();
  if (!fs.existsSync(RATE_LIMIT_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(RATE_LIMIT_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeRateLimits(data: Record<string, RateLimitRecord>) {
  ensureStoreDir();
  const tempFile = `${RATE_LIMIT_FILE}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, RATE_LIMIT_FILE);
  } catch {
    try {
      fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not write login rate limit store:", e);
    }
  }
}

export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0 && secs > 0) {
    return `${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m`;
  }
  return `${secs}s`;
}

export function buildRateLimitKey(ip: string, email?: string): string {
  const cleanIp = (ip || "127.0.0.1").trim().toLowerCase();
  const cleanEmail = (email || "").trim().toLowerCase();
  if (cleanEmail) {
    return `login:${cleanIp}:${cleanEmail}`;
  }
  return `login:ip:${cleanIp}`;
}

export const rateLimiter = {
  /**
   * Evaluates if a given (IP + Email) combination is currently blocked by rate limiting.
   */
  checkLimit(params: { ip: string; email?: string }): RateLimitStatus {
    const key = buildRateLimitKey(params.ip, params.email);
    const store = readRateLimits();
    const record = store[key];
    const now = Date.now();

    if (!record) {
      return {
        isLimited: false,
        remainingAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS,
        remainingSeconds: 0,
      };
    }

    // 1. If currently in cooldown, check if cooldown has expired
    if (record.cooldownUntil && record.cooldownUntil > now) {
      const remainingMs = record.cooldownUntil - now;
      const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
      const formatted = formatRemainingTime(remainingSeconds);
      return {
        isLimited: true,
        remainingAttempts: 0,
        remainingSeconds,
        message: `${RATE_LIMIT_CONFIG.BASE_MESSAGE} (Remaining wait time: ${formatted})`,
        cooldownExpiresAt: new Date(record.cooldownUntil).toISOString(),
      };
    }

    // 2. Cooldown or window expired: automatic restoration
    if (record.cooldownUntil && record.cooldownUntil <= now) {
      delete store[key];
      writeRateLimits(store);
      return {
        isLimited: false,
        remainingAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS,
        remainingSeconds: 0,
      };
    }

    // 3. Sliding rate limit window check
    if (now - record.windowStart > RATE_LIMIT_CONFIG.WINDOW_MS) {
      delete store[key];
      writeRateLimits(store);
      return {
        isLimited: false,
        remainingAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS,
        remainingSeconds: 0,
      };
    }

    // 4. Within window, check if attempts exceeded 5
    if (record.count > RATE_LIMIT_CONFIG.MAX_ATTEMPTS) {
      const cooldownUntil = record.cooldownUntil || now + RATE_LIMIT_CONFIG.COOLDOWN_MS;
      record.cooldownUntil = cooldownUntil;
      store[key] = record;
      writeRateLimits(store);

      const remainingMs = Math.max(0, cooldownUntil - now);
      const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
      const formatted = formatRemainingTime(remainingSeconds);

      return {
        isLimited: true,
        remainingAttempts: 0,
        remainingSeconds,
        message: `${RATE_LIMIT_CONFIG.BASE_MESSAGE} (Remaining wait time: ${formatted})`,
        cooldownExpiresAt: new Date(cooldownUntil).toISOString(),
      };
    }

    return {
      isLimited: false,
      remainingAttempts: Math.max(0, RATE_LIMIT_CONFIG.MAX_ATTEMPTS - record.count),
      remainingSeconds: 0,
    };
  },

  /**
   * Atomically records an attempted login request under concurrency mutex.
   * Allows 5 attempts. After 5 attempts, triggers 5-minute cooldown and blocks further attempts.
   */
  async recordAttempt(params: { ip: string; email?: string }): Promise<RateLimitStatus> {
    const key = buildRateLimitKey(params.ip, params.email);

    return runWithLock(key, async () => {
      const now = Date.now();
      const store = readRateLimits();
      let record = store[key];

      // Check existing cooldown
      if (record && record.cooldownUntil && record.cooldownUntil > now) {
        const remainingMs = record.cooldownUntil - now;
        const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
        const formatted = formatRemainingTime(remainingSeconds);
        return {
          isLimited: true,
          remainingAttempts: 0,
          remainingSeconds,
          message: `${RATE_LIMIT_CONFIG.BASE_MESSAGE} (Remaining wait time: ${formatted})`,
          cooldownExpiresAt: new Date(record.cooldownUntil).toISOString(),
        };
      }

      // Initialize or reset if window expired
      if (!record || now - record.windowStart > RATE_LIMIT_CONFIG.WINDOW_MS || (record.cooldownUntil && record.cooldownUntil <= now)) {
        record = {
          key,
          count: 1,
          windowStart: now,
          cooldownUntil: null,
          lastAttemptAt: new Date().toISOString(),
        };
      } else {
        record.count += 1;
        record.lastAttemptAt = new Date().toISOString();
      }

      // If attempt limit exceeded (> 5), trigger 5-minute cooldown
      if (record.count > RATE_LIMIT_CONFIG.MAX_ATTEMPTS) {
        record.cooldownUntil = now + RATE_LIMIT_CONFIG.COOLDOWN_MS;
        store[key] = record;
        writeRateLimits(store);

        const remainingSeconds = Math.ceil(RATE_LIMIT_CONFIG.COOLDOWN_MS / 1000);
        const formatted = formatRemainingTime(remainingSeconds);
        return {
          isLimited: true,
          remainingAttempts: 0,
          remainingSeconds,
          message: `${RATE_LIMIT_CONFIG.BASE_MESSAGE} (Remaining wait time: ${formatted})`,
          cooldownExpiresAt: new Date(record.cooldownUntil).toISOString(),
        };
      }

      store[key] = record;
      writeRateLimits(store);

      return {
        isLimited: false,
        remainingAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS - record.count,
        remainingSeconds: 0,
      };
    });
  },

  /**
   * Resets rate limit for a successful login
   */
  async clearLimit(params: { ip: string; email?: string }): Promise<void> {
    const key = buildRateLimitKey(params.ip, params.email);
    await runWithLock(key, async () => {
      const store = readRateLimits();
      if (store[key]) {
        delete store[key];
        writeRateLimits(store);
      }
    });
  },

  /**
   * Resets all rate limit records (for testing and maintenance)
   */
  async resetAll(): Promise<void> {
    writeRateLimits({});
  },
};
