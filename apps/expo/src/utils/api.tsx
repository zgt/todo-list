import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import type { AppRouter } from "@acme/api";

import { authClient, clearAuthStorage } from "./auth";
import { getBaseUrl } from "./base-url";

/**
 * Global handler for UNAUTHORIZED errors from tRPC.
 * When the server rejects a stale session, we clear local auth tokens
 * and the query cache so the app falls back to the login screen.
 */
let isHandlingUnauthorized = false;

function handleUnauthorizedError() {
  if (isHandlingUnauthorized) return;
  isHandlingUnauthorized = true;

  console.warn("[Auth] Session expired — clearing local auth state");
  clearAuthStorage();
  queryClient.clear();

  // Force Better Auth to re-evaluate session from (now-empty) storage
  void authClient.getSession({ query: { disableCookieCache: true } });

  // Reset the guard after a short delay to allow re-triggering if needed
  setTimeout(() => {
    isHandlingUnauthorized = false;
  }, 2000);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry UNAUTHORIZED — the session is dead
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
        handleUnauthorizedError();
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
          headers.Cookie = cookies;
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
          console.log(`[AUTH DEBUG CLIENT] baseUrl: ${getBaseUrl()}`);
          console.log(`[AUTH DEBUG CLIENT] getCookie() returned: ${cookies ? `"${cookies.substring(0, 80)}..."` : "null/empty"}`);
          if (cookies) {
            headers.Cookie = cookies;
          }
          return headers;
        },
      }),
    ],
  }),
  queryClient,
});

export type { RouterInputs, RouterOutputs } from "@acme/api";
