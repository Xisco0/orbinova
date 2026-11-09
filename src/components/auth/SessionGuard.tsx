"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { SessionExpiredModal } from "./SessionExpiredModal";
import { InactivityWarningModal } from "./InactivityWarningModal";
import { SESSION_CONFIG } from "@/lib/auth/sessionConfig";

export interface SessionGuardProps {
  children: React.ReactNode;
  portalScope?: "hospital" | "donor" | "admin" | "imaging";
  checkIntervalMs?: number;
}

export const SessionGuard: React.FC<SessionGuardProps> = ({
  children,
  portalScope = "hospital",
  checkIntervalMs = SESSION_CONFIG.HEARTBEAT_INTERVAL_MS,
}) => {
  const [isExpired, setIsExpired] = useState(false);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [remainingInactivitySeconds, setRemainingInactivitySeconds] = useState(
    SESSION_CONFIG.INACTIVITY_TIMEOUT_SECONDS
  );

  const isExpiredRef = useRef(false);
  const lastActivityPingRef = useRef(Date.now());
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const markSessionExpired = useCallback(() => {
    if (!isExpiredRef.current) {
      isExpiredRef.current = true;
      setIsExpired(true);
      setShowInactivityWarning(false);

      // Broadcast session revocation to other open tabs
      try {
        broadcastChannelRef.current?.postMessage({
          type: "SESSION_EXPIRED",
          scope: portalScope,
        });
      } catch {}
    }
  }, [portalScope]);

  // 1. Initialize Cross-Tab BroadcastChannel
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const channel = new BroadcastChannel("orbinova_session_sync");
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          const { type, scope } = event.data || {};
          if (scope && scope !== portalScope) return;

          if (type === "SESSION_EXPIRED" || type === "SESSION_REVOKED") {
            markSessionExpired();
          } else if (type === "ACTIVITY_PING") {
            // Another tab refreshed user activity — extend inactivity timer
            setRemainingInactivitySeconds(SESSION_CONFIG.INACTIVITY_TIMEOUT_SECONDS);
            setShowInactivityWarning(false);
          }
        };

        return () => {
          channel.close();
        };
      }
    } catch {}
  }, [portalScope, markSessionExpired]);

  // 2. Active Session & Inactivity Probe
  const validateSessionWithBackend = useCallback(async (isActivity: boolean = false) => {
    if (isExpiredRef.current) return;

    try {
      const url = `/api/auth/session?portal=${portalScope}${isActivity ? "&activity=true" : ""}`;
      const res = await fetch(url, {
        method: isActivity ? "POST" : "GET",
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
        },
        body: isActivity ? JSON.stringify({ activity: true, portal: portalScope }) : undefined,
      });

      if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data.sessionRevoked || res.headers.get("x-session-revoked") === "true") {
          markSessionExpired();
        }
      } else if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (typeof data.remainingInactivitySeconds === "number") {
          setRemainingInactivitySeconds(data.remainingInactivitySeconds);

          // Show warning if 2 minutes or less remain
          if (data.remainingInactivitySeconds <= SESSION_CONFIG.INACTIVITY_WARNING_SECONDS) {
            setShowInactivityWarning(true);
          } else {
            setShowInactivityWarning(false);
          }
        }
      }
    } catch {
      // Resilience requirement: Do NOT log users out due to transient network interruptions
    }
  }, [portalScope, markSessionExpired]);

  // 3. User interaction listener (Meaningful activity tracking, throttled to 60s)
  const handleUserActivity = useCallback(() => {
    if (isExpiredRef.current) return;

    const now = Date.now();
    if (now - lastActivityPingRef.current >= SESSION_CONFIG.ACTIVITY_PING_THROTTLE_MS) {
      lastActivityPingRef.current = now;
      validateSessionWithBackend(true);

      // Notify other tabs to reset inactivity timer
      try {
        broadcastChannelRef.current?.postMessage({
          type: "ACTIVITY_PING",
          scope: portalScope,
        });
      } catch {}
    }
  }, [validateSessionWithBackend, portalScope]);

  useEffect(() => {
    const events = ["pointerdown", "keydown", "scroll", "click"];
    const handleEvent = () => handleUserActivity();

    events.forEach((evt) => {
      window.addEventListener(evt, handleEvent, { passive: true });
    });

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleEvent);
      });
    };
  }, [handleUserActivity]);

  // 4. Inactivity countdown ticker
  useEffect(() => {
    if (isExpired) return;

    const timer = setInterval(() => {
      setRemainingInactivitySeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          markSessionExpired();
          return 0;
        }

        const next = prev - 1;
        if (next <= SESSION_CONFIG.INACTIVITY_WARNING_SECONDS && !showInactivityWarning) {
          setShowInactivityWarning(true);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isExpired, showInactivityWarning, markSessionExpired]);

  // 5. Fetch interceptor for active API calls
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response.status === 401) {
        try {
          const clone = response.clone();
          const body = await clone.json();
          if (
            body?.sessionRevoked === true ||
            response.headers.get("x-session-revoked") === "true" ||
            (typeof body?.error === "string" &&
              body.error.toLowerCase().includes("signed in on another device"))
          ) {
            markSessionExpired();
          }
        } catch {}
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [markSessionExpired]);

  // 6. Periodic heartbeat + focus/visibility triggers
  useEffect(() => {
    validateSessionWithBackend(false);

    const intervalId = setInterval(() => {
      validateSessionWithBackend(false);
    }, checkIntervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        validateSessionWithBackend(false);
      }
    };

    const handleFocus = () => {
      validateSessionWithBackend(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [validateSessionWithBackend, checkIntervalMs]);

  // Handlers for Inactivity Warning Modal
  const handleStaySignedIn = () => {
    setShowInactivityWarning(false);
    setRemainingInactivitySeconds(SESSION_CONFIG.INACTIVITY_TIMEOUT_SECONDS);
    lastActivityPingRef.current = Date.now();
    validateSessionWithBackend(true);

    try {
      broadcastChannelRef.current?.postMessage({
        type: "ACTIVITY_PING",
        scope: portalScope,
      });
    } catch {}
  };

  const handleSignOutNow = async () => {
    try {
      await fetch(`/api/auth/logout?portal=${portalScope}`, {
        method: "POST",
      });
    } catch {}
    markSessionExpired();
  };

  return (
    <>
      {children}
      <InactivityWarningModal
        isOpen={showInactivityWarning && !isExpired}
        remainingSeconds={remainingInactivitySeconds}
        onStaySignedIn={handleStaySignedIn}
        onSignOutNow={handleSignOutNow}
      />
      <SessionExpiredModal
        isOpen={isExpired}
        portalScope={portalScope}
      />
    </>
  );
};
