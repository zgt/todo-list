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
  appleClientId?: string;
  appleClientSecret?: string;
  appleBundleId?: string;
  googleClientId?: string;
  googleClientSecret?: string;
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
        currentURL: options.baseUrl,
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
        redirectURI: `${options.productionUrl}/api/auth/callback/discord`,
      },
      ...(options.googleClientId &&
        options.googleClientSecret && {
          google: {
            clientId: options.googleClientId,
            clientSecret: options.googleClientSecret,
            redirectURI: `${options.productionUrl}/api/auth/callback/google`,
          },
        }),
      ...(options.appleClientId &&
        options.appleClientSecret && {
          apple: {
            clientId: options.appleClientId,
            clientSecret: options.appleClientSecret,
            appBundleIdentifier: options.appleBundleId,
            redirectURI: `${options.productionUrl}/api/auth/callback/apple`,
          },
        }),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // 24 hours
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },
    trustedOrigins: [
      "tokilist://",
      "exp://",
      "exp://**", // Wildcard for development (Expo Go)
      "exp://192.168.*.*:*/**", // Wildcard for local network development
      "https://*.exp.direct",
      "http://localhost:*",
      "https://appleid.apple.com", // Required for Sign in with Apple
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
export type Session = Auth["$Infer"]["Session"]["session"];
export type User = Auth["$Infer"]["Session"]["user"];
