import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { expoClient, parseSetCookieHeader } from "@better-auth/expo/client";
import * as Sentry from "@sentry/react-native";
import { createAuthClient } from "better-auth/react";

import { getBaseUrl } from "./base-url";
import {
  authTrace,
  cookieFingerprint,
  isAuthTraceEnabled,
} from "./auth-debug";

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
const COOKIE_STORAGE_KEY = "expo_cookie";
const MOBILE_SESSION_TOKEN_KEY = "expo_mobile_session_token";
const BETTER_AUTH_COOKIE_PREFIXES = ["better-auth.", "__Secure-better-auth."];
const SESSION_DATA_SUFFIX = "session_data";
const SESSION_TOKEN_SUFFIX = "session_token";

const AUTH_KEYS = [
  COOKIE_STORAGE_KEY, // actual cookie storage key used by expo client
  "expo_session_data", // cached session data
  "expo_better-auth.session_token",
  "expo_better-auth.refresh_token",
  "expo_session_token",
  "expo_refresh_token",
  MOBILE_SESSION_TOKEN_KEY,
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
      const value = SecureStore.getItem(key);

      if (key !== COOKIE_STORAGE_KEY) {
        return value;
      }

      const sanitized = sanitizeStoredCookieState(value);
      if (sanitized !== value) {
        authTrace("storage", "rewriting sanitized cookie storage on read", {
          previousCookie: cookieFingerprint(value),
          nextCookie: cookieFingerprint(sanitized),
        });
        if (sanitized) {
          SecureStore.setItem(key, sanitized);
        } else {
          SecureStore.deleteItemAsync(key).catch(() => undefined);
        }
      }

      return sanitized;
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
      const nextValue =
        key === COOKIE_STORAGE_KEY ? sanitizeStoredCookieState(value) : value;
      if (nextValue === null) {
        SecureStore.deleteItemAsync(key).catch(() => undefined);
        return;
      }
      SecureStore.setItem(key, nextValue);
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
  authTrace("storage", "clearing auth storage", {
    keys: AUTH_KEYS,
  });
  for (const key of AUTH_KEYS) {
    try {
      SecureStore.deleteItemAsync(key).catch(() => undefined);
    } catch {
      // Ignore — key may not exist
    }
  }
}

export function getMobileSessionToken(): string | null {
  return safeStorage.getItem(MOBILE_SESSION_TOKEN_KEY);
}

export function setMobileSessionToken(token: string): void {
  safeStorage.setItem(MOBILE_SESSION_TOKEN_KEY, token);
}

export function clearMobileSessionToken(): void {
  try {
    SecureStore.deleteItemAsync(MOBILE_SESSION_TOKEN_KEY).catch(() => undefined);
  } catch {
    // Ignore — key may not exist
  }
}

export function getTrpcCookieHeader(): string | null {
  const storedCookie = safeStorage.getItem(COOKIE_STORAGE_KEY);
  const state = parseStoredCookie(storedCookie);
  const cookieEntries = Object.entries(state)
    .filter(([name, entry]) => {
      if (!entry.value) return false;
      const baseName = getChunkBaseName(name);
      return isBetterAuthCookie(baseName) && isSessionTokenCookie(baseName);
    })
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, entry]) => `${name}=${entry.value}`);

  if (cookieEntries.length === 0) {
    return null;
  }

  const cookieHeader = cookieEntries.join("; ");
  authTrace("storage", "built canonical tRPC cookie header", {
    cookie: cookieFingerprint(cookieHeader),
    cookieNames: cookieEntries.map((entry) => entry.split("=")[0]),
  });
  return cookieHeader;
}

export function getStoredSessionTokenFromCookieState(): string | null {
  const storedCookie = safeStorage.getItem(COOKIE_STORAGE_KEY);
  const state = parseStoredCookie(storedCookie);
  const cookieEntries = Object.entries(state)
    .filter(([name, entry]) => {
      if (!entry.value) return false;
      const baseName = getChunkBaseName(name);
      return isBetterAuthCookie(baseName) && isSessionTokenCookie(baseName);
    })
    .sort(([left], [right]) => left.localeCompare(right));

  if (cookieEntries.length === 0) {
    return null;
  }

  return cookieEntries.map(([, entry]) => entry.value).join("");
}

