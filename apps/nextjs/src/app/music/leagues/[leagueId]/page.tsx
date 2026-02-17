"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Copy,
  Check,
  Music2,
  Settings,
  Plus,
  LogOut,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/card";
import { Button } from "@acme/ui/button";
import { Badge } from "@acme/ui/badge";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@acme/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@acme/ui/avatar";
import { Textarea } from "@acme/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";
import { Checkbox } from "@acme/ui/checkbox";
import { Separator } from "@acme/ui/separator";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";
import { LeagueStandings } from "~/components/music/results/league-standings";

const roleLabels: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

function getRoundWinner(
  submissions: {
    user: { name: string };
    trackName: string;
    votes: { points: number }[];
  }[],
): { userName: string; trackName: string } | null {
  if (submissions.length === 0) return null;

  let winner = submissions[0]!;
  let maxPoints = winner.votes.reduce((sum, v) => sum + v.points, 0);

  for (const sub of submissions.slice(1)) {
    const pts = sub.votes.reduce((sum, v) => sum + v.points, 0);
    if (pts > maxPoints) {
      maxPoints = pts;
      winner = sub;
    }
  }

  return { userName: winner.user.name, trackName: winner.trackName };
}

export default function LeagueDetail() {
  const params = useParams<{ leagueId: string }>();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: session } = useSession();

  const { data: league, isLoading } = useQuery(
    trpc.musicLeague.getLeagueById.queryOptions(
      { id: params.leagueId },
    ),
  );

  const leaveLeague = useMutation(
    trpc.musicLeague.leaveLeague.mutationOptions({
      onSuccess: () => router.push("/music"),
    }),
  );

  const deleteLeague = useMutation(
    trpc.musicLeague.deleteLeague.mutationOptions({
      onSuccess: () => router.push("/music"),
    }),
  );

  const regenerateCode = useMutation(
    trpc.musicLeague.regenerateLeagueInviteCode.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.musicLeague.getLeagueById.queryFilter({ id: params.leagueId }),
        );
      },
    }),
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-8 w-48 rounded" />
          <div className="bg-muted h-4 w-72 rounded" />
        </div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
            <Users className="text-muted-foreground h-6 w-6" />
          </div>
          <div>
            <p className="text-muted-foreground font-medium">
              League not found
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              This league doesn&apos;t exist or you&apos;re not a member.
            </p>
          </div>
          <Link
            href="/music"
            className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isOwner =
    league.members.find((m) => m.userId === session?.user.id)?.role === "OWNER";

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/music/join/${league.inviteCode}`
      : `/music/join/${league.inviteCode}`;

  const handleCopyInvite = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{league.name}</h1>
          {league.description && (
            <p className="text-muted-foreground mt-1">{league.description}</p>
          )}
          <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-sm">
            <Users className="h-4 w-4" />
            {league.members.length} member
            {league.members.length !== 1 && "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Invite Link */}
      <Card className="mb-6">
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-foreground text-sm font-medium">Invite Link</p>
              <p className="text-muted-foreground mt-0.5 break-all text-sm">
                {inviteUrl}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleCopyInvite}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  regenerateCode.mutate({ leagueId: league.id })
                }
                disabled={!isOwner || regenerateCode.isPending}
              >
                Regenerate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Standings + Rounds */}
        <div className="space-y-6 lg:col-span-2">
          {/* Standings */}
          <LeagueStandings leagueId={league.id} />

          {/* Rounds */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Rounds</CardTitle>
                {isOwner && (
                  <Link
                    href={`/music/leagues/${league.id}/rounds/create`}
                  >
                    <Button size="sm">
                      <Plus className="h-3.5 w-3.5" />
                      Create Round
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {league.rounds.length > 0 ? (
                <div className="space-y-3">
                  {league.rounds.map((round) => {
                    const isScored =
                      round.status === "RESULTS" ||
                      round.status === "COMPLETED";
                    const winner = isScored
                      ? getRoundWinner(round.submissions)
                      : null;

                    return (
                      <Link
                        key={round.id}
                        href={`/music/leagues/${league.id}/rounds/${round.id}`}
                        className="border-border/50 hover:bg-muted flex items-center justify-between rounded-lg border p-3 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            Round {round.roundNumber}: {round.themeName}
                          </p>
                          {winner && (
                            <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-sm">
                              <Trophy className="h-3 w-3 text-yellow-500" />
                              {winner.userName} &middot; {winner.trackName}
                            </p>
                          )}
                          {!winner && round.themeDescription && (
                            <p className="text-muted-foreground mt-0.5 text-sm">
                              {round.themeDescription}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary">{round.status}</Badge>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                    <Music2 className="text-muted-foreground h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      No rounds yet
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Create the first round to get the competition started.
                    </p>
                  </div>
                  {isOwner && (
                    <Link
                      href={`/music/leagues/${league.id}/rounds/create`}
                    >
                      <Button size="sm">
                        <Plus className="h-3.5 w-3.5" />
                        Create First Round
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Members */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Members ({league.members.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {league.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.user.image ?? undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                        {member.user.name?.charAt(0).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {member.user.name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {roleLabels[member.role]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        league={league}
        isOwner={isOwner}
        onLeave={() => leaveLeague.mutate({ leagueId: league.id })}
        onDelete={() => {
          if (
            confirm(
              "Are you sure you want to delete this league? This cannot be undone.",
            )
          ) {
            deleteLeague.mutate({ leagueId: league.id });
          }
        }}
        isLeaving={leaveLeague.isPending}
        isDeleting={deleteLeague.isPending}
      />
    </div>
  );
}

function SettingsModal({
  open,
  onClose,
  league,
  onLeave,
  onDelete,
  isLeaving,
  isDeleting,
  isOwner,
}: {
  open: boolean;
  onClose: () => void;
  league: {
    id: string;
    name: string;
    description: string | null;
    songsPerRound: number;
    allowDownvotes: boolean;
    upvotePointsPerRound: number;
    members: { role: string; userId: string }[];
  };
  onLeave: () => void;
  onDelete: () => void;
  isLeaving: boolean;
  isDeleting: boolean;
  isOwner: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [name, setName] = useState(league.name);
  const [description, setDescription] = useState(league.description ?? "");
  const [songsPerRound, setSongsPerRound] = useState(league.songsPerRound);
  const [allowDownvotes, setAllowDownvotes] = useState(league.allowDownvotes);
  const [upvotePoints, setUpvotePoints] = useState(league.upvotePointsPerRound);

  const updateSettings = useMutation(
    trpc.musicLeague.updateLeagueSettings.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.musicLeague.getLeagueById.queryFilter({ id: league.id }),
        );
        onClose();
      },
    }),
  );

  const handleSave = () => {
    updateSettings.mutate({
      leagueId: league.id,
      name,
      description: description || undefined,
      songsPerRound,
      allowDownvotes,
      upvotePointsPerRound: upvotePoints,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>League Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {isOwner ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="settings-name">League Name</Label>
                <Input
                  id="settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="settings-desc">Description</Label>
                <Textarea
                  id="settings-desc"
                  rows={2}
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="settings-songs">Songs per Round</Label>
                <Select
                  value={String(songsPerRound)}
                  onValueChange={(value) => setSongsPerRound(Number(value))}
                >
                  <SelectTrigger id="settings-songs" className="w-full">
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
                <Label htmlFor="settings-points">
                  Upvote Points per Round
                </Label>
                <Input
                  id="settings-points"
                  type="number"
                  min={1}
                  max={20}
                  value={upvotePoints}
                  onChange={(e) => setUpvotePoints(Number(e.target.value))}
                />
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="settings-downvotes"
                  checked={allowDownvotes}
                  onCheckedChange={(checked) =>
                    setAllowDownvotes(checked === true)
                  }
                />
                <Label htmlFor="settings-downvotes">Allow downvotes</Label>
              </div>

              {updateSettings.error && (
                <p className="text-destructive text-sm">
                  {updateSettings.error.message}
                </p>
              )}
            </>
          ) : (
            <div className="py-2">
              <p className="text-muted-foreground text-sm">
                You are a member of this league.
              </p>
            </div>
          )}

          <Separator />

          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={onLeave}
              disabled={isLeaving}
            >
              <LogOut className="h-4 w-4" />
              {isLeaving ? "Leaving..." : "Leave League"}
            </Button>
            {isOwner && (
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete League"}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {isOwner && (
            <Button
              onClick={handleSave}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
