/**
 * ORBINOVA External Module Configuration
 *
 * Centralized, validated routing for independently deployed applications:
 *  - ORBINOVA Donor (External Repository & Vercel Deployment)
 *  - ORBINOVA Imaging (External Repository & Vercel Deployment)
 *
 * All destinations are controlled via environment variables.
 * Values must never contain credentials, secrets, or internal database keys.
 */

export interface ExternalModuleConfig {
  id: "donor" | "imaging";
  name: string;
  tagline: string;
  description: string;
  envVar: string;
  url: string | null;
  isConfigured: boolean;
  defaultPath?: string;
  openInNewTab: boolean;
  fallbackNotice: string;
}

/**
 * Validates whether a provided string is a syntactically valid HTTP/HTTPS URL or internal route.
 */
function sanitizeAndValidateUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Internal relative routes (e.g., local module fallback "/login")
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    // Remove unnecessary trailing slash if root path
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * Safely resolves an application entry point without duplicating trailing slashes or subpaths.
 */
function resolveModuleUrl(rawBase: string | undefined, defaultSubpath: string = ""): string | null {
  const sanitized = sanitizeAndValidateUrl(rawBase);
  if (!sanitized) return null;

  if (sanitized.startsWith("/")) return sanitized;
  if (!defaultSubpath) return sanitized;

  // If the base URL already includes the subpath (e.g. /login), do not duplicate
  const cleanSubpath = defaultSubpath.startsWith("/") ? defaultSubpath : `/${defaultSubpath}`;
  if (sanitized.toLowerCase().endsWith(cleanSubpath.toLowerCase())) {
    return sanitized;
  }

  return `${sanitized}${cleanSubpath}`;
}

const rawDonorUrl = process.env.NEXT_PUBLIC_DONOR_APP_URL || "/donor/login";
const rawImagingUrl = process.env.NEXT_PUBLIC_IMAGING_APP_URL || "https://smart-donor-imaging.vercel.app/login";

const resolvedDonorUrl = resolveModuleUrl(rawDonorUrl);
const resolvedImagingUrl = resolveModuleUrl(rawImagingUrl);

export const ORBINOVA_MODULES = {
  donor: {
    id: "donor" as const,
    name: "ORBINOVA Donor",
    shortName: "Donor Platform",
    tagline: "Healthcare Donor Coordination & Blood Matching",
    description:
      "A healthcare donor coordination and blood-matching platform designed to connect verified healthcare institutions, eligible donors, blood banks, and patients requiring blood products.",
    envVar: "NEXT_PUBLIC_DONOR_APP_URL",
    url: resolvedDonorUrl,
    isConfigured: Boolean(resolvedDonorUrl),
    openInNewTab: !resolvedDonorUrl?.startsWith("/"),
    fallbackNotice:
      "The ORBINOVA Donor application URL has not yet been supplied by the development team.",
  },
  imaging: {
    id: "imaging" as const,
    name: "ORBINOVA Imaging",
    shortName: "Imaging Platform",
    tagline: "AI-Assisted Medical Imaging & Clinical Decision Support",
    description:
      "An AI-assisted medical imaging platform designed to support radiologists and healthcare professionals in reviewing medical images, identifying potential abnormalities, and prioritizing clinical review.",
    envVar: "NEXT_PUBLIC_IMAGING_APP_URL",
    url: resolvedImagingUrl,
    isConfigured: Boolean(resolvedImagingUrl),
    openInNewTab: !resolvedImagingUrl?.startsWith("/"),
    fallbackNotice:
      "The ORBINOVA Imaging application URL has not yet been supplied by the development team.",
  },
} as const;

/**
 * Get the verified launch URL for ORBINOVA Donor.
 * Returns null if not configured.
 */
export function getDonorAppUrl(): string | null {
  return ORBINOVA_MODULES.donor.url;
}

/**
 * Get the verified launch URL for ORBINOVA Imaging.
 * Returns null if not configured.
 */
export function getImagingAppUrl(): string | null {
  return ORBINOVA_MODULES.imaging.url;
}

/**
 * Checks if ORBINOVA Donor external destination is ready.
 */
export function isDonorConfigured(): boolean {
  return ORBINOVA_MODULES.donor.isConfigured;
}

/**
 * Checks if ORBINOVA Imaging external destination is ready.
 */
export function isImagingConfigured(): boolean {
  return ORBINOVA_MODULES.imaging.isConfigured;
}
