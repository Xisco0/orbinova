import { BloodGroupCode } from "@/types/database";
import { isBloodCompatible } from "./bloodCompatibility";

export interface MatchExplanation {
  compatibleBloodType: boolean;
  withinMatchingRadius: boolean;
  currentlyAvailable: boolean;
  eligibleToDonate: boolean;
  bulletPoints: string[];
  summary: string;
}

export interface ExplanationInput {
  donorBloodGroup: BloodGroupCode;
  recipientBloodGroup: BloodGroupCode;
  distanceKm: number | null;
  maxRadiusKm: number;
  availabilityStatus: string;
  eligibilityStatus: string;
}

/**
 * Generates transparent, human-friendly "Why this match?" explanations without exposing raw scoring formulas.
 */
export function generateMatchExplanation(input: ExplanationInput): MatchExplanation {
  const compResult = isBloodCompatible(input.donorBloodGroup, input.recipientBloodGroup);
  const compatibleBloodType = compResult.compatible;
  const withinMatchingRadius = input.distanceKm !== null ? input.distanceKm <= input.maxRadiusKm : true;
  const currentlyAvailable = input.availabilityStatus === "available";
  const eligibleToDonate = input.eligibilityStatus === "eligible";

  const bulletPoints: string[] = [];

  if (compatibleBloodType) {
    bulletPoints.push(`Compatible blood type (Group ${input.donorBloodGroup} for recipient ${input.recipientBloodGroup})`);
  }

  if (withinMatchingRadius) {
    bulletPoints.push(
      input.distanceKm !== null
        ? `Located within search area (~${input.distanceKm} km away)`
        : "Located in the hospital's registered service area"
    );
  }

  if (currentlyAvailable) {
    bulletPoints.push("Currently marked as available to respond");
  }

  if (eligibleToDonate) {
    bulletPoints.push("Meets standard health and recovery interval guidelines");
  }

  return {
    compatibleBloodType,
    withinMatchingRadius,
    currentlyAvailable,
    eligibleToDonate,
    bulletPoints,
    summary: bulletPoints.join(" • "),
  };
}
