"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ExternalLink,
  Loader2,
  Minus,
  Music2,
  Plus,
} from "lucide-react";

import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import { Card, CardContent } from "@acme/ui/card";

import { useTRPC } from "~/trpc/react";

interface Submission {
  id: string;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArtUrl: string;
  spotifyTrackId: string;
  previewUrl?: string | null;
  trackDurationMs?: number;
  isOwn: boolean;
}

interface VoteInterfaceProps {
  roundId: string;
  submissions: Submission[];
  upvotePointsPerRound: number;
  allowDownvotes: boolean;
  downvotePointValue: number;
  memberCount: number;
}

export function VoteInterface({
  roundId,
  submissions,
  upvotePointsPerRound,
  allowDownvotes,
  downvotePointValue,
}: VoteInterfaceProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [votes, setVotes] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const sub of submissions) {
      initial[sub.id] = 0;
    }
    return initial;
  });

  const [submitted, setSubmitted] = useState(false);

  const submitVotes = useMutation(
    trpc.musicLeague.submitVotes.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryOptions({ roundId }),
        );
        setSubmitted(true);
      },
    }),
  );

  const totalUpvotesUsed = Object.entries(votes).reduce((sum, [id, pts]) => {
    const sub = submissions.find((s) => s.id === id);
    if (sub?.isOwn) return sum;
    return sum + Math.max(0, pts);
  }, 0);

  const remainingPoints = upvotePointsPerRound - totalUpvotesUsed;

  const adjustVote = (submissionId: string, delta: number) => {
    setVotes((prev) => {
      const current = prev[submissionId] ?? 0;
      const next = current + delta;

      // Upvote bounds: cannot exceed remaining points
      if (delta > 0 && remainingPoints <= 0) return prev;

      // Downvote bounds: limited by downvotePointValue
      if (allowDownvotes && next < -Math.abs(downvotePointValue)) return prev;
      if (!allowDownvotes && next < 0) return prev;

      return { ...prev, [submissionId]: next };
    });
  };

  const handleSubmitVotes = () => {
    const voteEntries = Object.entries(votes)
      .filter(([id, pts]) => {
        const sub = submissions.find((s) => s.id === id);
        return pts !== 0 && !sub?.isOwn;
      })
      .map(([submissionId, points]) => ({ submissionId, points }));

    submitVotes.mutate({
      roundId,
      votes: voteEntries,
      comments: [],
    });
  };

  if (submitted) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
              <Check className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="font-medium">Votes submitted</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Your votes have been recorded. You can re-submit to change them
                before voting closes.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSubmitted(false)}
            >
              Edit Votes
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Points remaining indicator */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Points Remaining</p>
              <p className="text-muted-foreground text-xs">
                Allocate your {upvotePointsPerRound} points across submissions
                {allowDownvotes && ` (downvotes: -${downvotePointValue})`}
              </p>
            </div>
            <div
              className={`text-2xl font-bold tabular-nums ${
                remainingPoints === 0
                  ? "text-green-500"
                  : remainingPoints < 0
                    ? "text-destructive"
                    : "text-foreground"
              }`}
              aria-live="polite"
              aria-label={`${remainingPoints} points remaining`}
            >
              {remainingPoints}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submission cards */}
      <div className="space-y-2" role="list" aria-label="Voting cards">
        {submissions.map((sub) => {
          const pts = votes[sub.id] ?? 0;
          const isOwnSubmission = sub.isOwn;

          return (
            <Card
              key={sub.id}
              className={isOwnSubmission ? "opacity-60" : ""}
              role="listitem"
            >
              <CardContent>
                <div className="flex items-center gap-3">
                  {/* Album art */}
                  <div className="bg-muted relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
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
                        <Music2 className="text-muted-foreground h-5 w-5" />
                      </div>
                    )}
                  </div>

                  {/* Track info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {sub.trackName}
                      </p>
                      {isOwnSubmission && (
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-[10px]"
                        >
                          Your track
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {sub.artistName}
                      {sub.albumName && <span> &middot; {sub.albumName}</span>}
                    </p>
                  </div>

                  {/* Spotify link */}
                  <a
                    href={`https://open.spotify.com/track/${sub.spotifyTrackId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:bg-accent hover:text-foreground shrink-0 rounded-md p-1.5 transition-colors"
                    aria-label={`Open ${sub.trackName} on Spotify`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>

                  {/* Vote controls */}
                  {isOwnSubmission ? (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      Can&apos;t vote
                    </span>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1">
                      {allowDownvotes && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => adjustVote(sub.id, -1)}
                          disabled={pts <= -Math.abs(downvotePointValue)}
                          aria-label={`Remove point from ${sub.trackName}`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      <span
                        className={`w-8 text-center text-sm font-bold tabular-nums ${
                          pts > 0
                            ? "text-green-500"
                            : pts < 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }`}
                        aria-label={`${pts} points for ${sub.trackName}`}
                      >
                        {pts > 0 ? `+${pts}` : pts}
                      </span>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => adjustVote(sub.id, 1)}
                        disabled={remainingPoints <= 0}
                        aria-label={`Add point to ${sub.trackName}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit button */}
      <div className="sticky bottom-4">
        {submitVotes.error && (
          <p className="text-destructive mb-2 text-sm" role="alert">
            {submitVotes.error.message}
          </p>
        )}
        <Button
          className="w-full"
          onClick={handleSubmitVotes}
          disabled={submitVotes.isPending || totalUpvotesUsed === 0}
        >
          {submitVotes.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting Votes...
            </>
          ) : (
            `Submit Votes (${totalUpvotesUsed}/${upvotePointsPerRound} points used)`
          )}
        </Button>
      </div>
    </div>
  );
}
