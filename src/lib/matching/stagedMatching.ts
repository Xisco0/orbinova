import { MATCHING_CONFIG } from "./config";
import { MatchScoreBreakdown } from "./matchScore";
import { CandidateDonor } from "./candidateFilter";

export interface RankedCandidate {
  donor: CandidateDonor;
  distanceKm: number | null;
  scoreBreakdown: MatchScoreBreakdown;
  rankingPosition: number;
}

export interface StagedBatchResult {
  selectedCandidates: RankedCandidate[];
  remainingUnitsNeeded: number;
  isFulfilled: boolean;
  matchingState: "fulfilled" | "matching" | "exhausted" | "pending";
}

/**
 * Selects an appropriately sized batch of top-ranked candidate donors based on remaining unit requirements.
 * Avoids overwhelming or over-notifying donors when units are partially fulfilled or when responses are pending.
 */
export function selectStagedMatchBatch(
  rankedCandidates: RankedCandidate[],
  unitsRequired: number,
  unitsFulfilled: number,
  existingActiveRequestCount: number = 0,
  batchSize: number = MATCHING_CONFIG.initialBatchSize
): StagedBatchResult {
  const remainingUnitsNeeded = Math.max(0, unitsRequired - unitsFulfilled);

  if (remainingUnitsNeeded <= 0) {
    return {
      selectedCandidates: [],
      remainingUnitsNeeded: 0,
      isFulfilled: true,
      matchingState: "fulfilled",
    };
  }

  // If there are already enough pending candidate requests dispatched, throttle new batch
  const desiredTotalDispatches = remainingUnitsNeeded * 2; // e.g. 2 candidate dispatches per needed unit
  const dispatchesNeeded = Math.max(0, desiredTotalDispatches - existingActiveRequestCount);
  const effectiveBatchSize = Math.min(batchSize, Math.max(1, dispatchesNeeded));

  const selectedCandidates = rankedCandidates.slice(0, effectiveBatchSize);

  let matchingState: "fulfilled" | "matching" | "exhausted" | "pending" = "matching";

  if (selectedCandidates.length === 0 && rankedCandidates.length === 0) {
    matchingState = "exhausted";
  }

  return {
    selectedCandidates,
    remainingUnitsNeeded,
    isFulfilled: false,
    matchingState,
  };
}
