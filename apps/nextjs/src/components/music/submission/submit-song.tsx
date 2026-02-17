"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Music2 } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/card";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";

import { useTRPC } from "~/trpc/react";

interface SubmitSongProps {
  roundId: string;
  songsPerRound: number;
}

export function SubmitSong({ roundId, songsPerRound }: SubmitSongProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [trackName, setTrackName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [spotifyTrackId, setSpotifyTrackId] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const createSubmission = useMutation(
    trpc.musicLeague.createSubmission.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryOptions({ roundId }),
        );
        setSubmitted(true);
        setTrackName("");
        setArtistName("");
        setAlbumName("");
        setSpotifyTrackId("");
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!trackName.trim() || !artistName.trim() || !spotifyTrackId.trim()) {
      return;
    }

    createSubmission.mutate({
      roundId,
      trackName: trackName.trim(),
      artistName: artistName.trim(),
      albumName: albumName.trim() || "Unknown Album",
      spotifyTrackId: spotifyTrackId.trim(),
      albumArtUrl: "",
      previewUrl: null,
      trackDurationMs: 200000,
    });
  };

  const canSubmitAnother = submitted && songsPerRound > 1;

  if (submitted && !canSubmitAnother) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
              <Check className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="font-medium">Song submitted</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your submission has been recorded for this round.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music2 className="h-5 w-5" />
          Submit a Song
        </CardTitle>
      </CardHeader>
      <CardContent>
        {submitted && canSubmitAnother && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-500">
            <Check className="h-4 w-4 shrink-0" />
            Song submitted. You can submit another ({songsPerRound} allowed per
            round).
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="track-name">
              Track Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="track-name"
              placeholder="Enter the song title"
              value={trackName}
              onChange={(e) => setTrackName(e.target.value)}
              required
              aria-required="true"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="artist-name">
              Artist Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="artist-name"
              placeholder="Enter the artist name"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              required
              aria-required="true"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="album-name">Album Name</Label>
            <Input
              id="album-name"
              placeholder="Enter the album name (optional)"
              value={albumName}
              onChange={(e) => setAlbumName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="spotify-track-id">
              Spotify Track ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="spotify-track-id"
              placeholder="e.g. 4iV5W9uYEdYUVa79Axb7Rh"
              value={spotifyTrackId}
              onChange={(e) => setSpotifyTrackId(e.target.value)}
              required
              aria-required="true"
            />
            <p className="text-xs text-muted-foreground">
              Find this in the Spotify share link after &quot;track/&quot;
            </p>
          </div>

          {createSubmission.error && (
            <p className="text-sm text-destructive" role="alert">
              {createSubmission.error.message}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              createSubmission.isPending ||
              !trackName.trim() ||
              !artistName.trim() ||
              !spotifyTrackId.trim()
            }
          >
            {createSubmission.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Song"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
