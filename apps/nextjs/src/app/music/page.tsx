"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, Plus, TicketCheck, Users } from "lucide-react";

import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/card";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";
import { Skeleton } from "@acme/ui/skeleton";

import { useTRPC } from "~/trpc/react";

function formatDeadline(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff < 0) return "Overdue";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

export default function MusicDashboard() {
  const trpc = useTRPC();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");

  const { data: leagues, isLoading } = useQuery(
    trpc.musicLeague.getAllLeagues.queryOptions(),
  );

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    router.push(`/music/join/${encodeURIComponent(inviteCode.trim())}`);
  };

  // Collect upcoming deadlines from active rounds
  const [now] = useState(() => Date.now());
  const deadlines =
    leagues
      ?.flatMap((league) => {
        const round = league.currentRound;
        if (!round) return [];
        return [
          {
            leagueId: league.id,
            leagueName: league.name,
            roundId: round.id,
            themeName: round.themeName,
            status: round.status,
            deadline:
              round.status === "SUBMISSION"
                ? new Date(round.submissionDeadline)
                : new Date(round.votingDeadline),
          },
        ];
      })
      .filter((d) => d.deadline.getTime() > now)
      .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
      .slice(0, 5) ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Your Leagues</h1>
        <Button asChild>
          <Link href="/music/leagues/create">
            <Plus className="h-4 w-4" />
            Create League
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Leagues grid */}
        <div className="space-y-4 lg:col-span-2">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="mt-3 h-4 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : leagues && leagues.length > 0 ? (
            <div className="space-y-4">
              {leagues.map((league) => {
                const activeRound = league.currentRound;
                return (
                  <Link key={league.id} href={`/music/leagues/${league.id}`}>
                    <Card className="hover:border-border/80 hover:bg-accent cursor-pointer transition-colors">
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{league.name}</h3>
                            <div className="text-muted-foreground mt-1 flex items-center gap-3 text-sm">
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {league.memberCount}
                              </span>
                              {activeRound && (
                                <span>{activeRound.themeName}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {activeRound && (
                              <Badge variant="secondary">
                                {activeRound.status}
                              </Badge>
                            )}
                            <ArrowRight className="text-muted-foreground h-4 w-4" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                    <TicketCheck className="text-muted-foreground h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium">
                      No leagues yet
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Create one or join with an invite code.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Join League */}
          <Card>
            <CardHeader>
              <CardTitle>Join a League</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoin} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="invite-code">Invite Code</Label>
                  <Input
                    id="invite-code"
                    placeholder="Paste invite code..."
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                  />
                  <p className="text-muted-foreground text-xs">
                    Get an invite code from a league admin
                  </p>
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  className="self-start"
                >
                  Join League
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          {deadlines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deadlines.map((d) => (
                    <Link
                      key={d.roundId}
                      href={`/music/leagues/${d.leagueId}`}
                      className="hover:bg-muted flex items-start gap-3 rounded-lg p-2 transition-colors"
                    >
                      <Clock className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {d.themeName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {d.leagueName} &middot;{" "}
                          {d.status === "SUBMISSION" ? "Submit" : "Vote"}{" "}
                          &middot; {formatDeadline(d.deadline)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
