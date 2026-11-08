import { RequestUrgency } from "@/types/database";

/**
 * Calculates deterministic normalized urgency score between 0.0000 and 1.0000.
 */
export function calculateUrgencyScore(urgency: RequestUrgency): number {
  switch (urgency) {
    case "emergency":
      return 1.00; // 100% urgency factor for Level-1 trauma/maternal emergency
    case "urgent":
      return 0.75; // 75% urgency factor for planned urgent transfusion
    case "normal":
      return 0.50; // 50% baseline for routine replenishment
    default:
      return 0.50;
  }
}
