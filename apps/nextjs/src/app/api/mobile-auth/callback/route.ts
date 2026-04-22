import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getBetterAuthSessionTokenFromCookieHeader,
  resolveLatestSessionForUser,
  resolveSessionByToken,
} from "@acme/auth";

import { auth } from "~/auth/server";
import { env } from "~/env";

const CALLBACK_REDIRECT_BASE = "tokilist://auth/callback";
const DEBUG_AUTH = env.AUTH_TRACE === "1";

function djb2(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function fingerprint(value: string | null | undefined): string {
  if (!value) return "none";
  return `${value.length}:${djb2(value)}`;
}

function authTrace(message: string, details?: Record<string, unknown>): void {
  if (!DEBUG_AUTH) return;
  if (details) {
    console.log(`[AuthTrace][mobile-callback] ${message}`, details);
    return;
  }
  console.log(`[AuthTrace][mobile-callback] ${message}`);
}

function buildMobileRedirect(params: Record<string, string>) {
  const redirectUrl = new URL(CALLBACK_REDIRECT_BASE);
  for (const [key, value] of Object.entries(params)) {
    redirectUrl.searchParams.set(key, value);
  }
  return NextResponse.redirect(redirectUrl, { status: 302 });
}

function getClientIpAddress(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip");
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const traceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const error = request.nextUrl.searchParams.get("error");
  authTrace("handling mobile auth callback", {
    traceId,
    path: request.nextUrl.pathname,
    query: request.nextUrl.search,
    incomingCookie: fingerprint(request.headers.get("cookie")),
    userAgent: request.headers.get("user-agent"),
    ipAddress: getClientIpAddress(request),
  });

  if (error) {
    const errorDescription =
      request.nextUrl.searchParams.get("error_description") ??
      request.nextUrl.searchParams.get("message");

    authTrace("callback reported error", {
      traceId,
      error,
      errorDescription,
    });
    return buildMobileRedirect({
      error,
      ...(errorDescription ? { error_description: errorDescription } : {}),
    });
  }

  const cookieToken = getBetterAuthSessionTokenFromCookieHeader(
    request.headers.get("cookie"),
  );
  authTrace("resolved cookie token from callback request", {
    traceId,
    cookieToken: fingerprint(cookieToken),
  });

  if (cookieToken) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const resolvedFromCookie = await resolveSessionByToken(cookieToken);
      if (resolvedFromCookie) {
        authTrace("resolved session directly from callback cookie token", {
          traceId,
          attempt,
          userId: resolvedFromCookie.user.id,
          sessionToken: fingerprint(resolvedFromCookie.session.token),
        });
        return buildMobileRedirect({ token: resolvedFromCookie.session.token });
      }
      authTrace("cookie token did not resolve yet", {
        traceId,
        attempt,
        cookieToken: fingerprint(cookieToken),
      });
      await sleep(150);
    }
  }

  const currentSession = await auth.api.getSession({
    headers: request.headers,
  });
  authTrace("resolved Better Auth session inside mobile callback", {
    traceId,
    hasSession: !!currentSession?.session,
    userId: currentSession?.user.id ?? null,
  });

  const userId = currentSession?.user.id;
  if (!userId) {
    authTrace("mobile callback could not resolve authenticated user", {
      traceId,
    });
    return buildMobileRedirect({ error: "session_not_found" });
  }

  const fallbackSession = await resolveLatestSessionForUser({
    userId,
    userAgent: request.headers.get("user-agent"),
    ipAddress: getClientIpAddress(request),
  });

  if (!fallbackSession) {
    authTrace("mobile callback fallback lookup did not find a session", {
      traceId,
      userId,
    });
    return buildMobileRedirect({ error: "session_not_found" });
  }

  authTrace("mobile callback resolved fallback session", {
    traceId,
    userId,
    sessionToken: fingerprint(fallbackSession.session.token),
  });
  return buildMobileRedirect({ token: fallbackSession.session.token });
}
