"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@acme/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@acme/ui/avatar";
import { Skeleton } from "@acme/ui/skeleton";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

export function LeagueStandings({ leagueId }: { leagueId: string }) {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const { data: standings, isLoading } = useQuery(
    trpc.musicLeague.getLeagueStandings.queryOptions({ leagueId }),
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!standings || standings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Trophy className="text-muted-foreground h-6 w-6" />
            <p className="text-muted-foreground text-sm">
              No scored rounds yet. Standings will appear after the first round
              is complete.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentUserId = session?.user?.id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Standings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-muted-foreground border-border text-left">
                <TableHead className="pb-2 pr-2 font-medium">#</TableHead>
                <TableHead className="pb-2 font-medium">Player</TableHead>
                <TableHead className="pb-2 text-right font-medium">
                  Points
                </TableHead>
                <TableHead className="hidden pb-2 text-right font-medium sm:table-cell">
                  Wins
                </TableHead>
                <TableHead className="hidden pb-2 text-right font-medium sm:table-cell">
                  Played
                </TableHead>
                <TableHead className="hidden pb-2 text-right font-medium md:table-cell">
                  Avg
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((entry, i) => {
                const isCurrentUser = entry.user.id === currentUserId;

                return (
                  <TableRow
                    key={entry.user.id}
                    className={`border-border/50 last:border-0 ${
                      isCurrentUser ? "bg-primary/5" : ""
                    }`}
                  >
                    <TableCell className="py-2.5 pr-2">
                      {i === 0 && entry.totalPoints > 0 ? (
                        <Trophy className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <span className="text-muted-foreground">{i + 1}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={entry.user.image ?? undefined}
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                            {entry.user.name?.charAt(0).toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className={isCurrentUser ? "font-semibold" : ""}>
                          {entry.user.name}
                          {isCurrentUser && (
                            <span className="text-muted-foreground ml-1 text-xs">
                              (you)
                            </span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-medium">
                      {entry.totalPoints}
                    </TableCell>
                    <TableCell className="hidden py-2.5 text-right sm:table-cell">
                      {entry.roundsWon}
                    </TableCell>
                    <TableCell className="hidden py-2.5 text-right sm:table-cell">
                      {entry.roundsParticipated}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden py-2.5 text-right md:table-cell">
                      {entry.avgPointsPerRound}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
