"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
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
import { toast } from "@acme/ui/toast";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

export default function ListDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const { data: list, isLoading } = useQuery({
    ...trpc.taskList.byId.queryOptions({ id: params.id }),
    enabled: !!session?.user,
  });

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isOwner = list ? list.ownerId === session?.user.id : false;

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
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-[#8FA8A8]">Loading...</div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-xl text-white">List not found</p>
        <Link href="/" className="text-[#50C878] hover:underline">
          Back to tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-[#0A1A1A] px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-[#8FA8A8] transition-colors hover:text-[#DCE4E4]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tasks
        </Link>

        {/* Header */}
        <div className="glass-card mb-6 rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-4">
            <div
              className="h-12 w-12 rounded-xl"
              style={{ backgroundColor: list.color ?? "#8FA8A8" }}
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{list.name}</h1>
              {list.description && (
                <p className="mt-1 text-sm text-[#8FA8A8]">
                  {list.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Members Section */}
        <div className="glass-card mb-6 rounded-2xl border border-white/10 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#50C878]" />
            <h2 className="text-lg font-semibold text-white">Members</h2>
            <span className="text-sm text-[#8FA8A8]">
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
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#164B49]">
                    {member.user.image ? (
                      <Image
                        src={member.user.image}
                        alt={member.user.name}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#DCE4E4]">
                        {member.user.name[0]}
                      </div>
                    )}
                  </div>

                  {/* Name and email */}
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-white">
                      {member.user.name}
                    </p>
                    <p className="truncate text-xs text-[#8FA8A8]">
                      {member.user.email}
                    </p>
                  </div>

                  {/* Role badge / controls */}
                  {isMemberOwner ? (
                    <div className="flex items-center gap-1.5 rounded-full bg-[#50C878]/10 px-3 py-1 text-xs font-medium text-[#50C878]">
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
                        <SelectTrigger className="h-8 w-24 border-white/10 bg-transparent text-xs text-[#DCE4E4]">
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
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#8FA8A8]">
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
          <div className="glass-card mb-6 rounded-2xl border border-white/10 p-6">
            <div className="mb-4 flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-[#50C878]" />
              <h2 className="text-lg font-semibold text-white">
                Invite People
              </h2>
            </div>

            {inviteCode ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
                  <code className="flex-1 truncate text-sm text-[#DCE4E4]">
                    {window.location.origin}/invite/{inviteCode}
                  </code>
                  <button
                    onClick={handleCopyInvite}
                    className={cn(
                      "rounded-md p-2 transition-colors",
                      copied
                        ? "text-[#50C878]"
                        : "text-[#8FA8A8] hover:text-[#DCE4E4]",
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
                  className="w-fit text-[#8FA8A8] hover:text-[#DCE4E4]"
                >
                  Generate new link
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => createInvite.mutate({ listId: params.id })}
                disabled={createInvite.isPending}
                className="bg-[#50C878] text-[#0A1A1A] hover:bg-[#66D99A]"
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
          <h2 className="mb-4 text-lg font-semibold text-red-400">
            Danger Zone
          </h2>

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
              <AlertDialogContent className="border-white/10 bg-[#0A1A1A]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">
                    Delete &ldquo;{list.name}&rdquo;?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this list. Tasks in this list
                    will be moved back to personal. This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-white/10 text-[#DCE4E4]">
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
              <AlertDialogContent className="border-white/10 bg-[#0A1A1A]">
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
                  <AlertDialogCancel className="border-white/10 text-[#DCE4E4]">
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
    </div>
  );
}
