import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { nextCookies } from "better-auth/next-js";

import { initAuth } from "@acme/auth";

import { env } from "~/env";

const baseUrl =
  env.VERCEL_ENV === "production"
    ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
    : env.VERCEL_ENV === "preview"
      ? `https://${env.VERCEL_URL}`
      : (env.AUTH_REDIRECT_PROXY_URL ?? `http://localhost:3000`);

export const auth = initAuth({
  baseUrl,
  productionUrl:
    env.AUTH_REDIRECT_PROXY_URL ??
    `https://${env.VERCEL_PROJECT_PRODUCTION_URL ?? "https://calayo.net"}`,
  secret: env.AUTH_SECRET,
  discordClientId: env.AUTH_DISCORD_ID,
  discordClientSecret: env.AUTH_DISCORD_SECRET,
  appleClientId: env.AUTH_APPLE_ID,
  appleClientSecret: env.AUTH_APPLE_SECRET,
  appleBundleId: env.AUTH_APPLE_BUNDLE_ID,
  extraPlugins: [nextCookies()],
  enableOAuthProxy: true, // Enable OAuth proxy for Expo OAuth support
});

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
