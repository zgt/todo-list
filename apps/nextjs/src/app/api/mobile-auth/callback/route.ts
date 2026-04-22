import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getBetterAuthSessionTokenFromCookieHeader,
  resolveLatestSessionForUser,
  resolveSessionByToken,
} from "@acme/auth";

import { auth } from "~/auth/server";

const CALLBACK_REDIRECT_BASE = "tokilist://auth/callback";

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
  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    const errorDescription =
      request.nextUrl.searchParams.get("error_description") ??
      request.nextUrl.searchParams.get("message");

    return buildMobileRedirect({
      error,
      ...(errorDescription ? { error_description: errorDescription } : {}),
    });
  }

  const cookieToken = getBetterAuthSessionTokenFromCookieHeader(
    request.headers.get("cookie"),
  );

  if (cookieToken) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const resolvedFromCookie = await resolveSessionByToken(cookieToken);
      if (resolvedFromCookie) {
        return buildMobileRedirect({ token: resolvedFromCookie.session.token });
      }
      await sleep(150);
    }
  }

  const currentSession = await auth.api.getSession({
    headers: request.headers,
  });

  const userId = currentSession?.user.id;
  if (!userId) {
    return buildMobileRedirect({ error: "session_not_found" });
  }

  const fallbackSession = await resolveLatestSessionForUser({
    userId,
    userAgent: request.headers.get("user-agent"),
    ipAddress: getClientIpAddress(request),
  });

  if (!fallbackSession) {
    return buildMobileRedirect({ error: "session_not_found" });
  }

  return buildMobileRedirect({ token: fallbackSession.session.token });
}
