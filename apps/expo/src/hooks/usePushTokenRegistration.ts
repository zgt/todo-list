import type { AppStateStatus } from "react-native";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

import { vanillaTrpc } from "~/utils/api";
import { authClient } from "~/utils/auth";
import { getExpoPushToken } from "~/utils/notifications";

/** Backoff schedule for retrying a failed registration: 5s, 30s, 2m. */
const RETRY_DELAYS_MS = [5_000, 30_000, 120_000];

/**
 * Registers the device's Expo push token with the server, keyed to the
 * signed-in user.
 *
 * This hook is mounted once at the app root (above the auth gate), so it
 * never remounts across sign-in/sign-out/account-switch — registration is
 * keyed off the session's user id instead of a one-shot ref, so switching
 * accounts re-registers the token for the new user. A failed registration
 * is retried with backoff for the current session, and re-attempted when
 * the app returns to the foreground if still unregistered.
 *
 * @param enabled - Whether the session has settled and a user is signed in.
 */
export function usePushTokenRegistration(enabled: boolean) {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;

  // Tracks which user id we last successfully registered a token for, so
  // registration re-runs on account switch instead of being blocked forever
  // by a one-shot guard.
  const registeredForUserRef = useRef<string | null>(null);
  const attemptRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    // New user (or first run for this user): reset the retry budget so a
    // previous account's exhausted attempts don't carry over.
    if (registeredForUserRef.current !== userId) {
      attemptRef.current = 0;
    }

    const clearRetry = () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };

    const attemptRegistration = async () => {
      if (inFlightRef.current || registeredForUserRef.current === userId) {
        return;
      }
      inFlightRef.current = true;

      try {
        const token = await getExpoPushToken();
        if (!token) return;

        await vanillaTrpc.notification.registerToken.mutate({
          token,
          platform: Platform.OS as "ios" | "android",
        });

        registeredForUserRef.current = userId;
        attemptRef.current = 0;
        clearRetry();
        console.log("[PushToken] Registered:", token.slice(0, 20) + "...");
      } catch (error) {
        console.error("[PushToken] Registration failed:", error);

        const attempt = attemptRef.current;
        if (attempt < RETRY_DELAYS_MS.length) {
          attemptRef.current = attempt + 1;
          clearRetry();
          retryTimeoutRef.current = setTimeout(() => {
            void attemptRegistration();
          }, RETRY_DELAYS_MS[attempt]);
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    void attemptRegistration();

    // Retry on foreground too — covers the case where all backoff attempts
    // were exhausted (e.g. device was offline) rather than leaving the
    // session permanently unregistered.
    const sub = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active" && registeredForUserRef.current !== userId) {
          void attemptRegistration();
        }
      },
    );

    return () => {
      clearRetry();
      sub.remove();
    };
  }, [enabled, userId]);
}

/**
 * Best-effort removal of this device's push token from the server.
 * Intended to be called on sign-out, BEFORE the session is cleared, so a
 * stale token doesn't keep receiving pushes for a signed-out user or get
 * silently carried over to whichever account signs in next on this device.
 *
 * Re-derives the current token via `getExpoPushTokenAsync` rather than
 * reading any cached value (this hook doesn't persist the token itself).
 * Never throws — failure here must not block sign-out.
 */
export async function removeRegisteredPushToken(): Promise<void> {
  try {
    const token = await getExpoPushToken();
    if (!token) return;
    await vanillaTrpc.notification.removeToken.mutate({ token });
  } catch (error) {
    console.warn("[PushToken] Failed to remove token on sign-out:", error);
  }
}
