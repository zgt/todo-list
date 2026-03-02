"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Flag,
  LogOut,
  MoreVertical,
  Music2,
  Plus,
  Settings,
  ShieldAlert,
  ShieldOff,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@acme/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@acme/ui/avatar";
import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/card";
import { Checkbox } from "@acme/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@acme/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@acme/ui/dropdown-menu";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";
import { Separator } from "@acme/ui/separator";
import { Textarea } from "@acme/ui/textarea";

import { useSession } from "~/auth/client";
import { LeagueStandings } from "~/components/music/results/league-standings";
import { useTRPC } from "~/trpc/react";

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

  const first = submissions[0];
  if (!first) return null;
  let winner = first;
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
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    contentType: "LEAGUE" | "USER";
    contentId: string;
    contentLabel: string;
    reportedUserId?: string;
  } | null>(null);

  const { data: session } = useSession();

  const { data: league, isLoading } = useQuery(
    trpc.musicLeague.getLeagueById.queryOptions({ id: params.leagueId }),
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

  const { data: blockedUserIds = [] } = useQuery(
    trpc.moderation.getBlockedUserIds.queryOptions(),
  );

  const blockUser = useMutation(
    trpc.moderation.blockUser.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.moderation.getBlockedUserIds.queryFilter(),
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setReportTarget({
                    contentType: "LEAGUE",
                    contentId: league.id,
                    contentLabel: league.name,
                    reportedUserId: league.creatorId,
                  });
                  setReportOpen(true);
                }}
              >
                <Flag className="h-4 w-4" />
                Report League
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Invite Link */}
      <Card className="mb-6">
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-foreground text-sm font-medium">Invite Link</p>
              <p className="text-muted-foreground mt-0.5 text-sm break-all">
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
                onClick={() => regenerateCode.mutate({ leagueId: league.id })}
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
                  <Link href={`/music/leagues/${league.id}/rounds/create`}>
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
                    const isPending = round.status === "PENDING";
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
                        className={`border-border/50 hover:bg-muted flex items-center justify-between rounded-lg border p-3 transition-colors ${
                          isPending ? "opacity-50" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-medium ${isPending ? "text-muted-foreground" : ""}`}
                          >
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
                        <Badge variant={isPending ? "outline" : "secondary"}>
                          {isPending ? "Pending" : round.status}
                        </Badge>
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
                    <Link href={`/music/leagues/${league.id}/rounds/create`}>
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
                {league.members
                  .filter((member) => !blockedUserIds.includes(member.userId))
                  .map((member) => (
                    <div key={member.id} className="group flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user.image ?? undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                          {member.user.name.charAt(0).toUpperCase()}
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
                      {member.userId !== session?.user.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setReportTarget({
                                  contentType: "USER",
                                  contentId: member.userId,
                                  contentLabel: member.user.name,
                                  reportedUserId: member.userId,
                                });
                                setReportOpen(true);
                              }}
                            >
                              <Flag className="h-4 w-4" />
                              Report User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                blockUser.mutate({
                                  blockedUserId: member.userId,
                                })
                              }
                            >
                              <ShieldAlert className="h-4 w-4" />
                              Block User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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
        onDelete={() => deleteLeague.mutate({ leagueId: league.id })}
        isLeaving={leaveLeague.isPending}
        isDeleting={deleteLeague.isPending}
      />

      {/* Report Dialog */}
      {reportTarget && (
        <ReportDialog
          open={reportOpen}
          onClose={() => {
            setReportOpen(false);
            setReportTarget(null);
          }}
          contentType={reportTarget.contentType}
          contentId={reportTarget.contentId}
          contentLabel={reportTarget.contentLabel}
          reportedUserId={reportTarget.reportedUserId}
        />
      )}
    </div>
  );
}

const SUBMISSION_WINDOW_OPTIONS = [
  { label: "1 day", value: 1 },
  { label: "2 days", value: 2 },
  { label: "3 days", value: 3 },
  { label: "5 days", value: 5 },
  { label: "1 week", value: 7 },
];

