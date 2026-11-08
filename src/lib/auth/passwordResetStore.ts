import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface PasswordResetRecord {
  tokenHash: string;
  userId: string;
  email: string;
  portalScope: "hospital" | "donor" | "admin";
  expiresAt: string;
  used: boolean;
  createdAt: string;
  usedAt?: string;
  ipAddress?: string;
}

interface RateLimitRecord {
  count: number;
  firstAttemptAt: number;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const RESET_STORE_FILE = path.join(DATA_DIR, "password_resets.json");
const RATE_LIMIT_FILE = path.join(DATA_DIR, "password_reset_rate_limits.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore<T>(filePath: string, fallback: T): T {
  ensureDir();
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStore<T>(filePath: string, data: T) {
  ensureDir();
  const tmp = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, filePath);
}

// Simple atomic mutex for local file access
let fileLock = Promise.resolve();
async function runWithLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const result = fileLock.then(fn);
  fileLock = result.then(() => {}).catch(() => {});
  return result;
}

export const passwordResetStore = {
  /**
   * Hashes a raw reset token with SHA-256
   */
  hashToken(token: string): string {
    return crypto.createHash("sha256").update(token.trim()).digest("hex");
  },

  /**
   * Rate limiting: Max 5 password reset requests per email/IP per 60 minutes
   */
  async checkRateLimit(identifier: string): Promise<{ allowed: boolean; waitMinutes: number }> {
    return runWithLock(() => {
      const limits = readStore<Record<string, RateLimitRecord>>(RATE_LIMIT_FILE, {});
      const now = Date.now();
      const windowMs = 60 * 60 * 1000; // 1 hour
      const maxAttempts = 5;

      const record = limits[identifier];
      if (!record) {
        limits[identifier] = { count: 1, firstAttemptAt: now };
        writeStore(RATE_LIMIT_FILE, limits);
        return { allowed: true, waitMinutes: 0 };
      }

      if (now - record.firstAttemptAt > windowMs) {
        // Window expired, reset
        limits[identifier] = { count: 1, firstAttemptAt: now };
        writeStore(RATE_LIMIT_FILE, limits);
        return { allowed: true, waitMinutes: 0 };
      }

      if (record.count >= maxAttempts) {
        const remainingMs = windowMs - (now - record.firstAttemptAt);
        const waitMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
        return { allowed: false, waitMinutes };
      }

      record.count += 1;
      writeStore(RATE_LIMIT_FILE, limits);
      return { allowed: true, waitMinutes: 0 };
    });
  },

  /**
   * Generates a cryptographically secure token, hashes it, and stores the hash
   * Returns the raw token (to be emailed once only; never logged or saved in plaintext)
   */
  async createResetToken(params: {
    userId: string;
    email: string;
    portalScope?: "hospital" | "donor" | "admin";
    expiresInMinutes?: number;
    ipAddress?: string;
  }): Promise<{ rawToken: string; expiresAt: string }> {
    return runWithLock(() => {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = this.hashToken(rawToken);

      const expiresInMinutes = params.expiresInMinutes || 20; // 20 minutes default
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

      const store = readStore<Record<string, PasswordResetRecord>>(RESET_STORE_FILE, {});

      // Invalidate any existing unused reset tokens for this user/email
      for (const hash of Object.keys(store)) {
        if (store[hash].email.toLowerCase() === params.email.toLowerCase() && !store[hash].used) {
          store[hash].used = true;
          store[hash].usedAt = new Date().toISOString();
        }
      }

      store[tokenHash] = {
        tokenHash,
        userId: params.userId,
        email: params.email.toLowerCase(),
        portalScope: params.portalScope || "hospital",
        expiresAt,
        used: false,
        createdAt: new Date().toISOString(),
        ipAddress: params.ipAddress,
      };

      writeStore(RESET_STORE_FILE, store);
      return { rawToken, expiresAt };
    });
  },

  /**
   * Verifies a raw token by checking its SHA-256 hash, expiry, and used status
   */
  async verifyToken(rawToken: string): Promise<{
    valid: boolean;
    record?: PasswordResetRecord;
    error?: string;
  }> {
    if (!rawToken || typeof rawToken !== "string" || rawToken.trim().length < 16) {
      return { valid: false, error: "Invalid password reset token format." };
    }

    return runWithLock(() => {
      const tokenHash = this.hashToken(rawToken);
      const store = readStore<Record<string, PasswordResetRecord>>(RESET_STORE_FILE, {});
      const record = store[tokenHash];

      if (!record) {
        return {
          valid: false,
          error: "This password reset link is invalid or does not exist. Please request a new one.",
        };
      }

      if (record.used) {
        return {
          valid: false,
          error: "This password reset link has already been used. Please request a new one.",
        };
      }

      const expiresMs = new Date(record.expiresAt).getTime();
      if (Date.now() > expiresMs) {
        return {
          valid: false,
          error: "This password reset link has expired. For your security, reset links are valid for 20 minutes. Please request a new one.",
        };
      }

      return { valid: true, record };
    });
  },

  /**
   * Marks a reset token as used (single-use enforcement)
   */
  async markTokenUsed(tokenHash: string): Promise<boolean> {
    return runWithLock(() => {
      const store = readStore<Record<string, PasswordResetRecord>>(RESET_STORE_FILE, {});
      if (store[tokenHash]) {
        store[tokenHash].used = true;
        store[tokenHash].usedAt = new Date().toISOString();
        writeStore(RESET_STORE_FILE, store);
        return true;
      }
      return false;
    });
  },
};
