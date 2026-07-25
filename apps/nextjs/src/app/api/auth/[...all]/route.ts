import type { NextRequest } from "next/server";

import { auth } from "~/auth/server";
import { env } from "~/env";

// Tracing is strictly opt-in via AUTH_TRACE — never enabled by default in any
// environment, and never logs query values or cookie-derived material.
const DEBUG_AUTH = env.AUTH_TRACE === "1";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function getSessionTraceDetails(
  req: NextRequest,
  response: Response,
): Promise<Record<string, unknown>> {
  if (!req.nextUrl.pathname.endsWith("/get-session")) return {};

  try {
    const body: unknown = await response.clone().json();
    return {
      getSessionHasBody: body !== null,
      getSessionHasSession: isRecord(body) && isRecord(body.session),
      getSessionHasUser: isRecord(body) && isRecord(body.user),
    };
  } catch {
    return { getSessionBodyParseFailed: true };
  }
}

const handler = async (req: NextRequest) => {
  const traceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  authTrace("handling auth request", {
    traceId,
    method: req.method,
    path: req.nextUrl.pathname,
    // Param names only — query values carry OAuth authorization codes.
    queryParamNames: [...req.nextUrl.searchParams.keys()],
    incomingCookieNames: getCookieNames(req.headers.get("cookie")),
  });

  const response = await auth.handler(req);
  const sessionTraceDetails = await getSessionTraceDetails(req, response);

  authTrace("completed auth request", {
    traceId,
    status: response.status,
    setCookieNames: getSetCookieNames(response.headers.get("set-cookie")),
    ...sessionTraceDetails,
  });

  return response;
};

export const GET = handler;
export const POST = handler;
