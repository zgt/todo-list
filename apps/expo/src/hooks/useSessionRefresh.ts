import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { authClient } from "~/utils/auth";

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
export function useSessionRefresh() {
  const lastRefreshRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const refreshSession = async () => {
      const now = Date.now();
      if (now - lastRefreshRef.current < DEDUP_MS) return;

      lastRefreshRef.current = now;
      try {
        await authClient.getSession({
          query: { disableCookieCache: true },
        });
      } catch (error) {
        console.warn("[SessionRefresh] Failed to refresh session:", error);
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
  }, []);
}
