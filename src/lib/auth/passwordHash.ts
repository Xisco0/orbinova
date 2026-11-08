/**
 * ORBINOVA SECURE PASSWORD HASHING UTILITY
 * Implements PBKDF2-HMAC-SHA512 with cryptographically random salt and timing-safe comparison.
 * Standard NIST & OWASP compliance for institutional healthcare security.
 */

import crypto from "crypto";

const ITERATIONS = 100000;
const KEY_LEN = 64;
const DIGEST = "sha512";

/**
 * Hashes a plaintext password using PBKDF2-HMAC-SHA512 with a fresh random salt.
 * Output format: "salt:hexHash"
 */
export function hashPassword(password: string): string {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string.");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a password attempt against a stored PBKDF2 "salt:hash" string.
 * Uses crypto.timingSafeEqual to prevent side-channel timing attacks.
 */
export function verifyPassword(passwordAttempt: string, storedHash: string): boolean {
  if (!passwordAttempt || !storedHash || typeof storedHash !== "string") {
    return false;
  }
  if (!storedHash.includes(":")) {
    return false;
  }

  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) {
    return false;
  }

  try {
    const hashToVerify = crypto.pbkdf2Sync(passwordAttempt, salt, ITERATIONS, KEY_LEN, DIGEST).toString("hex");
    const bufVerify = Buffer.from(hashToVerify, "hex");
    const bufOriginal = Buffer.from(originalHash, "hex");

    if (bufVerify.length !== bufOriginal.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufVerify, bufOriginal);
  } catch {
    return false;
  }
}
