"use client";

import Image from "next/image";
import { ExternalLink, Music2 } from "lucide-react";

import { Badge } from "@acme/ui/badge";
import { Card, CardContent } from "@acme/ui/card";

interface Track {
  id: string;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArtUrl: string;
  spotifyTrackId: string;
  previewUrl: string | null;
  trackDurationMs: number;
  isOwn: boolean;
}

interface TrackListProps {
  tracks: Track[];
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TrackList({ tracks }: TrackListProps) {
  if (tracks.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Music2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No tracks submitted yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2" role="list" aria-label="Track list">
      {tracks.map((track, index) => (
        <Card key={track.id} role="listitem">
          <CardContent>
            <div className="flex items-center gap-3">
              {/* Track number */}
              <span className="w-5 shrink-0 text-center text-sm font-medium text-muted-foreground">
                {index + 1}
              </span>

              {/* Album art */}
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                {track.albumArtUrl ? (
                  <Image
                    src={track.albumArtUrl}
                    alt={`${track.albumName} album art`}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Music2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Track info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {track.trackName}
                  </p>
                  {track.isOwn && (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      You
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {track.artistName}
                  {track.albumName && (
                    <span> &middot; {track.albumName}</span>
                  )}
                </p>
              </div>

              {/* Duration */}
              {track.trackDurationMs > 0 && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDuration(track.trackDurationMs)}
                </span>
              )}

              {/* Spotify link */}
              <a
                href={`https://open.spotify.com/track/${track.spotifyTrackId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={`Open ${track.trackName} on Spotify`}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
