import type { AppStateStatus } from "react-native";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

import { vanillaTrpc } from "~/utils/api";
import { authClient } from "~/utils/auth";
import { getExpoPushToken } from "~/utils/notifications";

/** Backoff schedule for retrying a failed registration: 5s, 30s, 2m. */
const RETRY_DELAYS_MS = [5_000, 30_000, 120_000];

/**
 * Module-scope marker: the user id we last successfully registered a push
 * token for, this session. Hoisted out of the hook (rather than a
 * component ref) for two reasons:
 *   - this hook is mounted once at the app root, above the auth gate, and
 *     never unmounts across sign-out/sign-in — a per-instance ref survives
 *     sign-out untouched, so signing back in as the SAME user never
 *     re-triggers registration until the app restarts (D1).
 *   - `removeRegisteredPushToken` runs from sign-out flows outside this
 *     hook's component tree and needs to clear the same marker, and other
 *     consumers (local reminder scheduling) need to read whether the
 *     current session's token is registered.
 */
let registeredForUserId: string | null = null;

/**
 * Whether a push token is currently registered (this session) for the given
 * user id. Reads the module-scope marker shared with the hook below and
 * `removeRegisteredPushToken`.
 */
export function isPushTokenRegistered(
  userId: string | null | undefined,
): boolean {
  return !!userId && registeredForUserId === userId;
}

/**
 * Registers the device's Expo push token with the server, keyed to the
 * signed-in user.
 *
 * This hook is mounted once at the app root (above the auth gate), so it
 * never remounts across sign-in/sign-out/account-switch — registration is
 * keyed off a module-scope "registered for this user id" marker instead of
 * a one-shot ref, so switching accounts (or signing out and back in as the
 * same user) re-registers the token. A failed registration is retried with
 * backoff for the current session, and re-attempted when the app returns to
 * the foreground if still unregistered.
 *
 * @param enabled - Whether the session has settled and a user is signed in.
 */
export function usePushTokenRegistration(enabled: boolean) {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id ?? null;

  const attemptRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  // Which user id the in-flight attempt was started for, so its completion
  // can detect a session switch that happened while it was pending (D5).
  const inFlightForUserIdRef = useRef<string | null>(null);
  // Latest live user id, readable from inside an in-flight async attempt
  // that closed over a now-stale one. Updated in an effect (not during
  // render) to satisfy the rules-of-hooks ref-mutation lint rule.
  const liveUserIdRef = useRef<string | null>(userId);
  useEffect(() => {
    liveUserIdRef.current = userId;
  });

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    // New user (or first run for this user): reset the retry budget so a
    // previous account's exhausted attempts don't carry over.
    if (registeredForUserId !== userId) {
      attemptRef.current = 0;
    }

    const clearRetry = () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };

    const attemptRegistration = async (targetUserId: string) => {
      if (inFlightRef.current || registeredForUserId === targetUserId) {
        return;
      }
      inFlightRef.current = true;
      inFlightForUserIdRef.current = targetUserId;

      try {
        const token = await getExpoPushToken();
        if (!token) return;

        await vanillaTrpc.notification.registerToken.mutate({
          token,
          platform: Platform.OS as "ios" | "android",
        });

        // The session may have switched to a different user while this
        // registration was in flight (D5). Only stamp the marker if the
        // current session user still matches who we registered for —
        // otherwise this token was registered on behalf of a user we're no
        // longer signed in as, so leave the marker unset (the finally block
        // below re-triggers an attempt for whoever is current now).
        if (liveUserIdRef.current === targetUserId) {
          registeredForUserId = targetUserId;
          attemptRef.current = 0;
          clearRetry();
          console.log("[PushToken] Registered:", token.slice(0, 20) + "...");
        } else {
          console.log(
            "[PushToken] Registered while session moved on; will retry for current user",
          );
        }
      } catch (error) {
        console.error("[PushToken] Registration failed:", error);

        const attempt = attemptRef.current;
        if (attempt < RETRY_DELAYS_MS.length) {
          attemptRef.current = attempt + 1;
          clearRetry();
          retryTimeoutRef.current = setTimeout(() => {
            const retryTarget = liveUserIdRef.current;
            if (retryTarget) void attemptRegistration(retryTarget);
          }, RETRY_DELAYS_MS[attempt]);
        }
      } finally {
        inFlightRef.current = false;
        const staleTarget = inFlightForUserIdRef.current;
        inFlightForUserIdRef.current = null;

        // If the session moved on to a different user while this attempt
        // was in flight, kick off a fresh attempt for whoever is current
        // now instead of waiting for the next foreground event (D5).
        const current = liveUserIdRef.current;
        if (
          current &&
          current !== staleTarget &&
          registeredForUserId !== current
        ) {
          void attemptRegistration(current);
        }
      }
    };

    void attemptRegistration(userId);

    // Retry on foreground too — covers the case where all backoff attempts
    // were exhausted (e.g. device was offline) rather than leaving the
    // session permanently unregistered.
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active" && registeredForUserId !== userId) {
        void attemptRegistration(userId);
      }
    });

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
 *
 * Always clears the module-scope "registered" marker, regardless of
 * whether the server call succeeds, so registration re-runs for the next
 * sign-in (including signing back in as the same user) instead of being
 * blocked forever by a marker that sign-out never touched (D1).
 */
export async function removeRegisteredPushToken(): Promise<void> {
  try {
    const token = await getExpoPushToken();
    if (token) {
      await vanillaTrpc.notification.removeToken.mutate({ token });
    }
  } catch (error) {
    console.warn("[PushToken] Failed to remove token on sign-out:", error);
  } finally {
    registeredForUserId = null;
  }
}
