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
 * When the server rejects a stale session, we attempt a silent refresh first.
 * If refresh succeeds, queries are invalidated. If it fails, we clear auth
 * storage and the query cache so the app falls back to the login screen.
 * A shared promise ensures concurrent 401s coalesce into a single refresh attempt.
 */
let refreshPromise: Promise<boolean> | null = null;

async function handleUnauthorizedError() {
  if (refreshPromise) {
    await refreshPromise;
    return;
  }

  refreshPromise = (async () => {
    try {
      console.warn("[Auth] Session expired — attempting silent refresh");
      const { data: session } = await authClient.getSession({
        query: { disableCookieCache: true },
      });

      if (session) {
        console.log("[Auth] Session refreshed successfully");
        void queryClient.invalidateQueries();
        return true;
      }
    } catch (e) {
      console.warn("[Auth] Session refresh failed", e);
    }

    console.warn("[Auth] Session unrecoverable — clearing local auth state");
    clearAuthStorage();
    queryClient.clear();
    // Force Better Auth to re-evaluate from (now-empty) storage
    void authClient.getSession({ query: { disableCookieCache: true } });
    return false;
  })();

  try {
    await refreshPromise;
  } finally {
    // Reset after a short delay to allow re-triggering for future expirations
    setTimeout(() => {
      refreshPromise = null;
    }, 2000);
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Allow one retry for UNAUTHORIZED so the refresh attempt can take effect
        if (
          (error as { data?: { code?: string } }).data?.code === "UNAUTHORIZED"
        ) {
          return failureCount < 1;
        }
        return failureCount < 3;
      },
      retryDelay: (failureCount, error) => {
        // Give the refresh promise time to resolve before retrying a 401
        if (
          (error as { data?: { code?: string } }).data?.code === "UNAUTHORIZED"
        ) {
          return 1500;
        }
        return Math.min(1000 * 2 ** failureCount, 30000);
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
