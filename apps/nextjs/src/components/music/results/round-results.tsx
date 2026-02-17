"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Music2, Trophy } from "lucide-react";

import { Badge } from "@acme/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/card";
import { Skeleton } from "@acme/ui/skeleton";

import { useTRPC } from "~/trpc/react";

interface RoundResultsProps {
  roundId: string;
}

export function RoundResults({ roundId }: RoundResultsProps) {
  const trpc = useTRPC();

  const { data: round, isLoading } = useQuery(
    trpc.musicLeague.getRoundById.queryOptions({ roundId }),
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-12 w-12 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-10" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!round) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Music2 className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Round data not available.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedSubmissions = [...round.submissions].sort(
    (a, b) => b.totalPoints - a.totalPoints,
  );

  const topPoints =
    sortedSubmissions.length > 0 ? sortedSubmissions[0]!.totalPoints : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedSubmissions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Music2 className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No submissions for this round.
            </p>
          </div>
        ) : (
          <div className="space-y-2" role="list" aria-label="Round results">
            {sortedSubmissions.map((sub, index) => {
              const isWinner =
                index === 0 && sub.totalPoints > 0 && topPoints > 0;
              const rank = index + 1;

              return (
                <div
                  key={sub.id}
                  role="listitem"
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    isWinner
                      ? "border-yellow-500/30 bg-yellow-500/5"
                      : "border-border/50"
                  }`}
                >
                  {/* Rank */}
                  <div className="flex w-7 shrink-0 items-center justify-center">
                    {isWinner ? (
                      <Trophy
                        className="h-5 w-5 text-yellow-500"
                        aria-label="Winner"
                      />
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">
                        {rank}
                      </span>
                    )}
                  </div>

                  {/* Album art */}
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {sub.albumArtUrl ? (
                      <Image
                        src={sub.albumArtUrl}
                        alt={`${sub.albumName} album art`}
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
                      <p
                        className={`truncate text-sm ${
                          isWinner ? "font-bold" : "font-medium"
                        }`}
                      >
                        {sub.trackName}
                      </p>
                      {sub.isOwn && (
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-[10px]"
                        >
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {sub.artistName}
                      {sub.albumName && (
                        <span> &middot; {sub.albumName}</span>
                      )}
                    </p>
                    {"submitter" in sub && sub.submitter && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Submitted by{" "}
                        <span className="font-medium">
                          {sub.submitter.name}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Spotify link */}
                  <a
                    href={`https://open.spotify.com/track/${sub.spotifyTrackId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label={`Open ${sub.trackName} on Spotify`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>

                  {/* Points */}
                  <div
                    className={`shrink-0 text-right ${
                      isWinner ? "text-yellow-500" : ""
                    }`}
                  >
                    <p
                      className={`text-lg font-bold tabular-nums ${
                        isWinner ? "" : "text-foreground"
                      }`}
                    >
                      {sub.totalPoints}
                    </p>
                    <p className="text-[10px] text-muted-foreground">pts</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
