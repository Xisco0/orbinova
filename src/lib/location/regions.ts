/**
 * ORBINOVA GLOBAL LOCATION SYSTEM - REGIONS & ADMINISTRATIVE DIVISIONS
 * Dynamic mapping of States, Provinces, Regions, Counties, and Cities worldwide.
 */

export interface AdministrativeRegion {
  name: string;
  code?: string;
  majorCities: string[];
  defaultLatitude?: number;
  defaultLongitude?: number;
}

export const COUNTRY_REGIONS: Record<string, AdministrativeRegion[]> = {
  // Nigeria (36 States + FCT)
  NG: [
    { name: "Lagos", code: "LA", majorCities: ["Lagos", "Ikeja", "Surulere", "Yaba", "Victoria Island", "Lekki", "Ikorodu", "Epe"], defaultLatitude: 6.5244, defaultLongitude: 3.3792 },
    { name: "Abuja (FCT)", code: "FC", majorCities: ["Abuja", "Garki", "Wuse", "Maitama", "Gwarinpa", "Kubwa", "Asokoro"], defaultLatitude: 9.0765, defaultLongitude: 7.3986 },
    { name: "Oyo", code: "OY", majorCities: ["Ibadan", "Ogbomoso", "Oyo", "Iseyin"], defaultLatitude: 7.3775, defaultLongitude: 3.9470 },
    { name: "Rivers", code: "RI", majorCities: ["Port Harcourt", "Obio-Akpor", "Bonny", "Eleme"], defaultLatitude: 4.8156, defaultLongitude: 7.0498 },
    { name: "Kano", code: "KN", majorCities: ["Kano", "Wudil", "Gwarzo"], defaultLatitude: 12.0022, defaultLongitude: 8.5920 },
    { name: "Kaduna", code: "KD", majorCities: ["Kaduna", "Zaria", "Kafanchan"], defaultLatitude: 10.5105, defaultLongitude: 7.4165 },
    { name: "Enugu", code: "EN", majorCities: ["Enugu", "Nsukka", "Awgu"], defaultLatitude: 6.4584, defaultLongitude: 7.5464 },
    { name: "Edo", code: "ED", majorCities: ["Benin City", "Auchi", "Ekpoma"], defaultLatitude: 6.3350, defaultLongitude: 5.6037 },
    { name: "Anambra", code: "AN", majorCities: ["Awka", "Onitsha", "Nnewi"], defaultLatitude: 6.2209, defaultLongitude: 7.0723 },
    { name: "Ogun", code: "OG", majorCities: ["Abeokuta", "Ijebu Ode", "Sagamu", "Ota"], defaultLatitude: 7.1475, defaultLongitude: 3.3619 },
    { name: "Delta", code: "DE", majorCities: ["Asaba", "Warri", "Ughelli", "Sapele"], defaultLatitude: 6.1984, defaultLongitude: 6.7329 },
    { name: "Akwa Ibom", code: "AK", majorCities: ["Uyo", "Eket", "Ikot Ekpene"], defaultLatitude: 5.0377, defaultLongitude: 7.9128 },
    { name: "Plateau", code: "PL", majorCities: ["Jos", "Bukuru", "Pankshin"], defaultLatitude: 9.8965, defaultLongitude: 8.8583 },
    { name: "Ondo", code: "ON", majorCities: ["Akure", "Ondo Town", "Owo"], defaultLatitude: 7.2571, defaultLongitude: 5.2058 },
    { name: "Osun", code: "OS", majorCities: ["Osogbo", "Ile-Ife", "Ilesa", "Ede"], defaultLatitude: 7.7827, defaultLongitude: 4.5418 },
    { name: "Cross River", code: "CR", majorCities: ["Calabar", "Ikom", "Ogoja"], defaultLatitude: 4.9757, defaultLongitude: 8.3417 },
    { name: "Imo", code: "IM", majorCities: ["Owerri", "Orlu", "Okigwe"], defaultLatitude: 5.4836, defaultLongitude: 7.0333 },
    { name: "Abia", code: "AB", majorCities: ["Umuahia", "Aba", "Ohafia"], defaultLatitude: 5.5249, defaultLongitude: 7.4946 },
    { name: "Benue", code: "BE", majorCities: ["Makurdi", "Gboko", "Otukpo"], defaultLatitude: 7.7322, defaultLongitude: 8.5214 },
    { name: "Kwara", code: "KW", majorCities: ["Ilorin", "Offa", "Omu-Aran"], defaultLatitude: 8.4966, defaultLongitude: 4.5421 },
    { name: "Borno", code: "BO", majorCities: ["Maiduguri", "Biu"], defaultLatitude: 11.8333, defaultLongitude: 13.1500 },
    { name: "Bauchi", code: "BA", majorCities: ["Bauchi", "Azare", "Misau"], defaultLatitude: 10.3158, defaultLongitude: 9.8442 },
    { name: "Bayelsa", code: "BY", majorCities: ["Yenagoa", "Brass", "Ogbia"], defaultLatitude: 4.9267, defaultLongitude: 6.2676 },
    { name: "Adamawa", code: "AD", majorCities: ["Yola", "Mubi", "Jimeta"], defaultLatitude: 9.2094, defaultLongitude: 12.4818 },
    { name: "Ekiti", code: "EK", majorCities: ["Ado Ekiti", "Ikere Ekiti", "Ijero"], defaultLatitude: 7.6210, defaultLongitude: 5.2215 },
    { name: "Kogi", code: "KO", majorCities: ["Lokoja", "Okene", "Kabba"], defaultLatitude: 7.7969, defaultLongitude: 6.7405 },
    { name: "Nasarawa", code: "NA", majorCities: ["Lafia", "Keffi", "Akwanga"], defaultLatitude: 8.4998, defaultLongitude: 8.5153 },
    { name: "Niger", code: "NI", majorCities: ["Minna", "Suleja", "Bida", "Kontagora"], defaultLatitude: 9.6139, defaultLongitude: 6.5569 },
    { name: "Sokoto", code: "SO", majorCities: ["Sokoto", "Tambuwal"], defaultLatitude: 13.0609, defaultLongitude: 5.2476 },
    { name: "Taraba", code: "TA", majorCities: ["Jalingo", "Wukari", "Bali"], defaultLatitude: 8.8937, defaultLongitude: 11.3606 },
    { name: "Yobe", code: "YO", majorCities: ["Damaturu", "Potiskum", "Gashua"], defaultLatitude: 11.7470, defaultLongitude: 11.9608 },
    { name: "Zamfara", code: "ZA", majorCities: ["Gusau", "Kaura Namoda"], defaultLatitude: 12.1628, defaultLongitude: 6.6613 },
    { name: "Kebbi", code: "KE", majorCities: ["Birnin Kebbi", "Argungu", "Yauri"], defaultLatitude: 12.4539, defaultLongitude: 4.1975 },
    { name: "Jigawa", code: "JI", majorCities: ["Dutse", "Hadejia", "Kazaure"], defaultLatitude: 11.7583, defaultLongitude: 9.3389 },
    { name: "Katsina", code: "KT", majorCities: ["Katsina", "Daura", "Funtua"], defaultLatitude: 12.9889, defaultLongitude: 7.6006 },
    { name: "Gombe", code: "GO", majorCities: ["Gombe", "Kaltungo"], defaultLatitude: 10.2897, defaultLongitude: 11.1673 },
    { name: "Ebonyi", code: "EB", majorCities: ["Abakaliki", "Afikpo"], defaultLatitude: 6.3249, defaultLongitude: 8.1137 },
  ],

  // United States (All 50 States + DC)
  US: [
    { name: "Alabama", code: "AL", majorCities: ["Birmingham", "Montgomery", "Mobile", "Huntsville"] },
    { name: "Alaska", code: "AK", majorCities: ["Anchorage", "Fairbanks", "Juneau"] },
    { name: "Arizona", code: "AZ", majorCities: ["Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale"] },
    { name: "Arkansas", code: "AR", majorCities: ["Little Rock", "Fort Smith", "Fayetteville"] },
    { name: "California", code: "CA", majorCities: ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Sacramento"], defaultLatitude: 36.7783, defaultLongitude: -119.4179 },
    { name: "Colorado", code: "CO", majorCities: ["Denver", "Colorado Springs", "Aurora", "Fort Collins"] },
    { name: "Connecticut", code: "CT", majorCities: ["Bridgeport", "New Haven", "Stamford", "Hartford"] },
    { name: "Delaware", code: "DE", majorCities: ["Wilmington", "Dover", "Newark"] },
    { name: "District of Columbia", code: "DC", majorCities: ["Washington"] },
    { name: "Florida", code: "FL", majorCities: ["Miami", "Orlando", "Tampa", "Jacksonville", "Tallahassee"], defaultLatitude: 27.6648, defaultLongitude: -81.5158 },
    { name: "Georgia", code: "GA", majorCities: ["Atlanta", "Augusta", "Savannah", "Columbus"], defaultLatitude: 32.1656, defaultLongitude: -82.9001 },
    { name: "Hawaii", code: "HI", majorCities: ["Honolulu", "Pearl City", "Hilo"] },
    { name: "Idaho", code: "ID", majorCities: ["Boise", "Meridian", "Nampa"] },
    { name: "Illinois", code: "IL", majorCities: ["Chicago", "Aurora", "Naperville", "Springfield"], defaultLatitude: 40.6331, defaultLongitude: -89.3985 },
    { name: "Indiana", code: "IN", majorCities: ["Indianapolis", "Fort Wayne", "Evansville"] },
    { name: "Iowa", code: "IA", majorCities: ["Des Moines", "Cedar Rapids", "Davenport"] },
    { name: "Kansas", code: "KS", majorCities: ["Wichita", "Overland Park", "Kansas City"] },
    { name: "Kentucky", code: "KY", majorCities: ["Louisville", "Lexington", "Bowling Green"] },
    { name: "Louisiana", code: "LA", majorCities: ["New Orleans", "Baton Rouge", "Shreveport"] },
    { name: "Maine", code: "ME", majorCities: ["Portland", "Lewiston", "Bangor"] },
    { name: "Maryland", code: "MD", majorCities: ["Baltimore", "Frederick", "Rockville"] },
    { name: "Massachusetts", code: "MA", majorCities: ["Boston", "Cambridge", "Worcester", "Springfield"], defaultLatitude: 42.4072, defaultLongitude: -71.3824 },
    { name: "Michigan", code: "MI", majorCities: ["Detroit", "Grand Rapids", "Warren", "Ann Arbor"] },
    { name: "Minnesota", code: "MN", majorCities: ["Minneapolis", "Saint Paul", "Rochester"] },
    { name: "Mississippi", code: "MS", majorCities: ["Jackson", "Gulfport", "Southaven"] },
    { name: "Missouri", code: "MO", majorCities: ["Kansas City", "Saint Louis", "Springfield"] },
    { name: "Montana", code: "MT", majorCities: ["Billings", "Missoula", "Great Falls"] },
    { name: "Nebraska", code: "NE", majorCities: ["Omaha", "Lincoln", "Bellevue"] },
    { name: "Nevada", code: "NV", majorCities: ["Las Vegas", "Henderson", "Reno"] },
    { name: "New Hampshire", code: "NH", majorCities: ["Manchester", "Nashua", "Concord"] },
    { name: "New Jersey", code: "NJ", majorCities: ["Newark", "Jersey City", "Paterson"] },
    { name: "New Mexico", code: "NM", majorCities: ["Albuquerque", "Las Cruces", "Rio Rancho"] },
    { name: "New York", code: "NY", majorCities: ["New York City", "Buffalo", "Rochester", "Albany", "Syracuse"], defaultLatitude: 40.7128, defaultLongitude: -74.0060 },
    { name: "North Carolina", code: "NC", majorCities: ["Charlotte", "Raleigh", "Greensboro", "Durham"] },
    { name: "North Dakota", code: "ND", majorCities: ["Fargo", "Bismarck", "Grand Forks"] },
    { name: "Ohio", code: "OH", majorCities: ["Columbus", "Cleveland", "Cincinnati", "Toledo"] },
    { name: "Oklahoma", code: "OK", majorCities: ["Oklahoma City", "Tulsa", "Norman"] },
    { name: "Oregon", code: "OR", majorCities: ["Portland", "Salem", "Eugene"] },
    { name: "Pennsylvania", code: "PA", majorCities: ["Philadelphia", "Pittsburgh", "Allentown", "Harrisburg"], defaultLatitude: 41.2033, defaultLongitude: -77.1945 },
    { name: "Rhode Island", code: "RI", majorCities: ["Providence", "Warwick", "Cranston"] },
    { name: "South Carolina", code: "SC", majorCities: ["Charleston", "Columbia", "North Charleston"] },
    { name: "South Dakota", code: "SD", majorCities: ["Sioux Falls", "Rapid City", "Aberdeen"] },
    { name: "Tennessee", code: "TN", majorCities: ["Nashville", "Memphis", "Knoxville", "Chattanooga"] },
    { name: "Texas", code: "TX", majorCities: ["Houston", "Austin", "Dallas", "San Antonio", "Fort Worth"], defaultLatitude: 31.9686, defaultLongitude: -99.9018 },
    { name: "Utah", code: "UT", majorCities: ["Salt Lake City", "West Valley City", "Provo"] },
    { name: "Vermont", code: "VT", majorCities: ["Burlington", "South Burlington", "Rutland"] },
    { name: "Virginia", code: "VA", majorCities: ["Virginia Beach", "Norfolk", "Chesapeake", "Richmond"] },
    { name: "Washington", code: "WA", majorCities: ["Seattle", "Spokane", "Tacoma", "Olympia"], defaultLatitude: 47.7511, defaultLongitude: -120.7401 },
    { name: "West Virginia", code: "WV", majorCities: ["Charleston", "Huntington", "Morgantown"] },
    { name: "Wisconsin", code: "WI", majorCities: ["Milwaukee", "Madison", "Green Bay"] },
    { name: "Wyoming", code: "WY", majorCities: ["Cheyenne", "Casper", "Laramie"] },
  ],

  // United Kingdom
  GB: [
    { name: "Greater London", code: "LDN", majorCities: ["London", "Westminster", "Camden", "Greenwich", "Croydon"], defaultLatitude: 51.5074, defaultLongitude: -0.1278 },
    { name: "West Midlands", code: "WMD", majorCities: ["Birmingham", "Coventry", "Wolverhampton", "Solihull"], defaultLatitude: 52.4862, defaultLongitude: -1.8904 },
    { name: "Greater Manchester", code: "MAN", majorCities: ["Manchester", "Salford", "Bolton", "Stockport"], defaultLatitude: 53.4808, defaultLongitude: -2.2426 },
    { name: "West Yorkshire", code: "WYK", majorCities: ["Leeds", "Bradford", "Wakefield", "Huddersfield"], defaultLatitude: 53.8008, defaultLongitude: -1.5491 },
    { name: "Scotland", code: "SCT", majorCities: ["Edinburgh", "Glasgow", "Aberdeen", "Dundee"], defaultLatitude: 55.9533, defaultLongitude: -3.1883 },
    { name: "Wales", code: "WLS", majorCities: ["Cardiff", "Swansea", "Newport"], defaultLatitude: 51.4816, defaultLongitude: -3.1791 },
    { name: "Northern Ireland", code: "NIR", majorCities: ["Belfast", "Derry", "Lisburn"], defaultLatitude: 54.5973, defaultLongitude: -5.9301 },
  ],

  // Canada
  CA: [
    { name: "Ontario", code: "ON", majorCities: ["Toronto", "Ottawa", "Mississauga", "Hamilton", "London"], defaultLatitude: 43.6532, defaultLongitude: -79.3832 },
    { name: "Quebec", code: "QC", majorCities: ["Montreal", "Quebec City", "Laval", "Gatineau"], defaultLatitude: 46.8139, defaultLongitude: -71.2080 },
    { name: "British Columbia", code: "BC", majorCities: ["Vancouver", "Victoria", "Surrey", "Burnaby"], defaultLatitude: 49.2827, defaultLongitude: -123.1207 },
    { name: "Alberta", code: "AB", majorCities: ["Calgary", "Edmonton", "Red Deer"], defaultLatitude: 51.0447, defaultLongitude: -114.0719 },
  ],

  // Ghana (All 16 Regions)
  GH: [
    { name: "Greater Accra", code: "GA", majorCities: ["Accra", "Tema", "Madina"], defaultLatitude: 5.6037, defaultLongitude: -0.1870 },
    { name: "Ashanti", code: "AH", majorCities: ["Kumasi", "Obuasi", "Ejisu"], defaultLatitude: 6.6885, defaultLongitude: -1.6244 },
    { name: "Western", code: "WP", majorCities: ["Sekondi-Takoradi", "Tarkwa"], defaultLatitude: 5.1477, defaultLongitude: -2.0469 },
    { name: "Western North", code: "WN", majorCities: ["Sefwi Wiawso", "Bibiani"] },
    { name: "Central", code: "CP", majorCities: ["Cape Coast", "Winneba"], defaultLatitude: 5.1054, defaultLongitude: -1.2466 },
    { name: "Eastern", code: "EP", majorCities: ["Koforidua", "Nkawkaw"] },
    { name: "Volta", code: "VR", majorCities: ["Ho", "Keta", "Hohoe"] },
    { name: "Oti", code: "OT", majorCities: ["Dambai", "Nkwanta"] },
    { name: "Northern", code: "NP", majorCities: ["Tamale", "Yendi"] },
    { name: "Savannah", code: "SV", majorCities: ["Damongo", "Salaga"] },
    { name: "North East", code: "NE", majorCities: ["Nalerigu", "Walewale"] },
    { name: "Upper East", code: "UE", majorCities: ["Bolgatanga", "Navrongo", "Bawku"] },
    { name: "Upper West", code: "UW", majorCities: ["Wa", "Lawra"] },
    { name: "Bono", code: "BO", majorCities: ["Sunyani", "Berekum"] },
    { name: "Bono East", code: "BE", majorCities: ["Techiman", "Kintampo"] },
    { name: "Ahafo", code: "AF", majorCities: ["Goaso", "Duayaw Nkwanta"] },
  ],

  // Kenya (8 Key Regions / Counties)
  KE: [
    { name: "Nairobi County", code: "NRB", majorCities: ["Nairobi", "Westlands", "Kasarani", "Kibra"], defaultLatitude: -1.2921, defaultLongitude: 36.8219 },
    { name: "Mombasa County", code: "MSA", majorCities: ["Mombasa", "Nyali", "Likoni"], defaultLatitude: -4.0435, defaultLongitude: 39.6682 },
    { name: "Kisumu County", code: "KSM", majorCities: ["Kisumu", "Ahero"], defaultLatitude: -0.0917, defaultLongitude: 34.7680 },
    { name: "Nakuru County", code: "NKR", majorCities: ["Nakuru", "Naivasha"], defaultLatitude: -0.3031, defaultLongitude: 36.0800 },
    { name: "Uasin Gishu County", code: "UG", majorCities: ["Eldoret"] },
    { name: "Kiambu County", code: "KMB", majorCities: ["Thika", "Kiambu", "Ruiru"] },
    { name: "Machakos County", code: "MCK", majorCities: ["Machakos", "Athi River"] },
    { name: "Kilifi County", code: "KLF", majorCities: ["Kilifi", "Malindi"] },
  ],

  // South Africa
  ZA: [
    { name: "Gauteng", code: "GP", majorCities: ["Johannesburg", "Pretoria", "Soweto", "Sandton"], defaultLatitude: -26.2041, defaultLongitude: 28.0473 },
    { name: "Western Cape", code: "WC", majorCities: ["Cape Town", "Stellenbosch", "George"], defaultLatitude: -33.9249, defaultLongitude: 18.4241 },
    { name: "KwaZulu-Natal", code: "KZN", majorCities: ["Durban", "Pietermaritzburg", "Newcastle"], defaultLatitude: -29.8587, defaultLongitude: 31.0218 },
  ],

  // India
  IN: [
    { name: "Maharashtra", code: "MH", majorCities: ["Mumbai", "Pune", "Nagpur", "Thane"], defaultLatitude: 19.0760, defaultLongitude: 72.8777 },
    { name: "Delhi (NCT)", code: "DL", majorCities: ["New Delhi", "North Delhi", "South Delhi"], defaultLatitude: 28.6139, defaultLongitude: 77.2090 },
    { name: "Karnataka", code: "KA", majorCities: ["Bengaluru", "Mysuru", "Hubballi"], defaultLatitude: 12.9716, defaultLongitude: 77.5946 },
    { name: "Tamil Nadu", code: "TN", majorCities: ["Chennai", "Coimbatore", "Madurai"], defaultLatitude: 13.0827, defaultLongitude: 80.2707 },
  ],

  // Germany
  DE: [
    { name: "Berlin", code: "BE", majorCities: ["Berlin"], defaultLatitude: 52.5200, defaultLongitude: 13.4050 },
    { name: "Bavaria", code: "BY", majorCities: ["Munich", "Nuremberg", "Augsburg"], defaultLatitude: 48.1351, defaultLongitude: 11.5820 },
    { name: "North Rhine-Westphalia", code: "NW", majorCities: ["Cologne", "Dusseldorf", "Dortmund", "Essen"], defaultLatitude: 50.9375, defaultLongitude: 6.9603 },
  ],

  // United Arab Emirates
  AE: [
    { name: "Dubai", code: "DXB", majorCities: ["Dubai", "Jumeirah", "Deira"], defaultLatitude: 25.2048, defaultLongitude: 55.2708 },
    { name: "Abu Dhabi", code: "AUH", majorCities: ["Abu Dhabi", "Al Ain"], defaultLatitude: 24.4539, defaultLongitude: 54.3773 },
    { name: "Sharjah", code: "SHJ", majorCities: ["Sharjah"], defaultLatitude: 25.3463, defaultLongitude: 55.4209 },
  ],
};

/**
 * Returns regions for a country by code or name.
 */
export function getRegionsForCountry(countryCodeOrName?: string | null): AdministrativeRegion[] {
  if (!countryCodeOrName) return [];
  const normalized = countryCodeOrName.trim().toUpperCase();

  // Try direct code match (e.g., 'NG', 'US', 'GB')
  if (COUNTRY_REGIONS[normalized]) {
    return COUNTRY_REGIONS[normalized];
  }

  // Try matching by country name
  const codeMap: Record<string, string> = {
    NIGERIA: "NG",
    "UNITED STATES": "US",
    USA: "US",
    "UNITED KINGDOM": "GB",
    UK: "GB",
    CANADA: "CA",
    GHANA: "GH",
    KENYA: "KE",
    "SOUTH AFRICA": "ZA",
    INDIA: "IN",
    GERMANY: "DE",
    "UNITED ARAB EMIRATES": "AE",
    UAE: "AE",
  };

  const code = codeMap[normalized];
  if (code && COUNTRY_REGIONS[code]) {
    return COUNTRY_REGIONS[code];
  }

  return [];
}

/**
 * Finds region details within a country.
 */
export function findRegion(countryCodeOrName: string, regionName: string): AdministrativeRegion | undefined {
  const regions = getRegionsForCountry(countryCodeOrName);
  const normalized = regionName.trim().toLowerCase();
  return regions.find(
    (r) => r.name.toLowerCase() === normalized || (r.code && r.code.toLowerCase() === normalized)
  );
}

/**
 * Returns available cities for a specific region.
 */
export function getCitiesForRegion(countryCodeOrName: string, regionName: string): { name: string }[] {
  const region = findRegion(countryCodeOrName, regionName);
  if (!region || !region.majorCities) return [];
  return region.majorCities.map((city) => ({ name: city }));
}

/**
 * Returns administrative meta for a country.
 */
export function getAdministrativeData(countryCodeOrName: string): {
  regionLabel: string;
  regions: {
    name: string;
    code?: string;
    coordinates?: { latitude: number; longitude: number };
    cities?: { name: string; coordinates?: { latitude: number; longitude: number } }[];
  }[];
} {
  const regions = getRegionsForCountry(countryCodeOrName);
  return {
    regionLabel: "State / Province",
    regions: regions.map((r) => ({
      name: r.name,
      code: r.code,
      coordinates:
        r.defaultLatitude && r.defaultLongitude
          ? { latitude: r.defaultLatitude, longitude: r.defaultLongitude }
          : undefined,
      cities: r.majorCities?.map((c) => ({ name: c })),
    })),
  };
}
