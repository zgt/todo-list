"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Loader2, Music2, Search, X } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/card";
import { Input } from "@acme/ui/input";

import { useTRPC } from "~/trpc/react";

interface SubmitSongProps {
  roundId: string;
  songsPerRound: number;
}

interface SpotifyTrack {
  spotifyTrackId: string;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArtUrl: string | null;
  previewUrl: string | null;
  trackDurationMs: number;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function SubmitSong({ roundId, songsPerRound }: SubmitSongProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Debounced search handler
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setShowResults(true);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (!value.trim()) {
        setDebouncedQuery("");
        return;
      }
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedQuery(value.trim());
      }, 300);
    },
    [],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Search Spotify
  const { data: searchResults, isFetching: isSearching } = useQuery(
    trpc.musicLeague.searchSpotify.queryOptions(
      { query: debouncedQuery, limit: 8 },
      { enabled: debouncedQuery.length > 0 },
    ),
  );

  // Close dropdown on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node)
    ) {
      setShowResults(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const createSubmission = useMutation(
    trpc.musicLeague.createSubmission.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryOptions({ roundId }),
        );
        setSubmitted(true);
        setSelectedTrack(null);
        setSearchQuery("");
        setDebouncedQuery("");
      },
    }),
  );

  const handleSelectTrack = (track: SpotifyTrack) => {
    setSelectedTrack(track);
    setShowResults(false);
    setSearchQuery("");
    setDebouncedQuery("");
  };

  const handleSubmit = () => {
    if (!selectedTrack) return;
    createSubmission.mutate({
      roundId,
      spotifyTrackId: selectedTrack.spotifyTrackId,
      trackName: selectedTrack.trackName,
      artistName: selectedTrack.artistName,
      albumName: selectedTrack.albumName,
      albumArtUrl: selectedTrack.albumArtUrl ?? "",
      previewUrl: selectedTrack.previewUrl,
      trackDurationMs: selectedTrack.trackDurationMs,
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
              <p className="text-muted-foreground mt-1 text-sm">
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

        {/* Selected track card */}
        {selectedTrack ? (
          <div className="space-y-4">
            <div className="border-border/50 flex gap-4 rounded-lg border p-4">
              {selectedTrack.albumArtUrl ? (
                <Image
                  src={selectedTrack.albumArtUrl}
                  alt={selectedTrack.albumName}
                  width={80}
                  height={80}
                  className="h-20 w-20 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="bg-muted flex h-20 w-20 shrink-0 items-center justify-center rounded-md">
                  <Music2 className="text-muted-foreground h-8 w-8" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {selectedTrack.trackName}
                </p>
                <p className="text-muted-foreground truncate text-sm">
                  {selectedTrack.artistName}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {selectedTrack.albumName}
                </p>
                <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  {formatDuration(selectedTrack.trackDurationMs)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTrack(null);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                className="text-muted-foreground hover:text-foreground self-start transition-colors"
                aria-label="Remove selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createSubmission.error && (
              <p className="text-destructive text-sm" role="alert">
                {createSubmission.error.message}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedTrack(null);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createSubmission.isPending}
                className="flex-1"
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
            </div>
          </div>
        ) : (
          /* Search input */
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                ref={inputRef}
                placeholder="Search for a song on Spotify..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (debouncedQuery) setShowResults(true);
                }}
                className="pl-9"
              />
              {isSearching && (
                <Loader2 className="text-muted-foreground absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
              )}
            </div>

            {/* Search results dropdown */}
            {showResults && debouncedQuery && (
              <div className="border-border bg-popover absolute left-0 right-0 z-50 mt-1 max-h-[360px] overflow-y-auto rounded-lg border shadow-lg">
                {searchResults && searchResults.length > 0 ? (
                  <ul role="listbox" className="py-1">
                    {searchResults.map((track) => (
                      <li key={track.spotifyTrackId}>
                        <button
                          type="button"
                          className="hover:bg-accent flex w-full items-center gap-3 px-3 py-2 text-left transition-colors"
                          onClick={() => handleSelectTrack(track)}
                        >
                          {track.albumArtUrl ? (
                            <Image
                              src={track.albumArtUrl}
                              alt={track.albumName}
                              width={40}
                              height={40}
                              className="h-10 w-10 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded">
                              <Music2 className="text-muted-foreground h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {track.trackName}
                            </p>
                            <p className="text-muted-foreground truncate text-xs">
                              {track.artistName} &middot; {track.albumName}
                            </p>
                          </div>
                          <span className="text-muted-foreground shrink-0 text-xs">
                            {formatDuration(track.trackDurationMs)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : !isSearching ? (
                  <div className="text-muted-foreground py-8 text-center text-sm">
                    No tracks found
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
