import { NextResponse } from "next/server";

import { env } from "~/env";

const SCOPES = "playlist-modify-public playlist-modify-private";

function getRedirectUri() {
  // eslint-disable-next-line no-restricted-properties -- Vercel system env vars, not suitable for build-time validation
  const base = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? // eslint-disable-next-line no-restricted-properties
      `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : // eslint-disable-next-line no-restricted-properties
      process.env.VERCEL_URL
      ? // eslint-disable-next-line no-restricted-properties
        `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  return `${base}/api/spotify-auth/callback`;
}

/**
 * GET /api/spotify-auth
 * Redirects to Spotify authorization page.
 * Only works if SPOTIFY_CLIENT_ID is set.
 */
export function GET() {
  const clientId = env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Spotify not configured" },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
  });

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`,
  );
}
