import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

import {
  authClient,
  syncMobileSessionTokenFromCookieStorage,
} from "~/utils/auth";
import { beginAuthTransition, endAuthTransition } from "~/utils/auth-gate";
import { authTrace, nextTraceId } from "~/utils/auth-debug";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const DEDUP_MS = 5 * 60 * 1000; // 5 minutes — skip if refreshed recently

/**
 * Proactively refreshes the Better Auth session cookie via authClient.getSession().
 *
 * tRPC's httpBatchLink sends cookies manually but never processes Set-Cookie
 * response headers, so the cookie expiry in SecureStore is never updated by
 * tRPC traffic alone. This hook ensures the cookie stays fresh by periodically
 * calling authClient.getSession(), which goes through Better Auth's fetch
 * pipeline and updates the stored cookie with a new expiry.
 */
export function useSessionRefresh(enabled = true) {
  const lastRefreshRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const refreshSession = async () => {
      const traceId = nextTraceId("session-refresh");
      const now = Date.now();
      if (now - lastRefreshRef.current < DEDUP_MS) {
        authTrace("session-refresh", "skipping refresh due to dedup window", {
          traceId,
          elapsedMs: now - lastRefreshRef.current,
        });
        return;
      }

      lastRefreshRef.current = now;
      beginAuthTransition("session-refresh");
      try {
        authTrace("session-refresh", "starting proactive refresh", {
          traceId,
          appState: AppState.currentState,
        });
        const result = await authClient.getSession({
          query: { disableCookieCache: true },
        });
        syncMobileSessionTokenFromCookieStorage();
        authTrace("session-refresh", "completed proactive refresh", {
          traceId,
          hasSession: !!result.data?.session,
        });
      } catch (error) {
        console.warn("[SessionRefresh] Failed to refresh session:", error);
        authTrace("session-refresh", "refresh failed", {
          traceId,
          error:
            error instanceof Error ? error.message : "non-error refresh failure",
        });
      } finally {
        endAuthTransition("session-refresh");
      }
    };

    // Refresh on mount
    void refreshSession();

    // Refresh on app foreground
    const handleAppState = (state: AppStateStatus) => {
      if (state === "active") {
        void refreshSession();
      }
    };
    const sub = AppState.addEventListener("change", handleAppState);

    // Periodic refresh while app is active
    intervalRef.current = setInterval(() => {
      if (AppState.currentState === "active") {
        void refreshSession();
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      sub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled]);
}
