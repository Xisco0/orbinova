import { DonorAvailability } from "@/types/database";

/**
 * Calculates normalized availability score between 0.0000 and 1.0000.
 */
export function calculateAvailabilityScore(status: DonorAvailability): number {
  switch (status) {
    case "available":
      return 1.0;
    case "temporarily_unavailable":
      return 0.0;
    case "unavailable":
      return 0.0;
    default:
      return 0.0;
  }
}
