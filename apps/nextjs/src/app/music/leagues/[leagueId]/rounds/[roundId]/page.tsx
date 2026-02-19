"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  ListMusic,
  Music2,
} from "lucide-react";

import type { RouterOutputs } from "@acme/api";
import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle as DialogTitleComp,
} from "@acme/ui/dialog";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";
import { toast } from "@acme/ui/toast";

import { RoundResults } from "~/components/music/results/round-results";
import { SubmitSong } from "~/components/music/submission/submit-song";
import { TrackList } from "~/components/music/submission/track-list";
import { VoteInterface } from "~/components/music/voting/vote-interface";
import { useTRPC } from "~/trpc/react";
import { RoundStatusBoard } from "./_components/round-status-board";

type RoundData = NonNullable<RouterOutputs["musicLeague"]["getRoundById"]>;

const PHASES = ["SUBMISSION", "LISTENING", "VOTING", "RESULTS"] as const;
const PHASE_LABELS: Record<string, string> = {
  SUBMISSION: "Submit",
  LISTENING: "Listen",
  VOTING: "Vote",
  RESULTS: "Results",
  COMPLETED: "Done",
};

function useCountdown(deadline: Date): string {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function PhaseProgressBar({ status }: { status: string }) {
  const currentIndex = PHASES.indexOf(status as (typeof PHASES)[number]);
  const isCompleted = status === "COMPLETED";

  return (
    <div className="flex items-center gap-1">
      {PHASES.map((phase, i) => {
        const isActive = phase === status;
        const isPast = isCompleted || i < currentIndex;

        return (
          <div key={phase} className="flex items-center gap-1">
            {i > 0 && (
              <div
                className={`h-0.5 w-4 sm:w-8 ${
                  isPast ? "bg-primary" : "bg-border"
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isPast
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-xs ${
                  isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {PHASE_LABELS[phase]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RoundDetail() {
  const params = useParams<{ leagueId: string; roundId: string }>();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [confirmAdvance, setConfirmAdvance] = useState(false);
  const [playlistUrlInput, setPlaylistUrlInput] = useState("");
  const [playlistUrlSaved, setPlaylistUrlSaved] = useState(false);

  const { data: round, isLoading } = useQuery(
    trpc.musicLeague.getRoundById.queryOptions({
      roundId: params.roundId,
    }),
  );

  const advancePhase = useMutation(
    trpc.musicLeague.advanceRoundPhase.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryFilter({
            roundId: params.roundId,
          }),
        );
        setConfirmAdvance(false);
      },
    }),
  );

  const setPlaylistUrl = useMutation(
    trpc.musicLeague.setRoundPlaylistUrl.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryFilter({
            roundId: params.roundId,
          }),
        );
        setPlaylistUrlSaved(true);
        setTimeout(() => setPlaylistUrlSaved(false), 2000);
      },
    }),
  );

  const generatePlaylist = useMutation(
    trpc.musicLeague.generateRoundPlaylist.mutationOptions({
      onSuccess: (data) => {
        void queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryFilter({
            roundId: params.roundId,
          }),
        );
        setPlaylistUrlInput(data.playlistUrl);
        setPlaylistUrlSaved(true);
        setTimeout(() => setPlaylistUrlSaved(false), 2000);
        toast.success("Playlist generated successfully!");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  // Sync playlist URL input with server state
  const playlistUrlFromServer = round?.playlistUrl;
  const [prevPlaylistUrl, setPrevPlaylistUrl] = useState(playlistUrlFromServer);
  if (playlistUrlFromServer && playlistUrlFromServer !== prevPlaylistUrl) {
    setPrevPlaylistUrl(playlistUrlFromServer);
    setPlaylistUrlInput(playlistUrlFromServer);
  }

  const activeDeadline =
    round?.status === "SUBMISSION"
      ? new Date(round.submissionDeadline)
      : round?.status === "LISTENING" || round?.status === "VOTING"
        ? new Date(round.votingDeadline)
        : null;

  const countdown = useCountdown(activeDeadline ?? new Date(0));

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-8 w-48 rounded" />
          <div className="bg-muted h-4 w-72 rounded" />
          <div className="bg-muted h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
            <Music2 className="text-muted-foreground h-6 w-6" />
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Round not found</p>
            <p className="text-muted-foreground mt-1 text-sm">
              This round doesn&apos;t exist or you don&apos;t have access.
            </p>
          </div>
          <Link
            href={`/music/leagues/${params.leagueId}`}
            className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
          >
            Back to League
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = round.userRole === "OWNER" || round.userRole === "ADMIN";
  const canAdvance =
    isAdmin && round.status !== "COMPLETED" && round.status !== "PENDING";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Back link */}
      <Link
        href={`/music/leagues/${params.leagueId}`}
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to league
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-sm">
              Round {round.roundNumber}
            </p>
            <h1 className="mt-1 text-2xl font-bold">{round.themeName}</h1>
            {round.themeDescription && (
              <p className="text-muted-foreground mt-1">
                {round.themeDescription}
              </p>
            )}
          </div>
          <Badge
            variant={round.status === "PENDING" ? "outline" : "secondary"}
            className="mt-1"
          >
            {round.status === "PENDING" ? "Pending" : round.status}
          </Badge>
        </div>
      </div>

      {/* PENDING Banner */}
      {round.status === "PENDING" && (
        <Card className="border-muted mb-6">
          <CardContent>
            <div className="flex items-center gap-3">
              <Clock className="text-muted-foreground h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  Waiting for previous round to finish
                </p>
                <p className="text-muted-foreground text-xs">
                  This round will start automatically when the current round
                  completes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase progress */}
      {round.status !== "PENDING" && (
        <Card className="mb-6">
          <CardContent>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <PhaseProgressBar status={round.status} />

              {activeDeadline && countdown !== "Ended" && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground">
                    {round.status === "SUBMISSION"
                      ? "Submissions close"
                      : round.status === "LISTENING"
                        ? "Voting opens"
                        : "Voting closes"}{" "}
                    in
                  </span>
                  <span className="font-mono font-medium">{countdown}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {round.status !== "PENDING" && (
            <PhaseContent round={round} leagueId={params.leagueId} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status Board */}
          {round.status !== "COMPLETED" && round.status !== "RESULTS" && (
            <RoundStatusBoard
              memberStatus={round.memberStatus}
              status={round.status}
            />
          )}

          {/* Admin Controls */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Playlist URL */}
                  <div className="space-y-2">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label>Spotify Playlist URL</Label>
                        <Input
                          placeholder="https://open.spotify.com/playlist/..."
                          value={playlistUrlInput}
                          onChange={(e) => setPlaylistUrlInput(e.target.value)}
                        />
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setPlaylistUrl.mutate({
                            roundId: params.roundId,
                            playlistUrl: playlistUrlInput,
                          })
                        }
                        disabled={setPlaylistUrl.isPending}
                      >
                        {playlistUrlSaved ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                    {setPlaylistUrl.error && (
                      <p className="text-destructive text-xs">
                        {setPlaylistUrl.error.message}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        generatePlaylist.mutate({ roundId: params.roundId })
                      }
                      disabled={generatePlaylist.isPending}
                    >
                      <Music2 className="mr-2 h-4 w-4" />
                      {generatePlaylist.isPending
                        ? "Generating..."
                        : "Auto-generate Playlist on Spotify"}
                    </Button>
                    <p className="text-muted-foreground text-xs">
                      Connect your Spotify account to auto-generate a playlist,
                      or manually create one and paste the link above.
                    </p>
                  </div>

                  {/* Advance phase */}
                  {canAdvance && (
                    <div className="border-border/50 flex items-center justify-between border-t pt-4">
                      <div>
                        <p className="text-sm font-medium">Advance Phase</p>
                        <p className="text-muted-foreground text-xs">
                          Move the round to the next phase
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setConfirmAdvance(true)}
                      >
                        Advance Phase
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Advance confirmation dialog */}
      <Dialog
        open={confirmAdvance}
        onOpenChange={(open) => {
          if (!open) setConfirmAdvance(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitleComp>Advance Phase?</DialogTitleComp>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            This will move the round from{" "}
            <span className="font-medium">{PHASE_LABELS[round.status]}</span> to
            the next phase. This cannot be undone.
          </p>
          {advancePhase.error && (
            <p className="text-destructive mt-2 text-sm">
              {advancePhase.error.message}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmAdvance(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => advancePhase.mutate({ roundId: params.roundId })}
              disabled={advancePhase.isPending}
            >
              {advancePhase.isPending ? "Advancing..." : "Advance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhaseContent({
  round,
  leagueId,
}: {
  round: RoundData;
  leagueId: string;
}) {
  if (round.status === "SUBMISSION") {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent>
            <div className="flex items-center gap-3 py-2 text-center">
              <div className="bg-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <Music2 className="text-primary h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Submission Phase</p>
                <p className="text-muted-foreground text-xs">
                  {round.submissionCount} of {round.memberCount} members have
                  submitted
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <SubmitSong roundId={round.id} songsPerRound={round.songsPerRound} />
      </div>
    );
  }

  if (round.status === "LISTENING") {
    return (
      <div className="space-y-4">
        {/* Playlist banner */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                  <ListMusic className="text-primary h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Listening Phase</p>
                  <p className="text-muted-foreground text-xs">
                    Listen to all {round.submissions.length} tracks before
                    voting begins
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {round.playlistUrl && (
                  <a
                    href={round.playlistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="default" size="sm">
                      <ExternalLink className="h-4 w-4" />
                      Spotify Playlist
                    </Button>
                  </a>
                )}
                <Link
                  href={`/music/leagues/${leagueId}/rounds/${round.id}/playlist`}
                >
                  <Button variant="secondary" size="sm">
                    <ListMusic className="h-4 w-4" />
                    Full Playlist
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <TrackList
          tracks={round.submissions.map((s) => ({
            id: s.id,
            trackName: s.trackName,
            artistName: s.artistName,
            albumName: s.albumName,
            albumArtUrl: s.albumArtUrl,
            spotifyTrackId: s.spotifyTrackId,
            previewUrl: s.previewUrl ?? null,
            trackDurationMs: s.trackDurationMs,
            isOwn: s.isOwn,
          }))}
        />
      </div>
    );
  }

  if (round.status === "VOTING") {
    return (
      <VoteInterface
        roundId={round.id}
        submissions={round.submissions.map((s) => ({
          id: s.id,
          trackName: s.trackName,
          artistName: s.artistName,
          albumName: s.albumName,
          albumArtUrl: s.albumArtUrl,
          spotifyTrackId: s.spotifyTrackId,
          previewUrl: s.previewUrl,
          trackDurationMs: s.trackDurationMs,
          isOwn: s.isOwn,
        }))}
        upvotePointsPerRound={round.upvotePointsPerRound}
        allowDownvotes={round.allowDownvotes}
        downvotePointValue={round.downvotePointValue}
        memberCount={round.memberCount}
      />
    );
  }

  // RESULTS or COMPLETED
  return <RoundResults roundId={round.id} />;
}
