import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";

// Task-level mutations for a single task card: optimistic update, optimistic
// delete with an undo toast, restore (delete undo + Trash view), and
// permanent delete-forever (Trash view).
export function useTaskMutations(taskId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateTask = useMutation(
    trpc.task.update.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries(trpc.task.all.queryFilter());
        const previousTasks = queryClient.getQueryData(
          trpc.task.all.queryKey(),
        );
        queryClient.setQueryData(trpc.task.all.queryKey(), (old) => {
          if (!old) return old;
          return old.map((task) =>
            task.id === variables.id ? { ...task, ...variables } : task,
          );
        });
        return { previousTasks };
      },
      onError: (err, variables, context) => {
        if (context?.previousTasks) {
          queryClient.setQueryData(
            trpc.task.all.queryKey(),
            context.previousTasks,
          );
        }
        toast.error("Failed to update task");
      },
      onSettled: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.task.pathFilter()),
          queryClient.invalidateQueries(trpc.taskList.pathFilter()),
        ]);
      },
    }),
  );

  const restoreTask = useMutation(
    trpc.task.restore.mutationOptions({
      onError: () => toast.error("Failed to restore task"),
      onSettled: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.task.pathFilter()),
          queryClient.invalidateQueries(trpc.taskList.pathFilter()),
        ]);
      },
    }),
  );

  const deleteForeverTask = useMutation(
    trpc.task.deleteForever.mutationOptions({
      onSuccess: () => toast.success("Task deleted forever"),
      onError: () => toast.error("Failed to delete task"),
      onSettled: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.task.pathFilter()),
          queryClient.invalidateQueries(trpc.taskList.pathFilter()),
        ]);
      },
    }),
  );

  const deleteTask = useMutation(
    trpc.task.delete.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries(trpc.task.all.queryFilter());
        const previousTasks = queryClient.getQueryData(
          trpc.task.all.queryKey(),
        );
        queryClient.setQueryData(trpc.task.all.queryKey(), (old) =>
          old?.filter((t) => t.id !== taskId),
        );
        return { previousTasks };
      },
      onError: (_err, _vars, context) => {
        if (context?.previousTasks) {
          queryClient.setQueryData(
            trpc.task.all.queryKey(),
            context.previousTasks,
          );
        }
        toast.error("Failed to delete task");
      },
      onSuccess: () => {
        toast.success("Task deleted", {
          action: {
            label: "Undo",
            onClick: () => restoreTask.mutate(taskId),
          },
        });
      },
      onSettled: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.task.pathFilter()),
          queryClient.invalidateQueries(trpc.taskList.pathFilter()),
        ]);
      },
    }),
  );

  return { updateTask, restoreTask, deleteTask, deleteForeverTask };
}