export function syncMobileSessionTokenFromCookieStorage(): string | null {
  const cookieToken = getStoredSessionTokenFromCookieState();
  if (!cookieToken) {
    return null;
  }

  const currentToken = getMobileSessionToken();
  if (currentToken !== cookieToken) {
    authTrace("storage", "syncing mobile token from cookie storage", {
      previousToken: cookieFingerprint(currentToken),
      nextToken: cookieFingerprint(cookieToken),
    });
    setMobileSessionToken(cookieToken);
  }

  return cookieToken;
}

/**
 * Sync a Set-Cookie header into SecureStore using the same merge logic
 * as the expo plugin's fetch interceptor. This ensures session token
 * refreshes from tRPC responses (which bypass the expo plugin) are captured.
 */
export function syncSetCookieToStorage(setCookieHeader: string): void {
  const prevCookie = safeStorage.getItem(COOKIE_STORAGE_KEY);
  const merged = mergeBetterAuthCookies(prevCookie, setCookieHeader);
  authTrace("storage", "syncing set-cookie to storage", {
    previousCookie: cookieFingerprint(prevCookie),
    nextCookie: cookieFingerprint(merged),
    headerFingerprint: cookieFingerprint(setCookieHeader),
  });
  safeStorage.setItem(COOKIE_STORAGE_KEY, merged);
  syncMobileSessionTokenFromCookieStorage();
}

