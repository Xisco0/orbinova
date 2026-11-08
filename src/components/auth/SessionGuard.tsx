"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { SessionExpiredModal } from "./SessionExpiredModal";

export interface SessionGuardProps {
  children: React.ReactNode;
  portalScope?: "hospital" | "donor" | "admin" | "imaging";
  checkIntervalMs?: number;
}

export const SessionGuard: React.FC<SessionGuardProps> = ({
  children,
  portalScope = "hospital",
  checkIntervalMs = 30000,
}) => {
  const [isExpired, setIsExpired] = useState(false);
  const isExpiredRef = useRef(false);

  const markSessionExpired = useCallback(() => {
    if (!isExpiredRef.current) {
      isExpiredRef.current = true;
      setIsExpired(true);
    }
  }, []);

  // 1. Backend validation probe
  const validateSessionWithBackend = useCallback(async () => {
    if (isExpiredRef.current) return;

    try {
      const res = await fetch(`/api/auth/session?portal=${portalScope}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data.sessionRevoked || res.headers.get("x-session-revoked") === "true") {
          markSessionExpired();
        }
      }
    } catch {
      // Ignore transient network errors during background polling
    }
  }, [portalScope, markSessionExpired]);

  // 2. Fetch interceptor for active API calls
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response.status === 401) {
        // Clone response to inspect body without consuming the stream for the caller
        try {
          const clone = response.clone();
          const body = await clone.json();
          if (
            body?.sessionRevoked === true ||
            (typeof body?.error === "string" &&
              body.error.toLowerCase().includes("signed in on another device"))
          ) {
            markSessionExpired();
          }
        } catch {
          // If not JSON or fails, ignore
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [markSessionExpired]);

  // 3. Periodic heartbeat + focus/visibility triggers
  useEffect(() => {
    // Initial probe on mount
    validateSessionWithBackend();

    // Heartbeat timer
    const intervalId = setInterval(validateSessionWithBackend, checkIntervalMs);

    // Visibility / tab focus event handlers
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        validateSessionWithBackend();
      }
    };

    const handleFocus = () => {
      validateSessionWithBackend();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [validateSessionWithBackend, checkIntervalMs]);

  return (
    <>
      {children}
      <SessionExpiredModal
        isOpen={isExpired}
        portalScope={portalScope}
      />
    </>
  );
};
