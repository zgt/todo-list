import { NextResponse } from "next/server";

import { env } from "~/env";

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
 * GET /api/spotify-auth/callback
 * Exchanges the authorization code for tokens and displays the refresh token.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "No code received" }, { status: 400 });
  }

  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Spotify not configured" },
      { status: 500 },
    );
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return NextResponse.json(
      { error: "Token exchange failed", details: err },
      { status: 500 },
    );
  }

  const data = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };

  // Return a simple HTML page with the refresh token
  const html = `<!DOCTYPE html>
<html>
<head><title>Spotify Auth Complete</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px;">
  <h1>✅ Spotify Auth Complete</h1>
  <p>Copy this refresh token and add it as <code>SPOTIFY_REFRESH_TOKEN</code> in your Vercel environment variables:</p>
  <pre style="background: #f0f0f0; padding: 16px; border-radius: 8px; word-break: break-all; user-select: all;">${data.refresh_token}</pre>
  <p style="color: #666;">After adding it to Vercel, redeploy. Then delete this route if you want (it's a one-time setup).</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
