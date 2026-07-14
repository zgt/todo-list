import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";

// Optimistic subtask CRUD mutations scoped to a single parent task. Handles the
// auto-complete/un-complete parent logic on subtask updates.
export function useSubtaskMutations(taskId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createSubtask = useMutation(
    trpc.subtask.create.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries(trpc.task.all.queryFilter());
        const prev = queryClient.getQueryData(trpc.task.all.queryKey());
        queryClient.setQueryData(trpc.task.all.queryKey(), (old) => {
          if (!old) return old;
          return old.map((t) =>
            t.id !== taskId
              ? t
              : {
                  ...t,
                  subtasks: [
                    ...t.subtasks,
                    {
                      id: crypto.randomUUID(),
                      taskId: taskId,
                      title: variables.title,
                      completed: false,
                      sortOrder: t.subtasks.length,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      completedAt: null,
                    },
                  ],
                },
          );
        });
        return { prev };
      },
      onError: (_err, _vars, context) => {
        if (context?.prev)
          queryClient.setQueryData(trpc.task.all.queryKey(), context.prev);
        toast.error("Failed to add subtask");
      },
      onSettled: async () => {
        await queryClient.invalidateQueries(trpc.task.pathFilter());
      },
    }),
  );

  const updateSubtask = useMutation(
    trpc.subtask.update.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries(trpc.task.all.queryFilter());
        const prev = queryClient.getQueryData(trpc.task.all.queryKey());
        queryClient.setQueryData(trpc.task.all.queryKey(), (old) => {
          if (!old) return old;
          return old.map((t) => {
            if (t.id !== taskId) return t;
            const updatedSubtasks = t.subtasks.map((s) =>
              s.id === variables.id
                ? {
                    ...s,
                    ...variables,
                    completedAt:
                      variables.completed === true
                        ? new Date()
                        : variables.completed === false
                          ? null
                          : s.completedAt,
                  }
                : s,
            );
            // Auto-complete/un-complete parent based on subtask states
            const allCompleted =
              updatedSubtasks.length > 0 &&
              updatedSubtasks.every((s) => s.completed);
            return {
              ...t,
              subtasks: updatedSubtasks,
              completed: allCompleted,
              completedAt: allCompleted
                ? (t.completedAt ?? new Date())
                : variables.completed === false
                  ? null
                  : t.completedAt,
            };
          });
        });
        return { prev };
      },
      onError: (_err, _vars, context) => {
        if (context?.prev)
          queryClient.setQueryData(trpc.task.all.queryKey(), context.prev);
        toast.error("Failed to update subtask");
      },
      onSettled: async () => {
        await queryClient.invalidateQueries(trpc.task.pathFilter());
      },
    }),
  );

  const deleteSubtask = useMutation(
    trpc.subtask.delete.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries(trpc.task.all.queryFilter());
        const prev = queryClient.getQueryData(trpc.task.all.queryKey());
        queryClient.setQueryData(trpc.task.all.queryKey(), (old) => {
          if (!old) return old;
          return old.map((t) =>
            t.id !== taskId
              ? t
              : {
                  ...t,
                  subtasks: t.subtasks.filter((s) => s.id !== variables.id),
                },
          );
        });
        return { prev };
      },
      onError: (_err, _vars, context) => {
        if (context?.prev)
          queryClient.setQueryData(trpc.task.all.queryKey(), context.prev);
        toast.error("Failed to delete subtask");
      },
      onSettled: async () => {
        await queryClient.invalidateQueries(trpc.task.pathFilter());
      },
    }),
  );

  return { createSubtask, updateSubtask, deleteSubtask };
}
