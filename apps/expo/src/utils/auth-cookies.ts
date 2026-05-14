import * as SecureStore from "expo-secure-store";

const AUTH_COOKIE_KEY = "expo_cookie";
const DEBUG_AUTH =
  process.env.NODE_ENV === "production" ||
  process.env.AUTH_TRACE === "1" ||
  process.env.EXPO_PUBLIC_AUTH_TRACE === "1";

interface StoredCookie {
  value: string;
  expires: string | null;
}

type StoredCookies = Record<string, StoredCookie>;

interface ParsedStoredCookies {
  cookies: StoredCookies;
  changed: boolean;
}

export interface AuthCookieTraceDetails {
  storedCookieNames: string[];
  sentCookieNames: string[];
  sentCookie: string;
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

function cookieNameKind(name: string): "sessionToken" | "sessionData" | null {
  const unprefixed = stripSecureCookiePrefix(name);

  if (unprefixed.endsWith(".session_token")) return "sessionToken";
  if (unprefixed.endsWith("-session_token")) return "sessionToken";
  if (unprefixed.endsWith(".session_data")) return "sessionData";
  if (unprefixed.endsWith("-session_data")) return "sessionData";

  return null;
}

function stripSecureCookiePrefix(name: string): string {
  return name.startsWith("__Secure-") ? name.slice("__Secure-".length) : name;
}

function djb2(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function cookieFingerprint(cookie: string | null): string {
  if (!cookie) return "none";
  return `${cookie.length}:${djb2(cookie)}`;
}

function traceAuthCookies(
  message: string,
  details: Record<string, unknown>,
): void {
  if (!DEBUG_AUTH) return;
  console.log(`[AuthTrace][expo-trpc] ${message}`, details);
}

function sanitizeStoredCookies(raw: string | null): StoredCookies {
  const parsed = parseStoredCookies(raw);

  if (!parsed) {
    if (process.env.NODE_ENV === "production") {
      SecureStore.setItem(AUTH_COOKIE_KEY, "{}");
    }
    return {};
  }

  const cookies = parsed.cookies;
  if (process.env.NODE_ENV !== "production") return cookies;

  let changed = parsed.changed;
  const sanitized: StoredCookies = {};

  for (const [name, cookie] of Object.entries(cookies)) {
    const kind = cookieNameKind(name);
    if (kind === "sessionData" && isExpired(cookie)) {
      changed = true;
      continue;
    }

    sanitized[name] = cookie;
  }

  if (changed) {
    SecureStore.setItem(AUTH_COOKIE_KEY, JSON.stringify(sanitized));
  }

  return sanitized;
}

export function getSessionTokenCookieHeaderResult(): SessionTokenCookieHeaderResult {
  const raw = SecureStore.getItem(AUTH_COOKIE_KEY);
  const cookies = sanitizeStoredCookies(raw);
  const sessionTokenCookiesByName = new Map<string, [string, StoredCookie]>();

  for (const [name, cookie] of Object.entries(cookies)) {
    if (cookieNameKind(name) !== "sessionToken" || isExpired(cookie)) continue;

    const unprefixedName = stripSecureCookiePrefix(name);
    const existing = sessionTokenCookiesByName.get(unprefixedName);
    if (!existing || name.startsWith("__Secure-")) {
      sessionTokenCookiesByName.set(unprefixedName, [name, cookie]);
    }
  }

  const sessionTokenCookies = Array.from(sessionTokenCookiesByName.values());

  const cookieHeader = sessionTokenCookies
    .map(([name, cookie]) => `${name}=${cookie.value}`)
    .join("; ");

  const traceDetails = {
    storedCookieNames: Object.keys(cookies),
    sentCookieNames: sessionTokenCookies.map(([name]) => name),
    sentCookie: cookieFingerprint(cookieHeader || null),
  };

  traceAuthCookies("prepared tRPC cookies", traceDetails);

  return {
    cookieHeader: cookieHeader || null,
    traceDetails,
  };
}

export function getSessionTokenCookieHeader(): string | null {
  return getSessionTokenCookieHeaderResult().cookieHeader;
}
