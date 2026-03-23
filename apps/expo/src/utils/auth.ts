import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { expoClient } from "@better-auth/expo/client";
import * as Sentry from "@sentry/react-native";
import { createAuthClient } from "better-auth/react";

import { getBaseUrl } from "./base-url";

/**
 * Clears stale Keychain auth entries when the app build number changes.
 * Uses a dedicated SecureStore key to track the version — if reading it
 * throws, we know the Keychain is in a bad state and clear auth entries.
 */
const CURRENT_BUILD =
  Constants.expoConfig?.version ??
  Constants.manifest2?.extra?.expoClient?.version ??
  "unknown";
const BUILD_VERSION_KEY = "expo_auth_build_version";
const AUTH_KEYS = [
  "expo_cookie", // actual cookie storage key used by expo client
  "expo_session_data", // cached session data
  "expo_better-auth.session_token",
  "expo_better-auth.refresh_token",
  "expo_session_token",
  "expo_refresh_token",
];

let keychainCleaned = false;

function ensureKeychainClean(): void {
  if (keychainCleaned) return;
  keychainCleaned = true;

  try {
    const previousBuild = SecureStore.getItem(BUILD_VERSION_KEY);

    if (previousBuild !== CURRENT_BUILD) {
      console.log(
        `[Auth] Build changed (${previousBuild} → ${CURRENT_BUILD}), clearing stale Keychain entries`,
      );
      for (const key of AUTH_KEYS) {
        try {
          SecureStore.deleteItemAsync(key).catch(() => undefined);
        } catch {
          // Key may not exist, that's fine
        }
      }
      try {
        SecureStore.setItem(BUILD_VERSION_KEY, CURRENT_BUILD);
      } catch {
        // If we can't write, we'll retry next launch
      }
    }
  } catch {
    // If reading the version key throws, the Keychain is in a bad state.
    // Clear all auth keys to recover.
    console.warn(
      "[Auth] Keychain read failed, clearing all auth entries to recover",
    );
    for (const key of AUTH_KEYS) {
      try {
        SecureStore.deleteItemAsync(key).catch(() => undefined);
      } catch {
        // Ignore
      }
    }
  }
}

/**
 * Safe wrapper around expo-secure-store that catches native Keychain exceptions.
 * Uses synchronous getItem/setItem to match Better Auth's expected interface.
 * Prevents crashes from stale Keychain entries after TestFlight/production
 * build changes.
 */
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      ensureKeychainClean();
      return SecureStore.getItem(key);
    } catch (error) {
      console.error("[Auth] SecureStore.getItem failed:", key, error);
      Sentry.captureException(error, {
        tags: { operation: "securestore_get", key },
      });
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      SecureStore.setItem(key, value);
    } catch (error) {
      console.error("[Auth] SecureStore.setItem failed:", key, error);
      Sentry.captureException(error, {
        tags: { operation: "securestore_set", key },
      });
    }
  },
};

/**
 * Force-clear all auth tokens from SecureStore.
 * Used when we detect stale sessions (e.g., 401 from server)
 * or when signOut fails and we need to ensure local state is clean.
 */
export function clearAuthStorage(): void {
  for (const key of AUTH_KEYS) {
    try {
      SecureStore.deleteItemAsync(key).catch(() => undefined);
    } catch {
      // Ignore — key may not exist
    }
  }
}

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    expoClient({
      scheme: "tokilist",
      storagePrefix: "expo",
      storage: safeStorage,
    }),
  ],
});

export type Auth = typeof authClient;
export type Session = Auth["$Infer"]["Session"];
export type User = Session["user"];
