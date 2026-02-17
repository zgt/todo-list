"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, Users } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/card";

import { useTRPC } from "~/trpc/react";

export default function JoinLeaguePage() {
  const params = useParams<{ inviteCode: string }>();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: league, isLoading } = useQuery(
    trpc.musicLeague.getLeagueByInviteCode.queryOptions({
      inviteCode: params.inviteCode,
    }),
  );

  const joinLeague = useMutation(
    trpc.musicLeague.joinLeague.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries(
          trpc.musicLeague.getAllLeagues.queryFilter(),
        );
        router.push(`/music/leagues/${result.id}`);
      },
    }),
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="mx-auto max-w-md py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full">
              <AlertCircle className="text-destructive h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">League Not Found</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                This invite code is invalid or the league no longer exists.
              </p>
            </div>
            <Button variant="secondary" onClick={() => router.push("/music")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAlreadyMember =
    joinLeague.error?.message === "You are already a member of this league";

  return (
    <div className="mx-auto max-w-md py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Join League</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">{league.name}</h2>
            {league.description && (
              <p className="text-muted-foreground mt-2 text-sm">
                {league.description}
              </p>
            )}
          </div>

          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            <span>
              {league.memberCount} / {league.maxMembers} members
            </span>
          </div>

          {joinLeague.error && (
            <p className="text-destructive text-sm">
              {joinLeague.error.message}
            </p>
          )}

          {isAlreadyMember ? (
            <Button onClick={() => router.push(`/music/leagues/${league.id}`)}>
              Go to League
            </Button>
          ) : (
            <Button
              onClick={() =>
                joinLeague.mutate({ inviteCode: params.inviteCode })
              }
              disabled={joinLeague.isPending}
              className="w-full"
            >
              {joinLeague.isPending ? "Joining..." : "Join League"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
