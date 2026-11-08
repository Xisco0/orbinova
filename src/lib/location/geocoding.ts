/**
 * ORBINOVA Global Location Management - Geocoding & Distance Utilities
 *
 * Provides:
 * 1. High-accuracy Haversine distance calculations (km and miles).
 * 2. Coordinate boundary validation (-90 <= lat <= 90, -180 <= lng <= 180).
 * 3. Privacy-preserving coordinate approximation / fuzzing for donor confidentiality.
 * 4. Coordinate formatting and distance progressive tier evaluation.
 */

import { getCountryByCode } from "./countries";
import { getAdministrativeData } from "./regions";

export type DistanceUnit = "km" | "mi";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DistanceResult {
  distance: number;
  unit: DistanceUnit;
  formatted: string;
}

/**
 * Validates whether latitude and longitude are within standard geographic bounds.
 */
export function isValidCoordinates(lat?: number | null, lng?: number | null): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  if (isNaN(lat) || isNaN(lng)) {
    return false;
  }
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param origin Latitude/Longitude of origin (e.g. Hospital or Blood Request)
 * @param target Latitude/Longitude of target (e.g. Donor or Blood Bank)
 * @param unit Distance unit ("km" or "mi", defaults to "km")
 */
export function calculateHaversineDistance(
  origin: Coordinates,
  target: Coordinates,
  unit: DistanceUnit = "km"
): number {
  if (!isValidCoordinates(origin.latitude, origin.longitude) || !isValidCoordinates(target.latitude, target.longitude)) {
    return Infinity;
  }

  // Earth's radius in kilometers and miles
  const EARTH_RADIUS_KM = 6371.0;
  const EARTH_RADIUS_MI = 3958.8;
  const radius = unit === "mi" ? EARTH_RADIUS_MI : EARTH_RADIUS_KM;

  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(target.latitude - origin.latitude);
  const dLng = toRad(target.longitude - origin.longitude);

  const lat1 = toRad(origin.latitude);
  const lat2 = toRad(target.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawDistance = radius * c;

  // Return distance rounded to 1 decimal place
  return Math.round(rawDistance * 10) / 10;
}

/**
 * Converts distance between kilometers and miles
 */
export function convertDistance(distance: number, from: DistanceUnit, to: DistanceUnit): number {
  if (from === to) return distance;
  if (from === "km" && to === "mi") {
    return Math.round(distance * 0.621371 * 10) / 10;
  }
  return Math.round(distance * 1.60934 * 10) / 10;
}

/**
 * Determines the preferred distance unit for a country
 */
export function getPreferredUnitForCountry(countryCode?: string): DistanceUnit {
  if (!countryCode) return "km";
  const country = getCountryByCode(countryCode);
  return country?.defaultUnit || "km";
}

/**
 * Formats a distance with its appropriate unit label
 */
export function formatDistance(distance: number, unit: DistanceUnit = "km"): string {
  if (!isFinite(distance)) return "Unknown distance";
  return `${distance} ${unit === "mi" ? "miles" : "km"}`;
}

/**
 * PRIVACY SAFEGUARD: Fuzzes coordinates for voluntary donors to prevent
 * exact home/residential tracking while preserving city/district matching accuracy.
 *
 * Truncates coordinate precision to ~2 decimal places (~1.1 km grid resolution)
 * and applies a deterministic slight offset based on the seed (e.g. donor ID).
 */
export function approximateDonorCoordinates(
  coords: Coordinates,
  seed?: string
): Coordinates {
  if (!isValidCoordinates(coords.latitude, coords.longitude)) {
    return coords;
  }

  // 2 decimal places = ~1.1km resolution at equator
  // Adds slight deterministic jitter (±0.005 deg ≈ ±500m) to prevent exact grid reversal
  let jitterLat = 0;
  let jitterLng = 0;

  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    jitterLat = ((hash % 100) / 10000); // ±0.01
    jitterLng = (((hash >> 4) % 100) / 10000);
  }

  const fuzzedLat = Math.round((coords.latitude + jitterLat) * 100) / 100;
  const fuzzedLng = Math.round((coords.longitude + jitterLng) * 100) / 100;

  return {
    latitude: fuzzedLat,
    longitude: fuzzedLng,
  };
}

/**
 * Progressive matching radii tiers (in kilometers)
 */
export const MATCHING_PROGRESSIVE_RADII_KM = [10, 25, 50, 100, 250] as const;

/**
 * Progressive matching radii tiers (in miles)
 */
export const MATCHING_PROGRESSIVE_RADII_MI = [5, 15, 30, 60, 150] as const;

/**
 * Returns the matching search radius for a given expansion tier index (0 to 4)
 */
export function getMatchingRadius(tierIndex: number, unit: DistanceUnit = "km"): number {
  if (unit === "mi") {
    const list = MATCHING_PROGRESSIVE_RADII_MI;
    return list[Math.min(tierIndex, list.length - 1)];
  }
  const list = MATCHING_PROGRESSIVE_RADII_KM;
  return list[Math.min(tierIndex, list.length - 1)];
}

/**
 * Geocodes an administrative location fallback from local curated databases
 */
export function getFallbackCoordinates(
  countryCode: string,
  regionName?: string,
  cityName?: string
): Coordinates | null {
  const adminData = getAdministrativeData(countryCode);
  const country = getCountryByCode(countryCode);

  if (regionName && adminData) {
    const region = adminData.regions.find(
      (r: any) =>
        r.name.toLowerCase() === regionName.toLowerCase() ||
        (r.code && r.code.toLowerCase() === regionName.toLowerCase())
    );

    if (region) {
      if (cityName && region.cities) {
        const city = region.cities.find(
          (c: any) => c.name.toLowerCase() === cityName.toLowerCase()
        );
        if (city?.coordinates) {
          return city.coordinates;
        }
      }
      if (region.coordinates) {
        return region.coordinates;
      }
    }
  }

  if (country) {
    return {
      latitude: country.defaultLatitude,
      longitude: country.defaultLongitude,
    };
  }

  return null;
}