const VOTING_WINDOW_OPTIONS = [
  { label: "1 day", value: 1 },
  { label: "2 days", value: 2 },
  { label: "3 days", value: 3 },
  { label: "5 days", value: 5 },
];

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
    submissionWindowDays: number;
    votingWindowDays: number;
    downvotePointsPerRound: number;
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
  const [submissionWindowDays, setSubmissionWindowDays] = useState(
    league.submissionWindowDays,
  );
  const [votingWindowDays, setVotingWindowDays] = useState(
    league.votingWindowDays,
  );
  const [downvotePoints, setDownvotePoints] = useState(
    league.downvotePointsPerRound,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
      submissionWindowDays,
      votingWindowDays,
      downvotePointsPerRound: downvotePoints,
    });
  };

  return (
    <>
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
                  <Label>Submission Window</Label>
                  <Select
                    value={String(submissionWindowDays)}
                    onValueChange={(v) => setSubmissionWindowDays(Number(v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBMISSION_WINDOW_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Voting Window</Label>
                  <Select
                    value={String(votingWindowDays)}
                    onValueChange={(v) => setVotingWindowDays(Number(v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VOTING_WINDOW_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

                {allowDownvotes && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="settings-downvote-points">
                      Downvote Points per Round
                    </Label>
                    <Input
                      id="settings-downvote-points"
                      type="number"
                      min={1}
                      max={10}
                      value={downvotePoints}
                      onChange={(e) =>
                        setDownvotePoints(Number(e.target.value))
                      }
                    />
                  </div>
                )}

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
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete League
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {isOwner && (
              <Button onClick={handleSave} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete League</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{league.name}&rdquo; and all
              its rounds, submissions, and votes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setDeleteDialogOpen(false);
                onDelete();
              }}
            >
              {isDeleting ? "Deleting..." : "Delete League"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const REPORT_REASONS = [
  { key: "SPAM" as const, label: "Spam" },
  { key: "OFFENSIVE" as const, label: "Offensive content" },
  { key: "HARASSMENT" as const, label: "Harassment" },
  { key: "OTHER" as const, label: "Other" },
];

function ReportDialog({
  open,
  onClose,
  contentType,
  contentId,
  contentLabel,
  reportedUserId,
}: {
  open: boolean;
  onClose: () => void;
  contentType: "LEAGUE" | "USER";
  contentId: string;
  contentLabel: string;
  reportedUserId?: string;
}) {
  const trpc = useTRPC();
  const [reason, setReason] = useState<
    "SPAM" | "OFFENSIVE" | "HARASSMENT" | "OTHER" | null
  >(null);
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const reportMutation = useMutation(
    trpc.moderation.reportContent.mutationOptions({
      onSuccess: () => {
        setSubmitted(true);
      },
    }),
  );

  const handleSubmit = () => {
    if (!reason) return;
    reportMutation.mutate({
      contentType,
      contentId,
      reportedUserId,
      reason,
      details: details.trim() || undefined,
    });
  };

  const handleClose = () => {
    setReason(null);
    setDetails("");
    setSubmitted(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {submitted ? "Report Submitted" : "Report Content"}
          </DialogTitle>
          {!submitted && (
            <DialogDescription>
              Report &ldquo;{contentLabel}&rdquo;
            </DialogDescription>
          )}
        </DialogHeader>

        {submitted ? (
          <div className="py-4 text-center">
            <p className="text-muted-foreground text-sm">
              Thank you for your report. We&apos;ll review it and take
              appropriate action.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Reason</Label>
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.key}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    reason === r.key
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === r.key}
                    onChange={() => setReason(r.key)}
                    className="sr-only"
                  />
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                      reason === r.key
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {reason === r.key && (
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-details">
                Additional details (optional)
              </Label>
              <Textarea
                id="report-details"
                rows={3}
                maxLength={1000}
                placeholder="Provide more context..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>

            {reportMutation.error && (
              <p className="text-destructive text-sm">
                {reportMutation.error.message}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            {submitted ? "Close" : "Cancel"}
          </Button>
          {!submitted && (
            <Button
              onClick={handleSubmit}
              disabled={!reason || reportMutation.isPending}
            >
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
