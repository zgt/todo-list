import * as Linking from "expo-linking";
import * as Sentry from "@sentry/react-native";
import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import type { AppRouter } from "@acme/api";

import type { AuthCookieTraceDetails } from "./auth-cookies";
import { getSessionTokenCookieHeaderResult } from "./auth-cookies";
import { getBaseUrl } from "./base-url";

const EXPO_ORIGIN = Linking.createURL("", { scheme: "tokilist" });
const DEBUG_AUTH =
  process.env.NODE_ENV === "production" ||
  process.env.AUTH_TRACE === "1" ||
  process.env.EXPO_PUBLIC_AUTH_TRACE === "1";
const authTraceBySource = new Map<string, AuthCookieTraceDetails>();
const sentryAuthEvents = new Map<string, number>();

export const queryClient = new QueryClient();

function captureAuthIssue(
  key: string,
  message: string,
  details: Record<string, unknown>,
): void {
  const now = Date.now();
  const lastCapturedAt = sentryAuthEvents.get(key) ?? 0;
  if (now - lastCapturedAt < 60_000) return;

  sentryAuthEvents.set(key, now);
  console.error(`[AuthTrace][expo-trpc] ${message}`, details);
  Sentry.captureException(new Error(message), {
    tags: { component: "expo_trpc_auth", issue: key },
    extra: details,
  });
}

function getTrpcHeaders(source: string): Record<string, string> {
  const headers: Record<string, string> = {
    "x-trpc-source": source,
    "expo-origin": EXPO_ORIGIN,
    "x-skip-oauth-proxy": "true",
  };

  const { cookieHeader, traceDetails } = getSessionTokenCookieHeaderResult();
  authTraceBySource.set(source, traceDetails);

  if (cookieHeader) {
    headers.cookie = cookieHeader;
  } else if (DEBUG_AUTH && traceDetails.storedCookieNames.length > 0) {
    captureAuthIssue(
      "missing-session-token-cookie",
      "Missing tRPC session token cookie",
      {
        source,
        ...traceDetails,
      },
    );
  }

  return headers;
}

function getRequestUrlForTrace(url: URL | RequestInfo): string {
  if (url instanceof URL) return url.href;
  if (typeof url === "string") return url;
  if ("url" in url && typeof url.url === "string") return url.url;
  return "unknown";
}

async function fetchWithAuthTrace(
  source: string,
  url: URL | RequestInfo,
  options: RequestInit | undefined,
): Promise<Response> {
  const requestUrl = url instanceof URL ? url.href : url;
  const traceUrl = getRequestUrlForTrace(url);
  const response = await fetch(requestUrl, {
    ...options,
    credentials: "omit",
  });

  if (response.status === 401 || response.status === 403) {
    captureAuthIssue(
      `trpc-auth-${response.status}`,
      `tRPC auth request failed with ${response.status}`,
      {
        source,
        url: traceUrl,
        status: response.status,
        ...(authTraceBySource.get(source) ?? {}),
      },
    );
  }

  return response;
}

/**
 * Vanilla tRPC client for use outside React components (e.g., sync operations)
 */
export const vanillaTrpc = createTRPCClient<AppRouter>({
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === "development" ||
        (opts.direction === "down" && opts.result instanceof Error),
      colorMode: "ansi",
    }),
    httpBatchLink({
      transformer: superjson,
      url: `${getBaseUrl()}/api/trpc`,
      fetch(url, options) {
        return fetchWithAuthTrace("expo-vanilla", url, options);
      },
      headers: () => getTrpcHeaders("expo-vanilla"),
    }),
  ],
});

/**
 * A set of typesafe hooks for consuming your API.
 */
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: createTRPCClient({
    links: [
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === "development" ||
          (opts.direction === "down" && opts.result instanceof Error),
        colorMode: "ansi",
      }),
      httpBatchLink({
        transformer: superjson,
        url: `${getBaseUrl()}/api/trpc`,
        fetch(url, options) {
          return fetchWithAuthTrace("expo-react", url, options);
        },
        headers: () => getTrpcHeaders("expo-react"),
      }),
    ],
  }),
  queryClient,
});

export type { RouterInputs, RouterOutputs } from "@acme/api";
