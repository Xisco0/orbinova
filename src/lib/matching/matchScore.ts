import { MATCHING_CONFIG, MatchingWeights } from "./config";

export interface MatchScoreInput {
  compatibilityScore: number;
  distanceScore: number;
  availabilityScore: number;
  urgencyScore: number;
  customWeights?: MatchingWeights;
}

export interface MatchScoreBreakdown {
  compatibilityScore: number;
  distanceScore: number;
  availabilityScore: number;
  urgencyScore: number;
  finalScore: number;
  displayPercentage: number; // e.g. 95%
  weightedComponents: {
    compatibilityWeighted: number;
    distanceWeighted: number;
    availabilityWeighted: number;
    urgencyWeighted: number;
  };
}

/**
 * Calculates the exact weighted 4-factor matching score normalized between 0.0000 and 1.0000.
 * Formula:
 * Final Score = (Compatibility * 0.40) + (Distance * 0.25) + (Availability * 0.20) + (Urgency * 0.15)
 */
export function calculateMatchScore(input: MatchScoreInput): MatchScoreBreakdown {
  const weights = input.customWeights || MATCHING_CONFIG.weights;

  // Clamp all inputs strictly between 0.0000 and 1.0000
  const clamp = (val: number) => Math.max(0.0, Math.min(1.0, val || 0));

  const comp = clamp(input.compatibilityScore);
  const dist = clamp(input.distanceScore);
  const avail = clamp(input.availabilityScore);
  const urg = clamp(input.urgencyScore);

  const compatibilityWeighted = comp * weights.compatibility;
  const distanceWeighted = dist * weights.distance;
  const availabilityWeighted = avail * weights.availability;
  const urgencyWeighted = urg * weights.urgency;

  const rawFinalScore = compatibilityWeighted + distanceWeighted + availabilityWeighted + urgencyWeighted;
  const finalScore = Number(Math.max(0.0, Math.min(1.0, rawFinalScore)).toFixed(4));
  const displayPercentage = Math.round(finalScore * 100);

  return {
    compatibilityScore: comp,
    distanceScore: dist,
    availabilityScore: avail,
    urgencyScore: urg,
    finalScore,
    displayPercentage,
    weightedComponents: {
      compatibilityWeighted: Number(compatibilityWeighted.toFixed(4)),
      distanceWeighted: Number(distanceWeighted.toFixed(4)),
      availabilityWeighted: Number(availabilityWeighted.toFixed(4)),
      urgencyWeighted: Number(urgencyWeighted.toFixed(4)),
    },
  };
}
