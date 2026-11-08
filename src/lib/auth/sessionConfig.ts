/**
-- ORBINOVA SESSION SECURITY CONFIGURATION
 * Configurable session lifetimes, renewal parameters, and inactivity thresholds.
 */

export const SESSION_CONFIG = {
  // Token lifetimes
  ACCESS_TOKEN_LIFETIME_SECONDS: 15 * 60, // 15 minutes
  REFRESH_TOKEN_LIFETIME_SECONDS: 7 * 24 * 60 * 60, // 7 days

  // Absolute maximum session lifetime (must re-authenticate even if active)
  MAX_SESSION_LIFETIME_SECONDS: 7 * 24 * 60 * 60, // 7 days

  // Inactivity timeout (30 minutes of meaningful user activity)
  INACTIVITY_TIMEOUT_SECONDS: 30 * 60, // 30 minutes
  INACTIVITY_WARNING_SECONDS: 2 * 60, // Show warning 2 minutes before inactivity timeout

  // Background heartbeat probe interval
  HEARTBEAT_INTERVAL_MS: 30 * 1000, // 30 seconds

  // Throttling for user interaction activity pings to avoid server spam
  ACTIVITY_PING_THROTTLE_MS: 60 * 1000, // At most once every 60 seconds
} as const;

export const SESSION_MESSAGES = {
  SIGNED_IN_ELSEWHERE: "Please sign in again.",
  INACTIVITY_EXPIRED: "Your session has expired due to 30 minutes of inactivity. For your security, you have been signed out. Please sign in again to continue.",
  MAX_LIFETIME_EXPIRED: "Your session has reached its maximum 7-day duration. Please sign in again to continue.",
  GENERIC_EXPIRED: "Please sign in again.",
} as const;

export const SESSION_COOKIE_NAME_PREFIX = "orbinova_sid";

export function getSessionCookieName(portalScope: string = "hospital"): string {
  return `${SESSION_COOKIE_NAME_PREFIX}_${portalScope}`;
}
