/**
 * Donor Validation Utilities
 * Enforces clinical age constraints and date of birth requirements.
 */

export const MIN_DONOR_AGE = 18;
export const MAX_DONOR_AGE = 70;

/**
 * Calculates current age in full completed years from a birth date.
 */
export function calculateAge(dobInput: string | Date): number | null {
  if (!dobInput) return null;
  const dob = typeof dobInput === "string" ? new Date(dobInput) : dobInput;
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Validates donor date of birth against clinical age eligibility:
 * Minimum age: 18 years
 * Maximum age: 70 years
 */
export function validateDonorDateOfBirth(dobInput?: string | null): {
  valid: boolean;
  age: number | null;
  error?: string;
} {
  if (!dobInput || !dobInput.trim()) {
    return { valid: true, age: null };
  }

  const age = calculateAge(dobInput);
  if (age === null) {
    return {
      valid: false,
      age: null,
      error: "Please enter a valid date of birth.",
    };
  }

  if (age < MIN_DONOR_AGE) {
    return {
      valid: false,
      age,
      error: `Donor must be at least ${MIN_DONOR_AGE} years old to register (calculated age: ${age}).`,
    };
  }

  if (age > MAX_DONOR_AGE) {
    return {
      valid: false,
      age,
      error: `Donor age cannot exceed ${MAX_DONOR_AGE} years (calculated age: ${age}).`,
    };
  }

  return { valid: true, age };
}

/**
 * Returns formatted YYYY-MM-DD boundaries for HTML <input type="date">
 * Min: earliest birth date where age is <= 70
 * Max: latest birth date where age is >= 18
 */
export function getDonorDobBounds(): { min: string; max: string } {
  const today = new Date();

  // Earliest allowable DOB (where age does not exceed 70 today)
  const minDate = new Date(today.getFullYear() - MAX_DONOR_AGE - 1, today.getMonth(), today.getDate() + 1);
  // Latest allowable DOB (must have already reached age 18 today)
  const maxDate = new Date(today.getFullYear() - MIN_DONOR_AGE, today.getMonth(), today.getDate());

  const pad = (n: number) => String(n).padStart(2, "0");
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return {
    min: formatDate(minDate),
    max: formatDate(maxDate),
  };
}
