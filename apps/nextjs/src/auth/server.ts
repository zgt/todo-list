import "server-only";

//import { networkInterfaces } from "node:os";
import { cache } from "react";
import { headers } from "next/headers";
import { nextCookies } from "better-auth/next-js";

import { initAuth } from "@acme/auth";

import { env } from "~/env";

/**
 * Get the local network IP address (e.g., 192.168.x.x or 10.0.0.x)
 * Falls back to localhost if not found

function getNetworkUrl(): string {
  const interfaces = networkInterfaces();
  // eslint-disable-next-line no-restricted-properties
  const port = process.env.PORT ?? 3000;

  // Find the first non-internal IPv4 address
  for (const interfaceName of Object.keys(interfaces)) {
    const nets = interfaces[interfaceName];
    if (!nets) continue;

    for (const net of nets) {
      if (net.family === "IPv4" && !net.internal) {
        return `http://${net.address}:${port}`;
      }
    }
  }

  // Fallback to localhost if no network interface found
  return `http://localhost:${port}`;
}
 */
const baseUrl =
  env.VERCEL_ENV === "production"
    ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
    : env.VERCEL_ENV === "preview"
      ? `https://${env.VERCEL_URL}`
      : `http://localhost:3000`;

export const auth = initAuth({
  baseUrl,
  productionUrl:
    env.AUTH_REDIRECT_PROXY_URL ??
    `https://${env.VERCEL_PROJECT_PRODUCTION_URL ?? "turbo.t3.gg"}`,
  secret: env.AUTH_SECRET,
  discordClientId: env.AUTH_DISCORD_ID,
  discordClientSecret: env.AUTH_DISCORD_SECRET,
  extraPlugins: [nextCookies()],
});

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
