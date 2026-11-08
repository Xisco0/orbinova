import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines Tailwind classes safely with clsx and twMerge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string into readable Nigerian / international format.
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/**
 * Formats a phone number for display.
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  return phone;
}
