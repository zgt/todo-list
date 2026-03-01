"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import { toast } from "@acme/ui/toast";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

export function DisplayNameSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const currentName = session?.user?.name ?? "";
  const [name, setName] = useState(currentName);
  const [initialized, setInitialized] = useState(false);

  // Sync initial value when session loads
  if (session?.user?.name && !initialized) {
    setName(session.user.name);
    setInitialized(true);
  }

  const updateName = useMutation(
    trpc.user.updateDisplayName.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Display name updated");
      },
      onError: () => {
        toast.error("Failed to update display name");
      },
    }),
  );

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name cannot be empty");
      return;
    }
    updateName.mutate({ name: trimmed });
  };

  const hasChanges = name.trim() !== currentName;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Display Name</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Change how your name appears across the app.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-[#164B49] bg-[#102A2A]/80 p-4">
          <div className="flex items-center gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && hasChanges) handleSave();
              }}
              placeholder="Your display name"
              maxLength={50}
              className="border-[#164B49] bg-[#0A1A1A] text-[#DCE4E4] placeholder:text-[#8FA8A8] focus:border-[#21716C]"
              disabled={updateName.isPending}
            />
          </div>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={updateName.isPending || !hasChanges || !name.trim()}
        className="bg-primary hover:bg-primary/90 text-black"
      >
        {updateName.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Name"
        )}
      </Button>
    </div>
  );
}
