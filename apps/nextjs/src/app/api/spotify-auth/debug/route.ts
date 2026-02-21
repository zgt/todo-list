import { NextResponse } from "next/server";

import { env } from "~/env";

/**
 * GET /api/spotify-auth/debug
 * Shows the current refresh token's user info and scopes.
 * DELETE THIS ROUTE AFTER DEBUGGING.
 */
export async function GET() {
  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  // Refresh to get a fresh access token
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return NextResponse.json(
      { error: "Token refresh failed", details: err },
      { status: 500 },
    );
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    expires_in: number;
    scope: string;
  };

  // Get user profile
  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const me = (await meRes.json()) as Record<string, unknown>;

  return NextResponse.json({
    scopes: tokenData.scope,
    user: me,
    tokenRefreshOk: true,
  });
}
