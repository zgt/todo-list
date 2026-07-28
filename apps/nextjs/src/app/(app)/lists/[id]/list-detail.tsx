"use client";

import { useState } from "react";
import Image from "next/image";
import { notFound, useParams, useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  Check,
  Copy,
  Crown,
  Eye,
  LinkIcon,
  LogOut,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";

import { cn } from "@acme/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@acme/ui/alert-dialog";
import { Button } from "@acme/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";
import { Switch } from "@acme/ui/switch";
import { toast } from "@acme/ui/toast";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

export function ListDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const { data: list } = useSuspenseQuery(
    trpc.taskList.byId.queryOptions({ id: params.id }),
  );

  if (!list) notFound();

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isOwner = list.ownerId === session?.user.id;

  const createInvite = useMutation(
    trpc.taskList.createInvite.mutationOptions({
      onSuccess: (data) => {
        setInviteCode(data.inviteCode);
        toast.success("Invite link generated!");
      },
      onError: () => {
        toast.error("Failed to generate invite");
      },
    }),
  );

  const removeMember = useMutation(
    trpc.taskList.removeMember.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.taskList.byId.queryFilter({ id: params.id }),
        );
        toast.success("Member removed");
      },
      onError: (err) => {
        toast.error(err.message);
      },
    }),
  );

  const updateMemberRole = useMutation(
    trpc.taskList.updateMemberRole.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.taskList.byId.queryFilter({ id: params.id }),
        );
        toast.success("Role updated");
      },
      onError: (err) => {
        toast.error(err.message);
      },
    }),
  );

  const updateFilterVisibility = useMutation(
    trpc.taskList.updateFilterVisibility.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.taskList.byId.queryFilter({ id: params.id }),
        );
        await queryClient.invalidateQueries(trpc.taskList.all.queryFilter());
      },
      onError: () => {
        toast.error("Failed to update filter visibility");
      },
    }),
  );

  const deleteList = useMutation(
    trpc.taskList.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.taskList.pathFilter());
        toast.success("List deleted");
        router.push("/");
      },
      onError: () => {
        toast.error("Failed to delete list");
      },
    }),
  );

  const leaveList = useMutation(
    trpc.taskList.leave.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.taskList.pathFilter());
        toast.success("Left list");
        router.push("/");
      },
      onError: (err) => {
        toast.error(err.message);
      },
    }),
  );

  const handleCopyInvite = async () => {
    if (!inviteCode) return;
    const url = `${window.location.origin}/invite/${inviteCode}`;
    try {
      // Rejects when the clipboard permission is denied or the page isn't a
      // secure context — surface it instead of leaving an unhandled rejection.
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the invite link — copy it manually");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-xl"
            style={{ backgroundColor: list.color ?? "var(--muted-foreground)" }}
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{list.name}</h1>
            {list.description && (
              <p className="text-muted-foreground mt-1 text-sm">
                {list.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filter Visibility */}
      {(() => {
        const currentMember = list.members.find(
          (m) => m.userId === session?.user.id,
        );
        if (!currentMember) return null;
        return (
          <div className="glass-card rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="text-primary h-5 w-5" />
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Show in filter
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    Display this list in the top filter bar and sidebar
                  </p>
                </div>
              </div>
              <Switch
                checked={currentMember.showInFilter}
                onCheckedChange={(checked) =>
                  updateFilterVisibility.mutate({
                    listId: params.id,
                    showInFilter: checked,
                  })
                }
              />
            </div>
          </div>
        );
      })()}

      {/* Members Section */}
      <div className="glass-card rounded-2xl border border-white/10 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="text-primary h-5 w-5" />
          <h2 className="text-lg font-semibold text-white">Members</h2>
          <span className="text-muted-foreground text-sm">
            ({list.members.length})
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {list.members.map((member) => {
            const isMemberOwner = member.role === "owner";

            return (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3"
              >
                {/* Avatar */}
                <div className="bg-border-strong h-10 w-10 shrink-0 overflow-hidden rounded-full">
                  {member.user.image ? (
                    <Image
                      src={member.user.image}
                      alt={member.user.name}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-foreground flex h-full w-full items-center justify-center text-sm font-bold">
                      {member.user.name[0]}
                    </div>
                  )}
                </div>

                {/* Name and email */}
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-white">
                    {member.user.name}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {member.user.email}
                  </p>
                </div>

                {/* Role badge / controls */}
                {isMemberOwner ? (
                  <div className="bg-primary/10 text-primary flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
                    <Crown className="h-3 w-3" />
                    Owner
                  </div>
                ) : isOwner ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(role: string) => {
                        if (role === "editor" || role === "viewer") {
                          updateMemberRole.mutate({
                            listId: params.id,
                            userId: member.userId,
                            role,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="text-foreground h-8 w-24 border-white/10 bg-transparent text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() =>
                        removeMember.mutate({
                          listId: params.id,
                          userId: member.userId,
                        })
                      }
                      disabled={removeMember.isPending}
                      className="rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-500/10"
                      aria-label={`Remove ${member.user.name}`}
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-muted-foreground rounded-full border border-white/10 px-3 py-1 text-xs">
                    {member.role}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Invite Section (owner only) */}
      {isOwner && (
        <div className="glass-card rounded-2xl border border-white/10 p-6">
          <div className="mb-4 flex items-center gap-2">
            <LinkIcon className="text-primary h-5 w-5" />
            <h2 className="text-lg font-semibold text-white">Invite People</h2>
          </div>

          {inviteCode ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
                <code className="text-foreground flex-1 truncate text-sm">
                  {window.location.origin}/invite/{inviteCode}
                </code>
                <button
                  onClick={handleCopyInvite}
                  aria-label={
                    copied ? "Invite link copied" : "Copy invite link"
                  }
                  className={cn(
                    "rounded-md p-2 transition-colors",
                    copied
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setInviteCode(null);
                  createInvite.mutate({ listId: params.id });
                }}
                className="text-muted-foreground hover:text-foreground w-fit"
              >
                Generate new link
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => createInvite.mutate({ listId: params.id })}
              disabled={createInvite.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              {createInvite.isPending
                ? "Generating..."
                : "Generate Invite Link"}
            </Button>
          )}
        </div>
      )}

      {/* Danger Zone */}
      <div className="glass-card rounded-2xl border border-red-500/20 p-6">
        <h2 className="mb-4 text-lg font-semibold text-red-400">Danger Zone</h2>

        {isOwner ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="gap-2"
                disabled={deleteList.isPending}
              >
                <Trash2 className="h-4 w-4" />
                Delete List
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-surface border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">
                  Delete &ldquo;{list.name}&rdquo;?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this list. Tasks in this list
                  will be moved back to personal. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-foreground border-white/10">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => deleteList.mutate({ id: params.id })}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="gap-2"
                disabled={leaveList.isPending}
              >
                <LogOut className="h-4 w-4" />
                Leave List
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-surface border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">
                  Leave &ldquo;{list.name}&rdquo;?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  You will no longer see tasks from this list. You can rejoin
                  with a new invite link.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-foreground border-white/10">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => leaveList.mutate({ listId: params.id })}
                >
                  Leave
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
