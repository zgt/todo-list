import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";

import { db } from "@acme/db/client";

export function initAuth<
  TExtraPlugins extends BetterAuthPlugin[] = [],
>(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;

  discordClientId: string;
  discordClientSecret: string;
  extraPlugins?: TExtraPlugins;
  /**
   * Enable OAuth proxy for Expo mobile app support.
   * Set to true only if you need to support OAuth redirects from Expo.
   * Default: false (web-only, no proxy interference)
   *
   * @see https://www.better-auth.com/docs/plugins/oauth-proxy
   */
  enableOAuthProxy?: boolean;
}) {
  const plugins: BetterAuthPlugin[] = [];

  // Only enable oAuthProxy when explicitly requested (for Expo support)
  if (options.enableOAuthProxy) {
    plugins.push(
      oAuthProxy({
        productionURL: options.productionUrl,
        currentURL: "expo://",
      }),
    );
  }

  plugins.push(expo());
  plugins.push(...(options.extraPlugins ?? []));

  const config = {
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    baseURL: options.baseUrl,
    secret: options.secret,
    plugins,
    socialProviders: {
      discord: {
        clientId: options.discordClientId,
        clientSecret: options.discordClientSecret,
        // Use baseUrl for local and production, it defaults to production on Vercel
        redirectURI: `${options.baseUrl}/api/auth/callback/discord`,
      },
    },
    trustedOrigins: [
      "todolist://",
      "exp://",
      "https://*.exp.direct",
      "http://localhost:*",
      options.productionUrl,
      options.baseUrl,
    ],
    onAPIError: {
      onError(error, ctx) {
        console.error("BETTER AUTH API ERROR", error, ctx);
      },
    },
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
