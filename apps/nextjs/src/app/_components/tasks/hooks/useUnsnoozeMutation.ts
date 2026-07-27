import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";

// Clears a task's snooze so it reappears in the active list. Mirrors
// useSnoozeMutation: invalidate every task query (the task moves between
// task.snoozed and task.all) plus the list queries that embed task counts.
export function useUnsnoozeMutation() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.task.unsnooze.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.task.pathFilter()),
          queryClient.invalidateQueries(trpc.taskList.pathFilter()),
        ]);
        toast.success("Task unsnoozed");
      },
      onError: () => toast.error("Failed to unsnooze task"),
    }),
  );
}
