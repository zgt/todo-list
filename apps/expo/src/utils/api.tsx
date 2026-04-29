import * as Linking from "expo-linking";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import type { AppRouter } from "@acme/api";

import {
  authClient,
  clearAuthStorage,
  fetchMobileSession,
  getMobileSessionToken,
  getTrpcCookieHeader,
  syncMobileSessionTokenFromSession,
} from "./auth";
import { beginAuthTransition, endAuthTransition, waitForAuthReady } from "./auth-gate";
import { authTrace, cookieFingerprint, nextTraceId } from "./auth-debug";
import { getBaseUrl } from "./base-url";

const EXPO_ORIGIN = Linking.createURL("", { scheme: "tokilist" });
let trpcSessionSyncPromise: Promise<void> | null = null;

async function reconcileSessionFromAuthRoute(reason: string): Promise<void> {
  if (trpcSessionSyncPromise) {
    authTrace("trpc-fetch", "joining post-response auth reconcile", {
      reason,
    });
    await trpcSessionSyncPromise;
    return;
  }

  trpcSessionSyncPromise = (async () => {
    beginAuthTransition("trpc-session-reconcile");
    const traceId = nextTraceId("trpc-session-reconcile");

    try {
      authTrace("trpc-fetch", "starting post-response auth reconcile", {
        reason,
        traceId,
        cookieBeforeReconcile: cookieFingerprint(getTrpcCookieHeader()),
      });
      const sessionResult = await authClient.getSession({
        query: { disableCookieCache: true },
      });
      syncMobileSessionTokenFromSession(sessionResult.data);
      authTrace("trpc-fetch", "completed post-response auth reconcile", {
        reason,
        traceId,
        cookieAfterReconcile: cookieFingerprint(getTrpcCookieHeader()),
      });
    } finally {
      endAuthTransition("trpc-session-reconcile");
      trpcSessionSyncPromise = null;
    }
  })();

  await trpcSessionSyncPromise;
}

/**
 * Custom fetch that treats Set-Cookie from tRPC as a signal to reconcile the
 * canonical Better Auth session via authClient.getSession(). We intentionally
 * avoid manually merging flattened Set-Cookie headers from tRPC into storage.
 */
type TrpcFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const trpcFetch: TrpcFetch = async (input, init) => {
  const traceId = nextTraceId("trpc-fetch");
  const requestHeaders = new Headers(init?.headers);
  const cookieBeforeWait = requestHeaders.get("cookie");
  await waitForAuthReady("trpc-fetch");

  const latestCookie = getTrpcCookieHeader();
  const mobileSessionToken = getMobileSessionToken();
  if (mobileSessionToken) {
    requestHeaders.set("x-mobile-session-token", mobileSessionToken);
    requestHeaders.delete("cookie");
  } else if (latestCookie) {
    requestHeaders.delete("x-mobile-session-token");
    requestHeaders.set("cookie", latestCookie);
  } else {
    requestHeaders.delete("cookie");
    requestHeaders.delete("x-mobile-session-token");
  }

  const outgoingCookie = requestHeaders.get("cookie");
  authTrace("trpc-fetch", "dispatching tRPC request", {
    traceId,
    url:
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : "request",
    method: init?.method ?? "GET",
    cookieBeforeWait: cookieFingerprint(cookieBeforeWait),
    outgoingCookie: cookieFingerprint(outgoingCookie),
    mobileToken: cookieFingerprint(mobileSessionToken),
    outgoingMobileHeader: cookieFingerprint(
      requestHeaders.get("x-mobile-session-token"),
    ),
  });

  const response = await fetch(input instanceof URL ? input.href : input, {
    ...init,
    credentials: "omit",
    headers: requestHeaders,
  });
  try {
    const setCookie = response.headers.get("set-cookie");
    authTrace("trpc-fetch", "received tRPC response", {
      traceId,
      status: response.status,
      setCookie: cookieFingerprint(setCookie),
    });
    if (setCookie) {
      await reconcileSessionFromAuthRoute("trpc-set-cookie");
    }
  } catch (e) {
    console.warn("[Auth] Failed to reconcile auth state from tRPC response:", e);
  }
  return response;
};

/**
 * Global handler for UNAUTHORIZED errors from tRPC.
 * Uses a shared promise so concurrent 401s coalesce into one refresh attempt.
 * Only clears auth state if the refresh truly fails.
 * Once signed out, stops retrying until the user logs in again.
 */
