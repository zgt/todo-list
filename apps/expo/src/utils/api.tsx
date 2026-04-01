import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import type { AppRouter } from "@acme/api";

import { authClient, clearAuthStorage } from "./auth";
import { getBaseUrl } from "./base-url";

/**
 * Fix malformed cookies from the Better Auth expo client.
 * The expo client's splitSetCookieHeader can leave trailing commas on values
 * and produce duplicate cookie names. This deduplicates (keeping the last value)
 * and strips trailing commas.
 */
function sanitizeCookies(raw: string): string {
  const cookieMap = new Map<string, string>();
  raw.split(";").forEach((c) => {
    const trimmed = c.trim();
    if (!trimmed) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) return;
    const name = trimmed.substring(0, eqIdx);
    let value = trimmed.substring(eqIdx + 1);
    value = value.replace(/,+$/, "");
    cookieMap.set(name, value);
  });
  return Array.from(cookieMap.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

/**
 * Global handler for UNAUTHORIZED errors from tRPC.
 * Uses a shared promise so concurrent 401s coalesce into one refresh attempt.
 * Only clears auth state if the refresh truly fails.
 * Once signed out, stops retrying until the user logs in again.
 */
let refreshPromise: Promise<boolean> | null = null;
let hasSignedOut = false;

async function handleUnauthorizedError(): Promise<void> {
  // If we already signed out this app lifecycle, don't keep retrying
  if (hasSignedOut) return;

  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    await refreshPromise;
    return;
  }

  refreshPromise = (async () => {
    try {
      // Attempt to refresh the session through Better Auth's fetch pipeline.
      // This processes Set-Cookie responses and updates SecureStore.
      console.warn("[Auth] Got 401 — attempting session refresh before logout");
      const result = await authClient.getSession({
        query: { disableCookieCache: true },
      });

      if (result.data?.session) {
        console.log(
          "[Auth] Session refresh succeeded — refetching with fresh cookies",
        );
        void queryClient.invalidateQueries();
        return true;
      }
    } catch (error) {
      console.warn("[Auth] Session refresh threw", error);
    }

    // Refresh failed — sign out once and stop
    console.warn("[Auth] Session unrecoverable — clearing local auth state");
    hasSignedOut = true;
    clearAuthStorage();
    queryClient.clear();
    return false;
  })();

  try {
    await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/**
 * Reset the sign-out guard when the user successfully logs in again.
 * Call this after a successful sign-in.
 */
export function resetAuthGuard(): void {
  hasSignedOut = false;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Never retry UNAUTHORIZED — the handler deals with it
        if (
          (error as { data?: { code?: string } }).data?.code === "UNAUTHORIZED"
        ) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
  queryCache: new QueryCache({
    onError: (_error, query) => {
      const trpcError = query.state.error as {
        data?: { code?: string };
      } | null;
      if (trpcError?.data?.code === "UNAUTHORIZED") {
        void handleUnauthorizedError();
      }
    },
  }),
});

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
      headers() {
        const headers: Record<string, string> = {
          "x-trpc-source": "expo-vanilla",
        };

        const cookies = authClient.getCookie();
        if (cookies) {
          headers.Cookie = sanitizeCookies(cookies);
        }
        return headers;
      },
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
        headers() {
          const headers: Record<string, string> = {
            "x-trpc-source": "expo-react",
          };

          const cookies = authClient.getCookie();
          if (cookies) {
            headers.Cookie = sanitizeCookies(cookies);
          }
          return headers;
        },
      }),
    ],
  }),
  queryClient,
});

export type { RouterInputs, RouterOutputs } from "@acme/api";
