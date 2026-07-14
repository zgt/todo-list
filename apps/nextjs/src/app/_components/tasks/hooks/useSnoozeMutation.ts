import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";

// Snooze mutation shared between the snooze popover content, the snooze pill,
// and the task card's mobile snooze menu.
export function useSnoozeMutation() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.task.snooze.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.task.pathFilter()),
          queryClient.invalidateQueries(trpc.taskList.pathFilter()),
        ]);
        toast.success("Task snoozed!");
      },
      onError: () => toast.error("Failed to snooze task"),
    }),
  );
}
