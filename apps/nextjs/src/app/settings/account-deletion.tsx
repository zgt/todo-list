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
    <div className="border-destructive/20 bg-surface-2/80 rounded-2xl border p-6 backdrop-blur-sm">
      <div className="mb-6">
        <h2 className="text-destructive text-xl font-bold">Danger Zone</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Irreversible actions that affect your account.
        </p>
      </div>

      <div className="border-destructive/20 rounded-xl border bg-[#2A1010]/30 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-destructive text-lg font-semibold">
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
                className="bg-destructive hover:bg-destructive-hover shrink-0 text-white"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="border-destructive/30 bg-[#1A0A0A]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">
                  Delete your account?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-foreground/70">
                  This will permanently delete your account and all associated
                  data including tasks, lists, and preferences. This action is
                  irreversible.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2">
                <p className="text-foreground/70 text-sm">
                  Type{" "}
                  <span className="text-destructive font-bold">DELETE</span> to
                  confirm.
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
                  className="border-destructive/30 bg-surface text-foreground placeholder:text-muted-foreground focus:border-destructive"
                  disabled={deleteAccount.isPending}
                  autoComplete="off"
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={deleteAccount.isPending}
                  className="border-border-strong bg-surface-2 text-foreground hover:bg-surface-hover hover:text-foreground"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={confirmText !== "DELETE" || deleteAccount.isPending}
                  variant="destructive"
                  className="bg-destructive hover:bg-destructive-hover text-white disabled:opacity-50"
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
