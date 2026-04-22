import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";

import { db } from "@acme/db/client";

const BETTER_AUTH_SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

export const MOBILE_SESSION_HEADER = "x-mobile-session-token";

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
  sessionExpiresIn?: number;
  sessionUpdateAge?: number;
  sessionCookieCacheMaxAge?: number;
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
      expiresIn: options.sessionExpiresIn ?? 60 * 60 * 24 * 30, // 30 days
      updateAge: options.sessionUpdateAge ?? 60 * 60 * 24, // 24 hours
      cookieCache: {
        enabled: true,
        maxAge: options.sessionCookieCacheMaxAge ?? 5 * 60, // 5 minutes
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
export interface ResolvedSession {
  session: Session;
  user: User;
}

export function getMobileSessionTokenFromHeaders(headers: Headers): string | null {
  const explicitHeader = headers.get(MOBILE_SESSION_HEADER)?.trim();
  if (explicitHeader) {
    return explicitHeader;
  }

  const authorization = headers.get("authorization")?.trim();
  if (!authorization) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() ?? null;
}

export function getBetterAuthSessionTokenFromCookieHeader(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookieMap = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const name = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!name || !value) continue;

    cookieMap.set(name, value);
  }

  for (const baseName of BETTER_AUTH_SESSION_COOKIE_NAMES) {
    const chunkEntries = Array.from(cookieMap.entries())
      .filter(([name]) => name === baseName || name.startsWith(`${baseName}.`))
      .sort(([left], [right]) => {
        const leftChunk = Number(left.slice(baseName.length + 1) || "0");
        const rightChunk = Number(right.slice(baseName.length + 1) || "0");
        return leftChunk - rightChunk;
      });

    if (chunkEntries.length > 0) {
      return chunkEntries.map(([, value]) => value).join("");
    }
  }

  return null;
}

export async function resolveSessionByToken(
  rawToken: string,
): Promise<ResolvedSession | null> {
  const token = rawToken.trim();
  if (!token) {
    return null;
  }

  const result = await db.query.session.findFirst({
    where: (session, { and, eq, gt }) =>
      and(eq(session.token, token), gt(session.expiresAt, new Date())),
    with: {
      user: true,
    },
  });

  if (!result?.user) {
    return null;
  }

  const { user, ...session } = result;
  return {
    session: session as Session,
    user,
  };
}

export async function resolveLatestSessionForUser(input: {
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<ResolvedSession | null> {
  const { userId, userAgent, ipAddress } = input;
  const now = new Date();

  const candidateSessions = [
    userAgent && ipAddress
      ? await db.query.session.findFirst({
          where: (session, { and, eq, gt }) =>
            and(
              eq(session.userId, userId),
              eq(session.userAgent, userAgent),
              eq(session.ipAddress, ipAddress),
              gt(session.expiresAt, now),
            ),
          with: { user: true },
          orderBy: (session, { desc }) => [
            desc(session.createdAt),
            desc(session.updatedAt),
          ],
        })
      : null,
    userAgent
      ? await db.query.session.findFirst({
          where: (session, { and, eq, gt }) =>
            and(
              eq(session.userId, userId),
              eq(session.userAgent, userAgent),
              gt(session.expiresAt, now),
            ),
          with: { user: true },
          orderBy: (session, { desc }) => [
            desc(session.createdAt),
            desc(session.updatedAt),
          ],
        })
      : null,
    ipAddress
      ? await db.query.session.findFirst({
          where: (session, { and, eq, gt }) =>
            and(
              eq(session.userId, userId),
              eq(session.ipAddress, ipAddress),
              gt(session.expiresAt, now),
            ),
          with: { user: true },
          orderBy: (session, { desc }) => [
            desc(session.createdAt),
            desc(session.updatedAt),
          ],
        })
      : null,
  ];

  for (const candidate of candidateSessions) {
    if (candidate?.user) {
      const { user, ...session } = candidate;
      return {
        session: session as Session,
        user,
      };
    }
  }

  const activeSessions = await db.query.session.findMany({
    where: (session, { and, eq, gt }) =>
      and(eq(session.userId, userId), gt(session.expiresAt, now)),
    with: { user: true },
    orderBy: (session, { desc }) => [
      desc(session.createdAt),
      desc(session.updatedAt),
    ],
    limit: 2,
  });

  if (activeSessions.length === 1 && activeSessions[0]?.user) {
    const { user, ...session } = activeSessions[0];
    return {
      session: session as Session,
      user,
    };
  }

  return null;
}
