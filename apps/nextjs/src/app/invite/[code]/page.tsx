"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users } from "lucide-react";

import { Button } from "@acme/ui/button";
import { toast } from "@acme/ui/toast";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";
import { SignInButtons } from "../../_components/sign-in-buttons";

export default function JoinInvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const returnUrl = `/invite/${encodeURIComponent(params.code)}`;

  const joinByInvite = useMutation(
    trpc.taskList.joinByInvite.mutationOptions({
      onSuccess: async (data) => {
        toast.success(`Joined "${data.name}"!`);
        await Promise.all([
          queryClient.invalidateQueries(trpc.taskList.pathFilter()),
          queryClient.invalidateQueries(trpc.task.pathFilter()),
        ]);
        router.push("/");
      },
      onError: (err) => {
        toast.error(err.message);
      },
    }),
  );

  const handleJoin = () => {
    joinByInvite.mutate({ inviteCode: params.code });
  };

  if (!session?.user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-[#0A1A1A] px-4">
        <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 p-8 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-[#50C878]" />
          <h1 className="mb-2 text-xl font-bold text-white">
            You&apos;ve been invited to a list
          </h1>
          <p className="mb-6 text-sm text-[#8FA8A8]">
            Please sign in to join this shared list.
          </p>
          <SignInButtons returnUrl={returnUrl} />
        </div>
      </div>
    );
  }

  const hasError = joinByInvite.isError;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-[#0A1A1A] px-4">
      <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 p-8 text-center">
        <Users className="mx-auto mb-4 h-12 w-12 text-[#50C878]" />
        <h1 className="mb-2 text-xl font-bold text-white">Join Shared List</h1>
        <p className="mb-2 text-sm text-[#8FA8A8]">
          You&apos;ve been invited to collaborate on a shared task list.
        </p>
        <p className="mb-6 text-xs text-[#8FA8A8]">
          Invite code: <code className="text-[#DCE4E4]">{params.code}</code>
        </p>

        {hasError && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {joinByInvite.error.message}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleJoin}
            disabled={joinByInvite.isPending || hasError}
            className={
              hasError
                ? "w-full border border-[#164B49] bg-[#102A2A] text-[#8FA8A8] hover:bg-[#102A2A]"
                : "w-full bg-[#50C878] text-[#0A1A1A] hover:bg-[#66D99A]"
            }
          >
            {joinByInvite.isPending ? "Joining..." : "Join List"}
          </Button>
          <button
            onClick={() => router.push("/")}
            className="flex items-center justify-center gap-2 text-sm text-[#8FA8A8] transition-colors hover:text-[#DCE4E4]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to tasks
          </button>
        </div>
      </div>
    </div>
  );
}
