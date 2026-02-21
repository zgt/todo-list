const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

export interface SpotifyTrack {
  spotifyTrackId: string;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArtUrl: string | null;
  previewUrl: string | null;
  trackDurationMs: number;
}

// --- Token management ---

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = data.access_token;
  // Refresh 60s before actual expiry to avoid edge cases
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

  return cachedToken;
}

async function spotifyFetch<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`Spotify API error: ${res.status} ${res.statusText}`, {
      path,
      errorBody,
    });
    throw new Error(
      `Spotify API error: ${res.status} ${res.statusText} - ${errorBody}`,
    );
  }

  return res.json() as Promise<T>;
}

// --- Spotify API types (subset) ---

interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyAlbum {
  name: string;
  images: SpotifyImage[];
}

interface SpotifyTrackRaw {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  preview_url: string | null;
  duration_ms: number;
  uri: string;
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrackRaw[];
  };
}

// --- Helpers ---

function mapTrack(raw: SpotifyTrackRaw): SpotifyTrack {
  return {
    spotifyTrackId: raw.id,
    trackName: raw.name,
    artistName: raw.artists.map((a) => a.name).join(", "),
    albumName: raw.album.name,
    albumArtUrl: raw.album.images[0]?.url ?? null,
    previewUrl: raw.preview_url,
    trackDurationMs: raw.duration_ms,
  };
}

// --- Public API ---

export async function searchTracks(
  query: string,
  limit = 10,
): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: String(limit),
  });

  const data = await spotifyFetch<SpotifySearchResponse>(
    `/search?${params.toString()}`,
  );

  return data.tracks.items.map(mapTrack);
}

export async function getTrack(trackId: string): Promise<SpotifyTrack> {
  const raw = await spotifyFetch<SpotifyTrackRaw>(`/tracks/${trackId}`);
  return mapTrack(raw);
}

// --- User-level token (for playlist creation) ---

let cachedUserToken: string | null = null;
let userTokenExpiresAt = 0;

async function getUserAccessToken(): Promise<string> {
  if (cachedUserToken && Date.now() < userTokenExpiresAt) {
    return cachedUserToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, or SPOTIFY_REFRESH_TOKEN",
    );
  }

  const res = await fetch(TOKEN_URL, {
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

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("Failed to refresh Spotify user token:", errorBody);
    throw new Error(`Failed to refresh Spotify user token: ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedUserToken = data.access_token;
  userTokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

  return cachedUserToken;
}

/**
 * Creates a public Spotify playlist and adds tracks to it.
 * Uses the app owner's account via refresh token.
 */
export async function createPlaylist(
  name: string,
  description: string,
  trackIds: string[],
): Promise<string> {
  const token = await getUserAccessToken();

  // Create playlist using /me/playlists (required for dev mode apps)
  const createRes = await fetch(`${API_BASE}/me/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      description,
      public: true,
    }),
  });

  if (!createRes.ok) {
    const errorBody = await createRes.text();
    console.error("Failed to create Spotify playlist:", errorBody);
    throw new Error(`Failed to create Spotify playlist: ${createRes.status}`);
  }

  const playlist = (await createRes.json()) as {
    id: string;
    external_urls: { spotify: string };
  };

  // Add tracks in batches of 100
  const uris = trackIds.map((id) => `spotify:track:${id}`);
  for (let i = 0; i < uris.length; i += 100) {
    const batch = uris.slice(i, i + 100);
    const addRes = await fetch(`${API_BASE}/playlists/${playlist.id}/items`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: batch }),
    });

    if (!addRes.ok) {
      const errorBody = await addRes.text();
      console.error("Failed to add tracks to playlist:", errorBody);
      throw new Error(`Failed to add tracks to playlist: ${addRes.status}`);
    }
  }

  return playlist.external_urls.spotify;
}
