import type { NextRequest } from "next/server";

import { auth } from "~/auth/server";
import { env } from "~/env";

const DEBUG_AUTH = env.NODE_ENV === "production" || env.AUTH_TRACE === "1";

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

function getCookieNames(cookie: string | null): string[] {
  if (!cookie) return [];

  return cookie
    .split(";")
    .map((part) => part.trim().split("=", 1)[0])
    .filter((name): name is string => !!name);
}

function getSetCookieNames(setCookie: string | null): string[] {
  if (!setCookie) return [];

  return setCookie
    .split(/,(?=\s*[^;,=\s]+=)/)
    .map((cookie) => cookie.trim().split("=", 1)[0])
    .filter((name): name is string => !!name);
}

function authTrace(message: string, details?: Record<string, unknown>): void {
  if (!DEBUG_AUTH) return;
  if (details) {
    console.log(`[AuthTrace][next-auth] ${message}`, details);
    return;
  }
  console.log(`[AuthTrace][next-auth] ${message}`);
}

const handler = async (req: NextRequest) => {
  const traceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  authTrace("handling auth request", {
    traceId,
    method: req.method,
    path: req.nextUrl.pathname,
    query: req.nextUrl.search,
    incomingCookieNames: getCookieNames(req.headers.get("cookie")),
    incomingCookie: cookieFingerprint(req.headers.get("cookie")),
  });

  const response = await auth.handler(req);

  authTrace("completed auth request", {
    traceId,
    status: response.status,
    setCookieNames: getSetCookieNames(response.headers.get("set-cookie")),
    setCookie: cookieFingerprint(response.headers.get("set-cookie")),
  });

  return response;
};

export const GET = handler;
export const POST = handler;
