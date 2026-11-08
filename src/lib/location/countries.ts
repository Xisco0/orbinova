/**
 * ORBINOVA GLOBAL LOCATION SYSTEM - COUNTRIES
 * Authoritative ISO 3166-1 country definitions, dial codes, default coordinates, and units.
 */

export interface GlobalCountry {
  code: string; // ISO 2-letter code
  name: string;
  dialCode: string;
  defaultUnit: "km" | "mi";
  defaultLatitude: number;
  defaultLongitude: number;
  postalCodeRequired: boolean;
  regionLabel: string; // e.g., "State", "Province", "Region", "County"
}

export const GLOBAL_COUNTRIES: GlobalCountry[] = [
  {
    code: "NG",
    name: "Nigeria",
    dialCode: "+234",
    defaultUnit: "km",
    defaultLatitude: 9.0820,
    defaultLongitude: 8.6753,
    postalCodeRequired: false,
    regionLabel: "State",
  },
  {
    code: "US",
    name: "United States",
    dialCode: "+1",
    defaultUnit: "mi",
    defaultLatitude: 37.0902,
    defaultLongitude: -95.7129,
    postalCodeRequired: true,
    regionLabel: "State",
  },
  {
    code: "GB",
    name: "United Kingdom",
    dialCode: "+44",
    defaultUnit: "mi",
    defaultLatitude: 55.3781,
    defaultLongitude: -3.4360,
    postalCodeRequired: true,
    regionLabel: "Region / Country",
  },
  {
    code: "CA",
    name: "Canada",
    dialCode: "+1",
    defaultUnit: "km",
    defaultLatitude: 56.1304,
    defaultLongitude: -106.3468,
    postalCodeRequired: true,
    regionLabel: "Province / Territory",
  },
  {
    code: "GH",
    name: "Ghana",
    dialCode: "+233",
    defaultUnit: "km",
    defaultLatitude: 7.9465,
    defaultLongitude: -1.0232,
    postalCodeRequired: false,
    regionLabel: "Region",
  },
  {
    code: "KE",
    name: "Kenya",
    dialCode: "+254",
    defaultUnit: "km",
    defaultLatitude: -0.0236,
    defaultLongitude: 37.9062,
    postalCodeRequired: false,
    regionLabel: "County",
  },
  {
    code: "ZA",
    name: "South Africa",
    dialCode: "+27",
    defaultUnit: "km",
    defaultLatitude: -30.5595,
    defaultLongitude: 22.9375,
    postalCodeRequired: true,
    regionLabel: "Province",
  },
  {
    code: "IN",
    name: "India",
    dialCode: "+91",
    defaultUnit: "km",
    defaultLatitude: 20.5937,
    defaultLongitude: 78.9629,
    postalCodeRequired: true,
    regionLabel: "State / UT",
  },
  {
    code: "AU",
    name: "Australia",
    dialCode: "+61",
    defaultUnit: "km",
    defaultLatitude: -25.2744,
    defaultLongitude: 133.7751,
    postalCodeRequired: true,
    regionLabel: "State / Territory",
  },
  {
    code: "DE",
    name: "Germany",
    dialCode: "+49",
    defaultUnit: "km",
    defaultLatitude: 51.1657,
    defaultLongitude: 10.4515,
    postalCodeRequired: true,
    regionLabel: "Federal State",
  },
  {
    code: "FR",
    name: "France",
    dialCode: "+33",
    defaultUnit: "km",
    defaultLatitude: 46.2276,
    defaultLongitude: 2.2137,
    postalCodeRequired: true,
    regionLabel: "Region / Department",
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    dialCode: "+971",
    defaultUnit: "km",
    defaultLatitude: 23.4241,
    defaultLongitude: 53.8478,
    postalCodeRequired: false,
    regionLabel: "Emirate",
  },
  {
    code: "BR",
    name: "Brazil",
    dialCode: "+55",
    defaultUnit: "km",
    defaultLatitude: -14.2350,
    defaultLongitude: -51.9253,
    postalCodeRequired: true,
    regionLabel: "State",
  },
  {
    code: "JP",
    name: "Japan",
    dialCode: "+81",
    defaultUnit: "km",
    defaultLatitude: 36.2048,
    defaultLongitude: 138.2529,
    postalCodeRequired: true,
    regionLabel: "Prefecture",
  },
  {
    code: "RW",
    name: "Rwanda",
    dialCode: "+250",
    defaultUnit: "km",
    defaultLatitude: -1.9403,
    defaultLongitude: 29.8739,
    postalCodeRequired: false,
    regionLabel: "Province",
  },
  {
    code: "UG",
    name: "Uganda",
    dialCode: "+256",
    defaultUnit: "km",
    defaultLatitude: 1.3733,
    defaultLongitude: 32.2903,
    postalCodeRequired: false,
    regionLabel: "District",
  },
  {
    code: "EG",
    name: "Egypt",
    dialCode: "+20",
    defaultUnit: "km",
    defaultLatitude: 26.8206,
    defaultLongitude: 30.8025,
    postalCodeRequired: true,
    regionLabel: "Governorate",
  },
  {
    code: "IE",
    name: "Ireland",
    dialCode: "+353",
    defaultUnit: "km",
    defaultLatitude: 53.1424,
    defaultLongitude: -7.6921,
    postalCodeRequired: true,
    regionLabel: "County",
  },
  {
    code: "SG",
    name: "Singapore",
    dialCode: "+65",
    defaultUnit: "km",
    defaultLatitude: 1.3521,
    defaultLongitude: 103.8198,
    postalCodeRequired: true,
    regionLabel: "District",
  },
];

export type CountryInfo = GlobalCountry;

export function getCountryByCode(code?: string | null): GlobalCountry | undefined {
  return findCountry(code);
}

/**
 * Returns all supported countries sorted alphabetically.
 */
export function getAllCountries(): GlobalCountry[] {
  return [...GLOBAL_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Finds country metadata by name, code, or dial code.
 */
export function findCountry(query?: string | null): GlobalCountry | undefined {
  if (!query) return undefined;
  const normalized = query.trim().toLowerCase();
  return GLOBAL_COUNTRIES.find(
    (c) =>
      c.code.toLowerCase() === normalized ||
      c.name.toLowerCase() === normalized ||
      c.dialCode.toLowerCase() === normalized
  );
}

/**
 * Returns default country (Nigeria fallback if none specified).
 */
export function getDefaultCountry(): GlobalCountry {
  return GLOBAL_COUNTRIES[0];
}
