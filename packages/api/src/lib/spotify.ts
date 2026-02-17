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
    throw new Error(`Spotify API error: ${res.status} ${res.statusText}`);
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
