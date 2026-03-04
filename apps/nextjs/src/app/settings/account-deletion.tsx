"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";

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
import { Input } from "@acme/ui/input";
import { toast } from "@acme/ui/toast";

import { authClient } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

export function AccountDeletion() {
  const trpc = useTRPC();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const deleteAccount = useMutation(
    trpc.user.deleteAccount.mutationOptions({
      onSuccess: async () => {
        toast.success("Account deleted successfully");
        try {
          await authClient.signOut();
        } catch {
          // Session already deleted on server
        }
        router.push("/");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleDelete = () => {
    if (confirmText !== "DELETE") return;
    deleteAccount.mutate({ confirmation: "DELETE" });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!deleteAccount.isPending) {
      setOpen(newOpen);
      if (!newOpen) setConfirmText("");
    }
  };

  return (
    <div className="glass-card rounded-2xl border-[#E57373]/20 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#E57373]">Danger Zone</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Irreversible actions that affect your account.
        </p>
      </div>

      <div className="rounded-xl border border-[#E57373]/20 bg-[#2A1010]/30 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[#E57373]">
              Delete Account
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Permanently delete your account, all tasks, lists, and
              preferences. This action cannot be undone.
            </p>
          </div>

          <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="shrink-0 bg-[#E57373] text-white hover:bg-[#D32F2F]"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="border-[#E57373]/30 bg-[#1A0A0A]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[#E57373]">
                  Delete your account?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[#DCE4E4]/70">
                  This will permanently delete your account and all associated
                  data including tasks, lists, and preferences. This action
                  is irreversible.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2">
                <p className="text-sm text-[#DCE4E4]/70">
                  Type <span className="font-bold text-[#E57373]">DELETE</span>{" "}
                  to confirm.
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && confirmText === "DELETE") {
                      handleDelete();
                    }
                  }}
                  placeholder='Type "DELETE" to confirm'
                  className="border-[#E57373]/30 bg-[#0A1A1A] text-[#DCE4E4] placeholder:text-[#8FA8A8] focus:border-[#E57373]"
                  disabled={deleteAccount.isPending}
                  autoComplete="off"
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={deleteAccount.isPending}
                  className="border-[#164B49] bg-[#102A2A] text-[#DCE4E4] hover:bg-[#183F3F] hover:text-[#DCE4E4]"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={confirmText !== "DELETE" || deleteAccount.isPending}
                  variant="destructive"
                  className="bg-[#E57373] text-white hover:bg-[#D32F2F] disabled:opacity-50"
                >
                  {deleteAccount.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Forever"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