export async function fetchMobileSession(
  token = getMobileSessionToken(),
): Promise<Session | null> {
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${getBaseUrl()}/api/mobile/session`, {
      method: "GET",
      headers: {
        "x-mobile-session-token": token,
        "expo-origin": "tokilist://",
        "x-skip-oauth-proxy": "true",
      },
    });

    if (!response.ok) {
      authTrace("mobile-session", "mobile session fetch failed", {
        status: response.status,
        token: cookieFingerprint(token),
      });
      return null;
    }

    const data = (await response.json()) as Session | null;
    if (data?.session) {
      authTrace("mobile-session", "resolved mobile session", {
        token: cookieFingerprint(token),
        userId: data.user.id,
      });
      return data;
    }

    return null;
  } catch (error) {
    authTrace("mobile-session", "mobile session fetch threw", {
      token: cookieFingerprint(token),
      error:
        error instanceof Error ? error.message : "non-error mobile session failure",
    });
    return null;
  }
}

function mergeBetterAuthCookies(
  prevCookie: string | null,
  setCookieHeader: string,
): string {
  const nextState = parseStoredCookie(prevCookie);
  const incomingCookies = parseSetCookieHeader(setCookieHeader);
  let touchedSessionToken = false;

  for (const [incomingName, incomingCookie] of incomingCookies.entries()) {
    const chunkBase = getChunkBaseName(incomingName);
    if (!isBetterAuthCookie(chunkBase)) continue;

    // Never persist session_data chunks from tRPC's flattened Set-Cookie header.
    // Better Auth's own /api/auth/get-session flow can rebuild them safely.
    if (isSessionDataCookie(chunkBase)) {
      removeCookiesByBaseName(nextState, chunkBase);
      continue;
    }

    if (!isSessionTokenCookie(chunkBase)) continue;
    touchedSessionToken = true;

    for (const existingName of Object.keys(nextState)) {
      if (getChunkBaseName(existingName) === chunkBase) {
        delete nextState[existingName];
      }
    }

    const maxAgeValue = getNumericMaxAge(incomingCookie["max-age"]);
    const expiresValue =
      maxAgeValue !== null
        ? new Date(Date.now() + maxAgeValue * 1000).toISOString()
        : incomingCookie.expires
          ? new Date(String(incomingCookie.expires)).toISOString()
          : null;

    nextState[incomingName] = {
      value: sanitizeCookieValue(incomingCookie.value),
      expires: expiresValue,
    };
  }

  // If the session token changed, force session_data to be rebuilt by the auth route.
  if (touchedSessionToken) {
    removeCookiesBySuffix(nextState, SESSION_DATA_SUFFIX);
  }

  return JSON.stringify(nextState);
}

function parseStoredCookie(
  prevCookie: string | null,
): Record<string, { value: string; expires: string | null }> {
  if (!prevCookie) return {};

  try {
    const parsed = JSON.parse(prevCookie) as Record<
      string,
      { value: string; expires: string | null }
    >;
    return sanitizeStoredCookieEntries(parsed);
  } catch {
    return {};
  }
}

function sanitizeStoredCookieState(prevCookie: string | null): string | null {
  if (!prevCookie) return prevCookie;

  try {
    const parsed = JSON.parse(prevCookie) as Record<
      string,
      { value: string; expires: string | null }
    >;
    const sanitized = sanitizeStoredCookieEntries(parsed);
    const nextValue = JSON.stringify(sanitized);
    return nextValue === "{}" ? null : nextValue;
  } catch {
    authTrace("storage", "dropping unreadable cookie storage state", {
      previousCookie: cookieFingerprint(prevCookie),
    });
    return null;
  }
}

function sanitizeStoredCookieEntries(
  state: Record<string, { value: string; expires: string | null }>,
): Record<string, { value: string; expires: string | null }> {
  const sanitizedState: Record<
    string,
    { value: string; expires: string | null }
  > = {};

  for (const [name, entry] of Object.entries(state)) {
    if (typeof entry.value !== "string") continue;

    const baseName = getChunkBaseName(name);
    if (isBetterAuthCookie(baseName) && entry.value.includes(",")) {
      authTrace("storage", "dropping malformed better auth cookie from storage", {
        cookieName: name,
        cookieValue: cookieFingerprint(entry.value),
      });
      continue;
    }

    sanitizedState[name] = {
      value: sanitizeCookieValue(entry.value),
      expires: entry.expires,
    };
  }

  return sanitizedState;
}

function getChunkBaseName(cookieName: string): string {
  return cookieName.replace(/\.\d+$/, "");
}

function isBetterAuthCookie(cookieName: string): boolean {
  return BETTER_AUTH_COOKIE_PREFIXES.some((prefix) =>
    cookieName.startsWith(prefix),
  );
}

function isSessionDataCookie(cookieName: string): boolean {
  return cookieName.endsWith(SESSION_DATA_SUFFIX);
}

function isSessionTokenCookie(cookieName: string): boolean {
  return cookieName.endsWith(SESSION_TOKEN_SUFFIX);
}

function removeCookiesByBaseName(
  state: Record<string, { value: string; expires: string | null }>,
  baseName: string,
): void {
  for (const existingName of Object.keys(state)) {
    if (getChunkBaseName(existingName) === baseName) {
      delete state[existingName];
    }
  }
}

function removeCookiesBySuffix(
  state: Record<string, { value: string; expires: string | null }>,
  suffix: string,
): void {
  for (const existingName of Object.keys(state)) {
    if (getChunkBaseName(existingName).endsWith(suffix)) {
      delete state[existingName];
    }
  }
}

function sanitizeCookieValue(value: string): string {
  // Better Auth session cookies are base64/base64url-ish and should not contain commas.
  // If headers were flattened, chunk values can pick up a stray comma separator.
  return value.replace(/,+$/g, "").replace(/,/g, "");
}

function getNumericMaxAge(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
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

if (isAuthTraceEnabled()) {
  authTrace("client", "better auth expo client configured", {
    baseUrl: getBaseUrl(),
    storageKey: COOKIE_STORAGE_KEY,
  });
}

export type Auth = typeof authClient;
export type Session = Auth["$Infer"]["Session"];
export type User = Session["user"];
