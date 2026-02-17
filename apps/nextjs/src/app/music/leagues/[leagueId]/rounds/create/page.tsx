"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@acme/ui/button";
import { Card, CardContent } from "@acme/ui/card";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";
import { Textarea } from "@acme/ui/textarea";

import { useTRPC } from "~/trpc/react";

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function CreateRound() {
  const params = useParams<{ leagueId: string }>();
  const router = useRouter();
  const trpc = useTRPC();

  const defaultSubmission = new Date();
  defaultSubmission.setDate(defaultSubmission.getDate() + 3);
  const defaultVoting = new Date();
  defaultVoting.setDate(defaultVoting.getDate() + 5);

  const [themeName, setThemeName] = useState("");
  const [themeDescription, setThemeDescription] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState(
    toLocalDatetimeString(defaultSubmission),
  );
  const [votingDeadline, setVotingDeadline] = useState(
    toLocalDatetimeString(defaultVoting),
  );

  const { data: latestRound } = useQuery(
    trpc.musicLeague.getLatestRound.queryOptions({
      leagueId: params.leagueId,
    }),
  );

  const [prevLatestRound, setPrevLatestRound] = useState(latestRound);
  if (latestRound && latestRound !== prevLatestRound) {
    setPrevLatestRound(latestRound);
    const now = new Date();
    const previousVotingEnd = new Date(latestRound.votingDeadline);

    const baseDate = previousVotingEnd > now ? previousVotingEnd : now;

    const newSubmission = new Date(baseDate);
    newSubmission.setDate(newSubmission.getDate() + 3);

    const newVoting = new Date(baseDate);
    newVoting.setDate(newVoting.getDate() + 5);

    setSubmissionDeadline(toLocalDatetimeString(newSubmission));
    setVotingDeadline(toLocalDatetimeString(newVoting));
  }

  const createRound = useMutation(
    trpc.musicLeague.createRound.mutationOptions({
      onSuccess: (round) => {
        if (round) {
          router.push(`/music/leagues/${params.leagueId}/rounds/${round.id}`);
        }
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const subDate = new Date(submissionDeadline);
    const voteDate = new Date(votingDeadline);

    createRound.mutate({
      leagueId: params.leagueId,
      themeName,
      themeDescription: themeDescription || undefined,
      submissionDeadline: subDate.toISOString(),
      votingDeadline: voteDate.toISOString(),
    });
  };

  const validationError = (() => {
    const sub = new Date(submissionDeadline);
    const vote = new Date(votingDeadline);
    if (vote <= sub) return "Voting deadline must be after submission deadline";
    if (sub <= new Date()) return "Submission deadline must be in the future";
    return null;
  })();

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Create a New Round</h1>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="theme-name">Theme</Label>
              <Input
                id="theme-name"
                type="text"
                required
                maxLength={200}
                placeholder="e.g. Guilty Pleasures"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="theme-desc">
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="theme-desc"
                rows={2}
                maxLength={500}
                placeholder="Describe the theme to help participants..."
                value={themeDescription}
                onChange={(e) => setThemeDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="submission-deadline">Submission Deadline</Label>
              <Input
                id="submission-deadline"
                type="datetime-local"
                required
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="voting-deadline">Voting Deadline</Label>
              <Input
                id="voting-deadline"
                type="datetime-local"
                required
                value={votingDeadline}
                onChange={(e) => setVotingDeadline(e.target.value)}
              />
              {votingDeadline && submissionDeadline && validationError && (
                <p className="text-destructive text-xs">{validationError}</p>
              )}
            </div>

            {createRound.error && (
              <p className="text-destructive text-sm">
                {createRound.error.message}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !themeName.trim() ||
                  !!validationError ||
                  createRound.isPending
                }
              >
                {createRound.isPending ? "Creating..." : "Create Round"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
