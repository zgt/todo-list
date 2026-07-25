import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { nextCookies } from "better-auth/next-js";

import { initAuth } from "@acme/auth";

import { env } from "~/env";

const PRODUCTION_DOMAIN = "https://toki.calayo.net";

const baseUrl =
  env.VERCEL_ENV === "production"
    ? PRODUCTION_DOMAIN
    : env.VERCEL_ENV === "preview"
      ? `https://${env.VERCEL_URL}`
      : (env.AUTH_REDIRECT_PROXY_URL ?? `http://localhost:3000`);

/**
 * AUTH_DEBUG_* session-lifetime overrides are debug-only: never honor them in
 * the production environment, where a stray/leftover env var would silently
 * shorten every user's session.
 */
const allowDebugSessionOverrides =
  env.VERCEL_ENV !== "production" && env.NODE_ENV !== "production";

export const auth = initAuth({
  baseUrl,
  productionUrl: env.AUTH_REDIRECT_PROXY_URL ?? PRODUCTION_DOMAIN,
  secret: env.AUTH_SECRET,
  discordClientId: env.AUTH_DISCORD_ID,
  discordClientSecret: env.AUTH_DISCORD_SECRET,
  appleClientId: env.AUTH_APPLE_ID,
  appleClientSecret: env.AUTH_APPLE_SECRET,
  appleBundleId: env.AUTH_APPLE_BUNDLE_ID,
  googleClientId: env.AUTH_GOOGLE_ID,
  googleClientSecret: env.AUTH_GOOGLE_SECRET,
  sessionExpiresIn: allowDebugSessionOverrides
    ? env.AUTH_DEBUG_SESSION_EXPIRES_IN_SEC
    : undefined,
  sessionUpdateAge: allowDebugSessionOverrides
    ? env.AUTH_DEBUG_UPDATE_AGE_SEC
    : undefined,
  sessionCookieCacheMaxAge: allowDebugSessionOverrides
    ? env.AUTH_DEBUG_COOKIE_CACHE_MAX_AGE_SEC
    : undefined,
  extraPlugins: [nextCookies()],
  enableOAuthProxy: true, // Enable OAuth proxy for Expo OAuth support
});

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
