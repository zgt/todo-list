import * as SecureStore from "expo-secure-store";

const AUTH_COOKIE_KEY = "expo_cookie";
const AUTH_SESSION_DATA_KEY = "expo_session_data";
const SESSION_TOKEN_MIRROR_KEY = "expo_session_token_cookie";
// Tracing is strictly opt-in — never enabled by default in production builds,
// and trace details must not carry cookie-derived material (they are exported
// to Sentry via captureAuthIssue in api.tsx).
const DEBUG_AUTH =
  process.env.AUTH_TRACE === "1" || process.env.EXPO_PUBLIC_AUTH_TRACE === "1";

interface StoredCookie {
  value: string;
  expires: string | null;
}

type StoredCookies = Record<string, StoredCookie>;

interface ParsedStoredCookies {
  cookies: StoredCookies;
  changed: boolean;
}

interface SessionTokenMirror {
  cookieHeader: string;
  cookieNames: string[];
  expires: string | null;
}

export interface AuthCookieTraceDetails {
  storedCookieNames: string[];
  sentCookieNames: string[];
  fallbackUsed: boolean;
  hasSessionDataCache: boolean;
  sessionDataCacheExpiresInSec: number | null;
  hasTokenMirror: boolean;
  tokenMirrorExpiresInSec: number | null;
}

export interface SessionTokenCookieHeaderResult {
  cookieHeader: string | null;
  traceDetails: AuthCookieTraceDetails;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStoredCookie(value: unknown): value is StoredCookie {
  if (!isRecord(value)) return false;
  return (
    typeof value.value === "string" &&
    (typeof value.expires === "string" || value.expires === null)
  );
}

function isExpired(cookie: StoredCookie): boolean {
  if (!cookie.expires) return false;
  const expiresAt = new Date(cookie.expires).getTime();
  return Number.isNaN(expiresAt) || expiresAt <= Date.now();
}

function parseStoredCookies(raw: string | null): ParsedStoredCookies | null {
  if (!raw) return { cookies: {}, changed: false };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;

    const cookies: StoredCookies = {};
    let changed = false;
    for (const [name, cookie] of Object.entries(parsed)) {
      if (!isStoredCookie(cookie)) {
        changed = true;
        continue;
      }
      cookies[name] = cookie;
    }

    return { cookies, changed };
  } catch {
    return null;
  }
}

function stripSecureCookiePrefix(name: string): string {
  return name.startsWith("__Secure-") ? name.slice("__Secure-".length) : name;
}

function cookieNameKind(name: string): "sessionToken" | "sessionData" | null {
  const unprefixed = stripSecureCookiePrefix(name);

  if (unprefixed.endsWith(".session_token")) return "sessionToken";
  if (unprefixed.endsWith("-session_token")) return "sessionToken";
  if (unprefixed.endsWith(".session_data")) return "sessionData";
  if (unprefixed.endsWith("-session_data")) return "sessionData";

  return null;
}

function traceAuthCookies(
  message: string,
  details: Record<string, unknown>,
): void {
  if (!DEBUG_AUTH) return;
  console.log(`[AuthTrace][expo-auth-storage] ${message}`, details);
}

function sanitizeStoredCookies(raw: string | null): {
  cookies: StoredCookies;
  changed: boolean;
} {
  const parsed = parseStoredCookies(raw);

  if (!parsed) {
    return { cookies: {}, changed: raw !== null };
  }

  let changed = parsed.changed;
  const sanitized: StoredCookies = {};

  for (const [name, cookie] of Object.entries(parsed.cookies)) {
    const kind = cookieNameKind(name);
    if (kind === "sessionData" && isExpired(cookie)) {
      changed = true;
      continue;
    }

    sanitized[name] = cookie;
  }

  return { cookies: sanitized, changed };
}

function getSessionTokenCookies(
  cookies: StoredCookies,
): [string, StoredCookie][] {
  const sessionTokenCookiesByName = new Map<string, [string, StoredCookie]>();

  for (const [name, cookie] of Object.entries(cookies)) {
    if (cookieNameKind(name) !== "sessionToken" || isExpired(cookie)) continue;

    const unprefixedName = stripSecureCookiePrefix(name);
    const existing = sessionTokenCookiesByName.get(unprefixedName);
    if (!existing || name.startsWith("__Secure-")) {
      sessionTokenCookiesByName.set(unprefixedName, [name, cookie]);
    }
  }

  return Array.from(sessionTokenCookiesByName.values());
}

function toCookieHeader(sessionTokenCookies: [string, StoredCookie][]): string {
  return sessionTokenCookies
    .map(([name, cookie]) => `${name}=${cookie.value}`)
    .join("; ");
}

function getMirror(raw: string | null): SessionTokenMirror | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (typeof parsed.cookieHeader !== "string") return null;
    if (!Array.isArray(parsed.cookieNames)) return null;
    if (
      !parsed.cookieNames.every(
        (name): name is string => typeof name === "string",
      )
    ) {
      return null;
    }
    if (typeof parsed.expires !== "string" && parsed.expires !== null)
      return null;
    if (parsed.expires && new Date(parsed.expires).getTime() <= Date.now()) {
      return null;
    }

    return {
      cookieHeader: parsed.cookieHeader,
      cookieNames: parsed.cookieNames,
      expires: parsed.expires,
    };
  } catch {
    return null;
  }
}

