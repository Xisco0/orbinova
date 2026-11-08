import crypto from "crypto";

/**
 * Extracts the surname from a full name string where the surname is entered first.
 * Strips known professional title prefixes (e.g. Dr., Prof., Nurse, Pharm., Mr., Mrs., Ms., Chief).
 *
 * Examples:
 * - "Okafor Kelechi" -> "Okafor"
 * - "Dr. Okafor Kelechi" -> "Okafor"
 * - "Bello, Aisha" -> "Bello"
 * - "Nurse Adeyemi Babatunde" -> "Adeyemi"
 */
export function extractSurname(fullName: string): string {
  if (!fullName) return "Staff";

  // 1. Strip professional title prefix if present
  const titleRegex = /^(dr|prof|nurse|pharm|mr|mrs|ms|chief)\.?\s+/i;
  const withoutTitle = fullName.trim().replace(titleRegex, "").trim();

  // 2. Extract first token (the surname entered first)
  const tokens = withoutTitle.split(/[\s,]+/);
  const rawFirstToken = tokens[0] || "Staff";

  // 3. Keep only alphabetical characters
  const cleanSurname = rawFirstToken.replace(/[^a-zA-Z]/g, "");
  if (!cleanSurname || cleanSurname.length < 2) {
    return "Staff";
  }

  // 4. Normalize casing: Capitalized first letter, lowercase remainder (e.g. Okafor)
  return cleanSurname.charAt(0).toUpperCase() + cleanSurname.slice(1).toLowerCase();
}

/**
 * Generates a unique temporary password using the specification:
 * SURNAME + FOUR CRYPTOGRAPHICALLY RANDOM DIGITS
 *
 * Example:
 * - "Okafor" + "4829" -> "Okafor4829"
 */
export function generateTemporaryPassword(fullNameOrSurname: string): {
  surname: string;
  temporaryPassword: string;
} {
  const surname = extractSurname(fullNameOrSurname);
  // Cryptographically random 4-digit number between 1000 and 9999
  const randomDigits = crypto.randomInt(1000, 10000).toString();
  const temporaryPassword = `${surname}${randomDigits}`;

  return {
    surname,
    temporaryPassword,
  };
}
