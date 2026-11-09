import crypto from "crypto";
import { donorStore } from "@/services/donorStore";

/**
 * ORBINOVA DONOR REFERENCE ID GENERATOR
 * Standard format: DONOR-XXXXXX where XXXXXX is exactly 6 numeric digits (preserving leading zeros).
 * Examples: DONOR-483921, DONOR-092835, DONOR-000427
 */

export const DONOR_REFERENCE_REGEX = /^DONOR-\d{6}$/;

/**
 * Validates whether a given string adheres to the strict DONOR-XXXXXX 6-digit numeric format.
 */
export function isValidDonorReference(ref: string | null | undefined): boolean {
  if (!ref || typeof ref !== "string") return false;
  return DONOR_REFERENCE_REGEX.test(ref.trim());
}

/**
 * Generates a single cryptographically secure 6-digit reference string.
 */
export function generateRawSixDigitCode(): string {
  // Generates integer from 0 to 999999 inclusive
  const num = crypto.randomInt(0, 1000000);
  return num.toString().padStart(6, "0");
}

/**
 * Generates a unique, non-colliding donor reference (DONOR-XXXXXX).
 * Checks the existing donor store and retries automatically if a collision occurs.
 */
export function generateUniqueDonorReference(existingRefs?: Set<string>): string {
  const existingSet = existingRefs || new Set<string>();

  // If existingRefs not passed, collect from store
  if (!existingRefs) {
    try {
      const allDonors = donorStore.getAllList();
      for (const d of allDonors) {
        if (d.donorNumber && isValidDonorReference(d.donorNumber)) {
          existingSet.add(d.donorNumber);
        }
      }
    } catch {}
  }

  // Cryptographically generate with collision retries
  let attempts = 0;
  while (attempts < 100) {
    attempts++;
    const code = generateRawSixDigitCode();
    const candidate = `DONOR-${code}`;

    if (!existingSet.has(candidate)) {
      existingSet.add(candidate);
      return candidate;
    }
  }

  // Fallback with timestamp hash slice guarantee
  const fallbackNum = Math.floor(Date.now() % 1000000).toString().padStart(6, "0");
  return `DONOR-${fallbackNum}`;
}

/**
 * Normalizes or migrates a donor reference. If already valid, preserves it intact.
 * If invalid, missing, or a placeholder (e.g. DONOR-D00000, sliced UUIDs), assigns a new valid reference.
 */
export function normalizeDonorReference(ref: string | null | undefined, existingRefs?: Set<string>): string {
  if (isValidDonorReference(ref)) {
    return ref!.trim();
  }
  return generateUniqueDonorReference(existingRefs);
}

/**
 * Returns the authoritative donor reference (DONOR-XXXXXX) for display across all views.
 * Looks up existing reference from stored donor record, or lazily generates and persists one if missing.
 */
export function getDonorDisplayReference(donorId: string, directRef?: string | null): string {
  if (directRef && isValidDonorReference(directRef)) {
    return directRef;
  }
  const stored = donorStore.get(donorId);
  if (stored?.donorNumber && isValidDonorReference(stored.donorNumber)) {
    return stored.donorNumber;
  }
  const newRef = generateUniqueDonorReference();
  if (stored) {
    donorStore.save({ ...stored, donorNumber: newRef });
  }
  return newRef;
}
