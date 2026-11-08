import { MATCHING_CONFIG } from "./config";

const EARTH_RADIUS_KM = 6371; // Earth's mean radius in kilometers

/**
 * Calculates geographic Great-Circle distance in kilometers between two sets of coordinates using the Haversine formula.
 */
export function calculateDistance(
  lat1: number | null | undefined,
  lon1: number | null | undefined,
  lat2: number | null | undefined,
  lon2: number | null | undefined
): number | null {
  if (
    lat1 === null || lat1 === undefined ||
    lon1 === null || lon1 === undefined ||
    lat2 === null || lat2 === undefined ||
    lon2 === null || lon2 === undefined
  ) {
    return null;
  }

  // Validate latitude [-90, 90] and longitude [-180, 180]
  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90 || lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
    return null;
  }

  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceKm = EARTH_RADIUS_KM * c;

  // Return rounded to 2 decimal places
  return Number(distanceKm.toFixed(2));
}

/**
 * Calculates a normalized distance score between 0.0000 and 1.0000 based on search radius.
 * Formula: distanceScore = max(0, 1 - (distance / maxRadius))
 */
export function calculateDistanceScore(
  distanceKm: number | null,
  maxRadiusKm: number = MATCHING_CONFIG.defaultRadiusKm
): number {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
    // If coordinates are missing but candidate is in the same city/region, provide baseline score 0.50
    return 0.50;
  }

  if (distanceKm <= 0) {
    return 1.0;
  }

  if (distanceKm >= maxRadiusKm) {
    return 0.0;
  }

  const score = 1.0 - (distanceKm / maxRadiusKm);
  return Number(Math.max(0.0, Math.min(1.0, score)).toFixed(4));
}
