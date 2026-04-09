import type { NextRequest } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter, createTRPCContext } from "@acme/api";

import { auth } from "~/auth/server";

const DEBUG_AUTH = process.env.AUTH_TRACE === "1";

function djb2(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function cookieFingerprint(cookie: string | null): string {
  if (!cookie) return "none";
  return `${cookie.length}:${djb2(cookie)}`;
}

function authTrace(message: string, details?: Record<string, unknown>): void {
  if (!DEBUG_AUTH) return;
  if (details) {
    console.log(`[AuthTrace][next-trpc] ${message}`, details);
    return;
  }
  console.log(`[AuthTrace][next-trpc] ${message}`);
}

/**
 * Configure basic CORS headers
 * You should extend this to match your needs
 */
const setCorsHeaders = (res: Response) => {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Request-Method", "*");
  res.headers.set("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
  res.headers.set("Access-Control-Allow-Headers", "*");
};

export const OPTIONS = () => {
  const response = new Response(null, {
    status: 204,
  });
  setCorsHeaders(response);
  return response;
};

const handler = async (req: NextRequest) => {
  const traceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  authTrace("handling tRPC request", {
    traceId,
    method: req.method,
    path: req.nextUrl.pathname,
    source: req.headers.get("x-trpc-source") ?? "unknown",
    incomingCookie: cookieFingerprint(req.headers.get("cookie")),
  });

  // Pre-resolve the session with returnHeaders so we can capture Set-Cookie
  // headers from Better Auth's session token refresh (updateAge). Without this,
  // the refreshed token is written to the DB but never sent to the client,
  // causing 401 loops after updateAge (24h) on Expo.
  //
  // With cookieCache enabled, most calls read from the signed cookie (no DB hit,
  // no token rotation). Rotation only occurs when the cache expires AND updateAge
  // has passed — dramatically reducing the concurrent-rotation race window.
  const authResult = await auth.api.getSession({
    headers: req.headers,
    returnHeaders: true,
  });
  authTrace("resolved Better Auth session for tRPC request", {
    traceId,
    hasSession: !!authResult.response?.session,
    setCookies:
      authResult.headers?.getSetCookie?.().map((cookie) =>
        cookieFingerprint(cookie),
      ) ?? [],
  });

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    router: appRouter,
    req,
    createContext: () =>
      createTRPCContext({
        auth: auth,
        headers: req.headers,
        session: authResult.response,
      }),
    onError({ error, path }) {
      authTrace("tRPC handler error", {
        traceId,
        path,
        code: error.code,
      });
      console.error(`>>> tRPC Error on '${path}'`, error);
    },
  });

  setCorsHeaders(response);

  // Forward Set-Cookie from auth session refresh to the client.
  // This ensures the Expo app receives the refreshed session token.
  const setCookies = authResult.headers?.getSetCookie?.();
  if (setCookies?.length) {
    console.log(
      `[Auth] Forwarding ${setCookies.length} Set-Cookie header(s) to tRPC response`,
    );
    for (const cookie of setCookies) {
      response.headers.append("set-cookie", cookie);
    }
  }

  authTrace("completed tRPC response", {
    traceId,
    status: response.status,
    forwardedSetCookies:
      setCookies?.map((cookie) => cookieFingerprint(cookie)) ?? [],
  });

  return response;
};

export { handler as GET, handler as POST };