let refreshPromise: Promise<boolean> | null = null;
let hasSignedOut = false;

async function handleUnauthorizedError(): Promise<void> {
  const traceId = nextTraceId("unauthorized");

  // If we already signed out this app lifecycle, don't keep retrying
  if (hasSignedOut) {
    authTrace("unauthorized", "ignoring 401 after sign-out guard tripped", {
      traceId,
    });
    return;
  }

  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    authTrace("unauthorized", "joining existing refresh promise", {
      traceId,
    });
    await refreshPromise;
    return;
  }

  refreshPromise = (async () => {
    beginAuthTransition("unauthorized-refresh");
    let recovered = false;

    try {
      // Attempt to refresh the session through Better Auth's fetch pipeline.
      // This processes Set-Cookie responses and updates SecureStore.
      console.warn("[Auth] Got 401 — attempting session refresh before logout");
      authTrace("unauthorized", "starting recovery refresh", {
        traceId,
        cookieBeforeRefresh: cookieFingerprint(getTrpcCookieHeader()),
      });
      const result = await authClient.getSession({
        query: { disableCookieCache: true },
      });
      syncMobileSessionTokenFromSession(result.data);

      if (result.data?.session) {
        console.log(
          "[Auth] Session refresh succeeded — refetching with fresh cookies",
        );
        authTrace("unauthorized", "recovery refresh succeeded", {
          traceId,
          cookieAfterRefresh: cookieFingerprint(getTrpcCookieHeader()),
        });
        // Small delay to let cookie sync to SecureStore before queries fire
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 150);
        });
        recovered = true;
        void queryClient.invalidateQueries();
      }
    } catch (error) {
      console.warn("[Auth] Session refresh threw", error);
      authTrace("unauthorized", "recovery refresh threw", {
        traceId,
        error:
          error instanceof Error ? error.message : "non-error refresh failure",
      });
    } finally {
      endAuthTransition("unauthorized-refresh");
    }

    if (recovered) {
      return true;
    }

    const mobileSession = await fetchMobileSession();
    if (mobileSession?.session) {
      authTrace("unauthorized", "recovered from stored mobile token", {
        traceId,
        userId: mobileSession.user.id,
      });
      recovered = true;
      void queryClient.invalidateQueries();
      return true;
    }

    console.warn("[Auth] Session unrecoverable — clearing local auth state");
    authTrace("unauthorized", "recovery refresh failed; clearing auth state", {
      traceId,
      cookieAfterFailure: cookieFingerprint(getTrpcCookieHeader()),
    });
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
  authTrace("unauthorized", "resetting sign-out guard", {
    hadSignedOut: hasSignedOut,
  });
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
      fetch: trpcFetch,
      headers() {
        const headers: Record<string, string> = {
          "x-trpc-source": "expo-vanilla",
          "expo-origin": EXPO_ORIGIN,
          "x-skip-oauth-proxy": "true",
        };

        const mobileToken = getMobileSessionToken();
        if (mobileToken) {
          headers["x-mobile-session-token"] = mobileToken;
        } else {
          const cookies = getTrpcCookieHeader();
          if (cookies) {
            headers.cookie = cookies;
          }
        }

        authTrace("trpc-headers", "prepared vanilla tRPC headers", {
          source: headers["x-trpc-source"],
          cookie: cookieFingerprint(headers.cookie),
          mobileToken: cookieFingerprint(headers["x-mobile-session-token"]),
        });
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
        fetch: trpcFetch,
        headers() {
          const headers: Record<string, string> = {
            "x-trpc-source": "expo-react",
            "expo-origin": EXPO_ORIGIN,
            "x-skip-oauth-proxy": "true",
          };

          const mobileToken = getMobileSessionToken();
          if (mobileToken) {
            headers["x-mobile-session-token"] = mobileToken;
          } else {
            const cookies = getTrpcCookieHeader();
            if (cookies) {
              headers.cookie = cookies;
            }
          }
          authTrace("trpc-headers", "prepared react tRPC headers", {
            source: headers["x-trpc-source"],
            cookie: cookieFingerprint(headers.cookie),
            mobileToken: cookieFingerprint(headers["x-mobile-session-token"]),
          });
          return headers;
        },
      }),
    ],
  }),
  queryClient,
});

export type { RouterInputs, RouterOutputs } from "@acme/api";
