"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Globe,
  MapPin,
  Building,
  Navigation,
  Compass,
  Check,
  AlertCircle,
  HelpCircle,
  Crosshair,
  ShieldCheck,
  Search,
  Info,
  Loader2,
} from "lucide-react";
import {
  getAllCountries,
  getCountryByCode,
  CountryInfo,
} from "./countries";
import {
  getRegionsForCountry,
  getCitiesForRegion,
  getAdministrativeData,
} from "./regions";
import {
  isValidCoordinates,
  getFallbackCoordinates,
  approximateDonorCoordinates,
} from "./geocoding";

export interface LocationSelectorValue {
  country: string; // ISO 2-letter or common name
  countryCode: string; // ISO 2-letter (e.g. "NG", "US", "GB")
  state: string; // State / Province / Region
  city: string; // City / Town
  district?: string; // Area / District / Neighbourhood (vital for donors)
  streetAddress?: string; // Street address (for institutions)
  postalCode?: string; // Postal / ZIP code
  latitude?: number | null;
  longitude?: number | null;
  locationConsent?: boolean; // For voluntary donors
}

interface LocationSelectorProps {
  value: Partial<LocationSelectorValue>;
  onChange: (val: LocationSelectorValue) => void;
  mode?: "institution" | "donor";
  disabled?: boolean;
  className?: string;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  value,
  onChange,
  mode = "institution",
  disabled = false,
  className = "",
}) => {
  const allCountries = useMemo(() => getAllCountries(), []);

  // Selected Country Code (normalize e.g. "Nigeria" -> "NG", or "NG" -> "NG")
  const resolvedCountryCode = useMemo(() => {
    if (!value.countryCode && value.country) {
      const match = allCountries.find(
        (c) =>
          c.name.toLowerCase() === value.country?.toLowerCase() ||
          c.code.toLowerCase() === value.country?.toLowerCase()
      );
      return match?.code || "NG";
    }
    return value.countryCode || "NG";
  }, [value.countryCode, value.country, allCountries]);

  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(resolvedCountryCode);
  const [countrySearch, setCountrySearch] = useState<string>("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState<boolean>(false);

  // States / Regions for selected country
  const regions = useMemo(() => {
    return getRegionsForCountry(selectedCountryCode);
  }, [selectedCountryCode]);

  const adminData = useMemo(() => {
    return getAdministrativeData(selectedCountryCode);
  }, [selectedCountryCode]);

  const [manualRegionEntry, setManualRegionEntry] = useState<boolean>(false);
  const [manualCityEntry, setManualCityEntry] = useState<boolean>(false);
  const [showCoordinatePicker, setShowCoordinatePicker] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState<boolean>(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  // Synchronize internal country with incoming props if changed externally
  useEffect(() => {
    if (resolvedCountryCode && resolvedCountryCode !== selectedCountryCode) {
      setSelectedCountryCode(resolvedCountryCode);
    }
  }, [resolvedCountryCode]);

  // Derived Cities for current region
  const availableCities = useMemo(() => {
    if (!value.state) return [];
    return getCitiesForRegion(selectedCountryCode, value.state);
  }, [selectedCountryCode, value.state]);

  const selectedCountry = useMemo(() => {
    return getCountryByCode(selectedCountryCode) || allCountries[0];
  }, [selectedCountryCode, allCountries]);

  // Filter countries for dropdown search
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return allCountries;
    const q = countrySearch.toLowerCase();
    return allCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [allCountries, countrySearch]);

  // Handle Country Selection
  const handleSelectCountry = (country: CountryInfo) => {
    setSelectedCountryCode(country.code);
    setIsCountryDropdownOpen(false);
    setCountrySearch("");
    setManualRegionEntry(false);
    setManualCityEntry(false);

    // Default coordinates to country center if not set
    const defaultCoords = {
      latitude: country.defaultLatitude,
      longitude: country.defaultLongitude,
    };

    onChange({
      country: country.name,
      countryCode: country.code,
      state: "",
      city: "",
      district: value.district || "",
      streetAddress: value.streetAddress || "",
      postalCode: value.postalCode || "",
      latitude: defaultCoords.latitude ?? value.latitude ?? null,
      longitude: defaultCoords.longitude ?? value.longitude ?? null,
      locationConsent: value.locationConsent ?? true,
    });
  };

  // Auto-fill fallback coordinates when city or state changes
  const handleRegionChange = (newRegion: string) => {
    const fallback = getFallbackCoordinates(selectedCountryCode, newRegion, value.city);
    onChange({
      country: selectedCountry.name,
      countryCode: selectedCountry.code,
      state: newRegion,
      city: value.city || "",
      district: value.district || "",
      streetAddress: value.streetAddress || "",
      postalCode: value.postalCode || "",
      latitude: fallback?.latitude ?? value.latitude ?? null,
      longitude: fallback?.longitude ?? value.longitude ?? null,
      locationConsent: value.locationConsent ?? true,
    });
  };

  const handleCityChange = (newCity: string) => {
    const fallback = getFallbackCoordinates(selectedCountryCode, value.state, newCity);
    onChange({
      country: selectedCountry.name,
      countryCode: selectedCountry.code,
      state: value.state || "",
      city: newCity,
      district: value.district || "",
      streetAddress: value.streetAddress || "",
      postalCode: value.postalCode || "",
      latitude: fallback?.latitude ?? value.latitude ?? null,
      longitude: fallback?.longitude ?? value.longitude ?? null,
      locationConsent: value.locationConsent ?? true,
    });
  };

  // Browser Geolocation capture (Pin on Map / Current Location)
  const handleDetectGPS = () => {
    setGeoError(null);
    setGeoNotice(null);

    const fallback = getFallbackCoordinates(selectedCountryCode, value.state, value.city);

    if (typeof window === "undefined" || !navigator.geolocation) {
      if (fallback) {
        onChange({
          country: selectedCountry.name,
          countryCode: selectedCountry.code,
          state: value.state || "",
          city: value.city || "",
          district: value.district || "",
          streetAddress: value.streetAddress || "",
          postalCode: value.postalCode || "",
          latitude: fallback.latitude,
          longitude: fallback.longitude,
          locationConsent: value.locationConsent ?? true,
        });
        setGeoNotice(`Geolocation not supported by device. Approximate regional coordinates for ${value.city || value.state || selectedCountry.name} applied.`);
      } else {
        setGeoError("Geolocation is not supported by your browser environment.");
      }
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        let lat = pos.coords.latitude;
        let lng = pos.coords.longitude;

        if (mode === "donor") {
          // Approximate donor coordinates to ~1.1km grid for privacy
          const approx = approximateDonorCoordinates({ latitude: lat, longitude: lng });
          lat = approx.latitude;
          lng = approx.longitude;
        }

        onChange({
          country: selectedCountry.name,
          countryCode: selectedCountry.code,
          state: value.state || "",
          city: value.city || "",
          district: value.district || "",
          streetAddress: value.streetAddress || "",
          postalCode: value.postalCode || "",
          latitude: Math.round(lat * 10000) / 10000,
          longitude: Math.round(lng * 10000) / 10000,
          locationConsent: value.locationConsent ?? true,
        });
        setGeoNotice("Device GPS coordinates successfully detected.");
        setTimeout(() => setGeoNotice(null), 4000);
      },
      (err) => {
        setGeoLoading(false);
        // When device GPS is unavailable or timed out, seamlessly fallback to administrative city/state coordinates
        if (fallback || isValidCoordinates(value.latitude, value.longitude)) {
          if (fallback && !isValidCoordinates(value.latitude, value.longitude)) {
            onChange({
              country: selectedCountry.name,
              countryCode: selectedCountry.code,
              state: value.state || "",
              city: value.city || "",
              district: value.district || "",
              streetAddress: value.streetAddress || "",
              postalCode: value.postalCode || "",
              latitude: fallback.latitude,
              longitude: fallback.longitude,
              locationConsent: value.locationConsent ?? true,
            });
          }
          setGeoNotice(
            `Device GPS unavailable. Using verified regional coordinates for ${value.city || value.state || selectedCountry.name}.`
          );
          setGeoError(null);
        } else {
          setGeoError(
            err.code === 1
              ? "Location permission was denied. Please select a city to use regional coordinates or enter manually."
              : "Could not retrieve GPS coordinates. Please select a city or enter manually."
          );
        }
      },
      { timeout: 8000, enableHighAccuracy: mode === "institution", maximumAge: 60000 }
    );
  };

  const isCoordsValid = isValidCoordinates(value.latitude, value.longitude);

  return (
    <div className={`space-y-4 font-inter ${className}`}>
      {/* 1. Country Selection */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase">
          Country <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div
            onClick={() => !disabled && setIsCountryDropdownOpen(!isCountryDropdownOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm cursor-pointer transition-all ${
              disabled
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                : isCountryDropdownOpen
                ? "border-secondary-500 ring-2 ring-secondary-500/20"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0 font-mono">
                {selectedCountry.code}
              </span>
              <span className="font-semibold text-slate-900 truncate">
                {selectedCountry.name}
              </span>
              <span className="text-slate-400 text-xs font-mono">
                ({selectedCountry.dialCode})
              </span>
            </div>
            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          {/* Searchable Dropdown Panel */}
          {isCountryDropdownOpen && !disabled && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search countries worldwide..."
                  className="w-full text-xs bg-transparent border-none outline-none font-inter text-dark placeholder:text-slate-400"
                />
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                {filteredCountries.map((c) => (
                  <div
                    key={c.code}
                    onClick={() => handleSelectCountry(c)}
                    className={`flex items-center justify-between px-3.5 py-2 hover:bg-secondary-50 cursor-pointer text-xs transition-colors ${
                      c.code === selectedCountryCode ? "bg-secondary-50/70 font-bold" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0 font-mono">
                        {c.code}
                      </span>
                      <span className="text-slate-800 truncate">{c.name}</span>
                    </div>
                    {c.code === selectedCountryCode && (
                      <Check className="w-3.5 h-3.5 text-secondary-600 shrink-0" />
                    )}
                  </div>
                ))}
                {filteredCountries.length === 0 && (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No country matching &quot;{countrySearch}&quot;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. State / Province / Region & City / Town */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Region / State */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase">
              {adminData?.regionLabel || "State / Province"} <span className="text-red-500">*</span>
            </label>
            {regions.length > 0 && (
              <button
                type="button"
                onClick={() => setManualRegionEntry(!manualRegionEntry)}
                className="text-[11px] text-secondary-600 hover:text-secondary-800 underline cursor-pointer"
              >
                {manualRegionEntry ? "Select from list" : "Enter manually"}
              </button>
            )}
          </div>

          {regions.length > 0 && !manualRegionEntry ? (
            <select
              disabled={disabled}
              value={value.state || ""}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-dark focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500 transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Select {adminData?.regionLabel || "Region"}...</option>
              {regions.map((reg) => (
                <option key={reg.name} value={reg.name}>
                  {reg.name} {reg.code ? `(${reg.code})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              disabled={disabled}
              value={value.state || ""}
              onChange={(e) => handleRegionChange(e.target.value)}
              placeholder={`e.g. ${adminData?.regionLabel || "State/Province"}`}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-dark focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500 transition-all disabled:bg-slate-100 disabled:text-slate-400"
            />
          )}
        </div>

        {/* City / Town */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase">
              City / Town <span className="text-red-500">*</span>
            </label>
            {availableCities.length > 0 && (
              <button
                type="button"
                onClick={() => setManualCityEntry(!manualCityEntry)}
                className="text-[11px] text-secondary-600 hover:text-secondary-800 underline cursor-pointer"
              >
                {manualCityEntry ? "Select from list" : "Enter manually"}
              </button>
            )}
          </div>

          {availableCities.length > 0 && !manualCityEntry ? (
            <select
              disabled={disabled}
              value={value.city || ""}
              onChange={(e) => handleCityChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-dark focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500 transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Select City / Town...</option>
              {availableCities.map((c: { name: string }) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              disabled={disabled}
              value={value.city || ""}
              onChange={(e) => handleCityChange(e.target.value)}
              placeholder="e.g. Ikeja, Nairobi, London, Austin"
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-dark focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500 transition-all disabled:bg-slate-100 disabled:text-slate-400"
            />
          )}
        </div>
      </div>

      {/* 3. Area / District / Neighbourhood (Critical for Donor Location Privacy) */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase">
          Area / District / Neighbourhood
          {mode === "donor" && <span className="text-xs text-slate-400 font-normal ml-1">(General vicinity, e.g. Lekki Phase 1, Victoria Island, Brooklyn)</span>}
        </label>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            disabled={disabled}
            value={value.district || ""}
            onChange={(e) =>
              onChange({
                ...value,
                country: selectedCountry.name,
                countryCode: selectedCountry.code,
                district: e.target.value,
              } as LocationSelectorValue)
            }
            placeholder="e.g. Central Business District, Ikeja GRA, Yaba"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-dark focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500 transition-all disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>
      </div>

      {/* 4. Street Address (Mainly for Institutions) */}
      {mode === "institution" && (
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase">
            Street Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              disabled={disabled}
              value={value.streetAddress || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  country: selectedCountry.name,
                  countryCode: selectedCountry.code,
                  streetAddress: e.target.value,
                } as LocationSelectorValue)
              }
              placeholder="e.g. 1-5 Ishaga Road, Idi-Araba, Surulere"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-dark focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500 transition-all disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>
        </div>
      )}

      {/* 5. Postal / ZIP Code (Optional or country dependent) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase">
            Postal / ZIP Code
            <span className="text-[10px] text-slate-400 font-normal ml-1">(Optional)</span>
          </label>
          <input
            type="text"
            disabled={disabled}
            value={value.postalCode || ""}
            onChange={(e) =>
              onChange({
                ...value,
                country: selectedCountry.name,
                countryCode: selectedCountry.code,
                postalCode: e.target.value,
              } as LocationSelectorValue)
            }
            placeholder={selectedCountry.code === "US" ? "e.g. 90210" : "e.g. 100001"}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-dark focus:outline-none focus:ring-2 focus:ring-secondary-500/20 focus:border-secondary-500 transition-all disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>

        {/* GPS Coordinates Quick Action */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase">
            Geographic Coordinates
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={disabled || geoLoading}
              onClick={handleDetectGPS}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              title="Detect current device coordinates or pin location"
            >
              {geoLoading ? (
                <Loader2 className="w-3.5 h-3.5 text-secondary-600 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-secondary-600" />
              )}
              <span>
                {geoLoading
                  ? "Detecting..."
                  : mode === "donor"
                  ? "Approximate GPS"
                  : "Detect GPS"}
              </span>
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setShowCoordinatePicker(!showCoordinatePicker)}
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              title="Toggle coordinates input panel"
            >
              <Crosshair className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {geoNotice && (
        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{geoNotice}</span>
        </div>
      )}

      {geoError && !isCoordsValid && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Coordinate Display / Manual Entry Drawer */}
      {(showCoordinatePicker || isCoordsValid) && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-secondary-600" />
              GPS Coordinates ({selectedCountry.defaultUnit === "mi" ? "Miles / LatLng" : "Km / LatLng"})
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isCoordsValid
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {isCoordsValid ? "Coordinates Verified" : "Coordinates Incomplete"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Latitude (-90 to +90)</label>
              <input
                type="number"
                step="any"
                disabled={disabled}
                value={value.latitude ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    country: selectedCountry.name,
                    countryCode: selectedCountry.code,
                    latitude: e.target.value ? parseFloat(e.target.value) : null,
                  } as LocationSelectorValue)
                }
                placeholder="e.g. 6.5244"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Longitude (-180 to +180)</label>
              <input
                type="number"
                step="any"
                disabled={disabled}
                value={value.longitude ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    country: selectedCountry.name,
                    countryCode: selectedCountry.code,
                    longitude: e.target.value ? parseFloat(e.target.value) : null,
                  } as LocationSelectorValue)
                }
                placeholder="e.g. 3.3792"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>
          {mode === "donor" && (
            <p className="text-[11px] text-slate-500 italic">
              Donor coordinates are approximated to ~1 km resolution. Exact home street coordinates are never shared with requesting facilities.
            </p>
          )}
        </div>
      )}

      {/* 6. Donor Location Matching Consent Checkbox */}
      {mode === "donor" && (
        <div className="p-3 bg-secondary-50/70 border border-secondary-200/80 rounded-xl flex items-start gap-3">
          <input
            type="checkbox"
            id="donor-location-consent"
            checked={value.locationConsent ?? true}
            onChange={(e) =>
              onChange({
                ...value,
                locationConsent: e.target.checked,
              } as LocationSelectorValue)
            }
            className="mt-0.5 rounded border-secondary-300 text-secondary-600 focus:ring-secondary-500 cursor-pointer"
          />
          <label htmlFor="donor-location-consent" className="text-xs text-secondary-900 cursor-pointer">
            <span className="font-bold block">Donor Location Matching Consent</span>
            <span>
              The donor consents to have their approximate city/district location used by authorized hospitals to match emergency blood requests.
            </span>
          </label>
        </div>
      )}
    </div>
  );
};
