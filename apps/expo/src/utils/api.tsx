import * as Linking from "expo-linking";
import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import type { AppRouter } from "@acme/api";

import { authClient } from "./auth";
import { getBaseUrl } from "./base-url";

const EXPO_ORIGIN = Linking.createURL("", { scheme: "tokilist" });

export const queryClient = new QueryClient();

function getTrpcHeaders(source: string): Record<string, string> {
  const headers: Record<string, string> = {
    "x-trpc-source": source,
    "expo-origin": EXPO_ORIGIN,
    "x-skip-oauth-proxy": "true",
  };

  const cookies = authClient.getCookie();
  if (cookies) {
    headers.cookie = cookies;
  }

  return headers;
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
        return fetch(url instanceof URL ? url.href : url, {
          ...options,
          credentials: "omit",
        });
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
          return fetch(url instanceof URL ? url.href : url, {
            ...options,
            credentials: "omit",
          });
        },
        headers: () => getTrpcHeaders("expo-react"),
      }),
    ],
  }),
  queryClient,
});

export type { RouterInputs, RouterOutputs } from "@acme/api";
