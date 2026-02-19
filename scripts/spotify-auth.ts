/**
 * One-time script to get a Spotify refresh token for playlist creation.
 *
 * Usage:
 *   npx tsx scripts/spotify-auth.ts
 *
 * 1. Opens a browser to Spotify's authorization page
 * 2. After you approve, Spotify redirects to localhost with a code
 * 3. The script exchanges the code for tokens and prints the refresh token
 *
 * Set the refresh token as SPOTIFY_REFRESH_TOKEN in your .env
 */

import http from "node:http";
import { URL } from "node:url";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:8888/callback";
const SCOPES = "playlist-modify-public playlist-modify-private";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables first.",
  );
  process.exit(1);
}

const authUrl = new URL("https://accounts.spotify.com/authorize");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("scope", SCOPES);

console.log("\nOpen this URL in your browser:\n");
console.log(authUrl.toString());
console.log("\nWaiting for callback...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:8888`);

  if (url.pathname !== "/callback") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400);
    res.end(`Authorization failed: ${error}`);
    console.error(`Authorization failed: ${error}`);
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400);
    res.end("No code received");
    return;
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    res.writeHead(500);
    res.end(`Token exchange failed: ${err}`);
    console.error("Token exchange failed:", err);
    process.exit(1);
  }

  const data = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(
    "<h1>Success!</h1><p>You can close this tab. Check your terminal for the refresh token.</p>",
  );

  console.log("=".repeat(60));
  console.log("SPOTIFY_REFRESH_TOKEN:", data.refresh_token);
  console.log("=".repeat(60));
  console.log("\nAdd this to your .env file:");
  console.log(`SPOTIFY_REFRESH_TOKEN=${data.refresh_token}`);
  console.log(
    "\nAlso add it to your Vercel environment variables.",
  );

  server.close();
  process.exit(0);
});

server.listen(8888, () => {
  console.log("Listening on http://localhost:8888 for OAuth callback...");
});
