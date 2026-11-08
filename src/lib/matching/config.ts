/**
 * SmartDonor Matching Engine Configuration
 * Authoritative constants and validated weights for the 4-factor matching algorithm.
 */

export interface MatchingWeights {
  compatibility: number;
  distance: number;
  availability: number;
  urgency: number;
}

export interface MatchingEngineConfig {
  weights: MatchingWeights;
  defaultRadiusKm: number;
  maxRadiusKm: number;
  progressiveRadiiKm?: readonly number[];
  progressiveRadiiMi?: readonly number[];
  initialBatchSize: number;
  nextBatchSize: number;
  defaultRequestExpiryHours: {
    emergency: number;
    urgent: number;
    normal: number;
  };
}

export const MATCHING_CONFIG: MatchingEngineConfig = {
  weights: {
    compatibility: 0.40, // 40%
    distance: 0.25,      // 25%
    availability: 0.20,  // 20%
    urgency: 0.15,       // 15%
  },
  defaultRadiusKm: 50,    // Standard search radius in kilometers
  maxRadiusKm: 250,       // Maximum permissible radius expansion
  progressiveRadiiKm: [10, 25, 50, 100, 250] as const, // Progressive distance tiers
  progressiveRadiiMi: [5, 15, 30, 60, 150] as const,   // Progressive distance tiers in miles
  initialBatchSize: 5,    // Highest-ranked candidates contacted in Stage 1
  nextBatchSize: 5,       // Subsequent candidates contacted if Stage 1 yields insufficient responses
  defaultRequestExpiryHours: {
    emergency: 4,         // 4 hours for Level-1 emergencies
    urgent: 12,           // 12 hours for urgent cases
    normal: 48,           // 48 hours for routine requests
  },
};

/**
 * Validates that all weights sum to exactly 1.00 and are within [0, 1] range.
 */
export function validateMatchingConfig(config: MatchingEngineConfig = MATCHING_CONFIG): boolean {
  const { compatibility, distance, availability, urgency } = config.weights;

  if (
    compatibility < 0 || compatibility > 1 ||
    distance < 0 || distance > 1 ||
    availability < 0 || availability > 1 ||
    urgency < 0 || urgency > 1
  ) {
    throw new Error("Invalid matching weights: All weights must be between 0.00 and 1.00");
  }

  const sum = Number((compatibility + distance + availability + urgency).toFixed(4));
  if (sum !== 1.0) {
    throw new Error(`Invalid matching weights: Sum of weights must equal 1.00 (Current sum: ${sum})`);
  }

  if (config.defaultRadiusKm <= 0 || config.initialBatchSize <= 0) {
    throw new Error("Invalid operational parameters: Radius and batch size must be positive numbers");
  }

  return true;
}

// Self-validate upon initialization
validateMatchingConfig();
