"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { Card, CardContent } from "@acme/ui/card";
import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";
import { Checkbox } from "@acme/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";

import { Textarea } from "@acme/ui/textarea";
import { useTRPC } from "~/trpc/react";

export default function CreateLeague() {
  const trpc = useTRPC();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [songsPerRound, setSongsPerRound] = useState(1);
  const [allowDownvotes, setAllowDownvotes] = useState(false);
  const [upvotePointsPerRound, setUpvotePointsPerRound] = useState(10);

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
              <Label htmlFor="allow-downvotes">Allow downvotes</Label>
            </div>

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
