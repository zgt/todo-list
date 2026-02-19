"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@acme/ui/button";
import { Card, CardContent } from "@acme/ui/card";
import { Checkbox } from "@acme/ui/checkbox";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";
import { Textarea } from "@acme/ui/textarea";

import { useTRPC } from "~/trpc/react";

const SUBMISSION_WINDOW_PRESETS = [
  { label: "1 day", days: 1 },
  { label: "2 days", days: 2 },
  { label: "3 days", days: 3 },
  { label: "5 days", days: 5 },
  { label: "1 week", days: 7 },
];

const VOTING_WINDOW_PRESETS = [
  { label: "1 day", days: 1 },
  { label: "2 days", days: 2 },
  { label: "3 days", days: 3 },
  { label: "5 days", days: 5 },
];

export default function CreateLeague() {
  const trpc = useTRPC();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [songsPerRound, setSongsPerRound] = useState(1);
  const [allowDownvotes, setAllowDownvotes] = useState(false);
  const [upvotePointsPerRound, setUpvotePointsPerRound] = useState(5);
  const [downvotePointsPerRound, setDownvotePointsPerRound] = useState(3);
  const [submissionWindowDays, setSubmissionWindowDays] = useState(3);
  const [votingWindowDays, setVotingWindowDays] = useState(2);

  const createLeague = useMutation(
    trpc.musicLeague.createLeague.mutationOptions({
      onSuccess: (league) => {
        router.push(`/music/leagues/${league.id}`);
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLeague.mutate({
      name,
      description: description || undefined,
      songsPerRound,
      allowDownvotes,
      upvotePointsPerRound,
      submissionWindowDays,
      votingWindowDays,
      downvotePointsPerRound,
    });
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Create a League</h1>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">League Name</Label>
              <Input
                id="name"
                placeholder="e.g. Friday Vibes"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What's this league about?"
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Round Windows */}
            <div className="flex flex-col gap-1.5">
              <Label>Submission Window</Label>
              <div className="flex flex-wrap gap-2">
                {SUBMISSION_WINDOW_PRESETS.map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => setSubmissionWindowDays(preset.days)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      submissionWindowDays === preset.days
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Voting Window</Label>
              <p className="text-muted-foreground text-xs">
                After submissions close
              </p>
              <div className="flex flex-wrap gap-2">
                {VOTING_WINDOW_PRESETS.map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => setVotingWindowDays(preset.days)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      votingWindowDays === preset.days
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="songsPerRound">Songs per Round</Label>
              <Select
                value={String(songsPerRound)}
                onValueChange={(v) => setSongsPerRound(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="upvotePoints">Upvote Points per Round</Label>
              <Input
                id="upvotePoints"
                type="number"
                min={1}
                max={20}
                value={upvotePointsPerRound}
                onChange={(e) =>
                  setUpvotePointsPerRound(Number(e.target.value))
                }
              />
              <p className="text-muted-foreground text-xs">
                Points each member can distribute per round (1-20)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="allow-downvotes"
                checked={allowDownvotes}
                onCheckedChange={(v) => setAllowDownvotes(v === true)}
              />
              <div>
                <Label htmlFor="allow-downvotes">Allow downvotes</Label>
                <p className="text-muted-foreground text-xs">
                  Members can spend points to downvote songs
                </p>
              </div>
            </div>

            {allowDownvotes && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="downvotePoints">
                  Downvote Points per Round
                </Label>
                <Input
                  id="downvotePoints"
                  type="number"
                  min={1}
                  max={10}
                  value={downvotePointsPerRound}
                  onChange={(e) =>
                    setDownvotePointsPerRound(
                      Math.min(10, Math.max(1, Number(e.target.value))),
                    )
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Points each member can use for downvotes (1-10)
                </p>
              </div>
            )}

            {createLeague.error && (
              <p className="text-destructive text-sm">
                {createLeague.error.message}
              </p>
            )}

            <Button type="submit" disabled={createLeague.isPending}>
              {createLeague.isPending ? "Creating..." : "Create League"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