function secondsUntil(expires: string | null): number | null {
  if (!expires) return null;
  const expiresAt = new Date(expires).getTime();
  if (Number.isNaN(expiresAt)) return null;
  return Math.floor((expiresAt - Date.now()) / 1000);
}

function getSessionDataCacheExpiresInSec(): number | null {
  const raw = SecureStore.getItem(AUTH_SESSION_DATA_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const session = parsed.session;
    if (!isRecord(session)) return null;
    const expiresAt = session.expiresAt;
    if (typeof expiresAt !== "string") return null;
    return secondsUntil(expiresAt);
  } catch {
    return null;
  }
}

function getBaseTraceDetails(cookies: StoredCookies): {
  storedCookieNames: string[];
  hasSessionDataCache: boolean;
  sessionDataCacheExpiresInSec: number | null;
} {
  const sessionDataCacheExpiresInSec = getSessionDataCacheExpiresInSec();
  return {
    storedCookieNames: Object.keys(cookies),
    hasSessionDataCache: sessionDataCacheExpiresInSec !== null,
    sessionDataCacheExpiresInSec,
  };
}

function updateSessionTokenMirror(cookies: StoredCookies): void {
  const sessionTokenCookies = getSessionTokenCookies(cookies);
  const cookieHeader = toCookieHeader(sessionTokenCookies);

  if (!cookieHeader) {
    return;
  }

  const expires =
    sessionTokenCookies
      .map(([, cookie]) => cookie.expires)
      .filter((expiresAt): expiresAt is string => !!expiresAt)
      .sort()[0] ?? null;

  const mirror: SessionTokenMirror = {
    cookieHeader,
    cookieNames: sessionTokenCookies.map(([name]) => name),
    expires,
  };

  SecureStore.setItem(SESSION_TOKEN_MIRROR_KEY, JSON.stringify(mirror));
}

function getSanitizedCookieJson(): string {
  const raw = SecureStore.getItem(AUTH_COOKIE_KEY);
  const { cookies, changed } = sanitizeStoredCookies(raw);

  if (changed) {
    SecureStore.setItem(AUTH_COOKIE_KEY, JSON.stringify(cookies));
  }

  updateSessionTokenMirror(cookies);
  return JSON.stringify(cookies);
}

export const authStorage = {
  getItem(key: string): string | null {
    if (key !== AUTH_COOKIE_KEY) return SecureStore.getItem(key);
    return getSanitizedCookieJson();
  },
  setItem(key: string, value: string): void {
    if (key !== AUTH_COOKIE_KEY) {
      SecureStore.setItem(key, value);
      return;
    }

    const { cookies } = sanitizeStoredCookies(value);
    SecureStore.setItem(AUTH_COOKIE_KEY, JSON.stringify(cookies));
    updateSessionTokenMirror(cookies);
  },
};

export function clearSessionTokenCookieMirror(): void {
  SecureStore.deleteItemAsync(SESSION_TOKEN_MIRROR_KEY).catch(() => undefined);
}

export function clearExpoAuthSessionStorage(): void {
  SecureStore.setItem(AUTH_COOKIE_KEY, "{}");
  SecureStore.setItem(AUTH_SESSION_DATA_KEY, "{}");
  clearSessionTokenCookieMirror();
}

export function getSessionTokenCookieHeaderResult(): SessionTokenCookieHeaderResult {
  const cookieJson = getSanitizedCookieJson();
  const { cookies } = sanitizeStoredCookies(cookieJson);
  const sessionTokenCookies = getSessionTokenCookies(cookies);
  const cookieHeader = toCookieHeader(sessionTokenCookies);
  const baseTraceDetails = getBaseTraceDetails(cookies);
  const mirror = getMirror(SecureStore.getItem(SESSION_TOKEN_MIRROR_KEY));

  if (cookieHeader) {
    const traceDetails = {
      ...baseTraceDetails,
      sentCookieNames: sessionTokenCookies.map(([name]) => name),
      fallbackUsed: false,
      hasTokenMirror: !!mirror,
      tokenMirrorExpiresInSec: secondsUntil(mirror?.expires ?? null),
    };

    traceAuthCookies("prepared tRPC cookies", traceDetails);
    return { cookieHeader, traceDetails };
  }

  const traceDetails = {
    ...baseTraceDetails,
    sentCookieNames: mirror?.cookieNames ?? [],
    fallbackUsed: !!mirror,
    hasTokenMirror: !!mirror,
    tokenMirrorExpiresInSec: secondsUntil(mirror?.expires ?? null),
  };

  traceAuthCookies("prepared tRPC cookies", traceDetails);
  return {
    cookieHeader: mirror?.cookieHeader ?? null,
    traceDetails,
  };
}

export function hasSessionTokenCookie(): boolean {
  return !!getSessionTokenCookieHeaderResult().cookieHeader;
}
