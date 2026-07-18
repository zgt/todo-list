"use client";

import { Archive, Calendar, RotateCcw, Trash2 } from "lucide-react";

import type { RouterOutputs } from "@acme/api";
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
import { toast } from "@acme/ui/toast";

import { PriorityBadge } from "../priority";
import { useTaskMutations } from "./hooks/useTaskMutations";

type DeletedTask = RouterOutputs["task"]["deleted"][number];
type Categories = RouterOutputs["category"]["all"] | undefined;

// Read-only card for the Trash view. Deleted/archived tasks reject every
// mutation server-side, so this card exposes no checkbox, inline edit, or
// snooze — only Restore and (irreversible) Delete forever.
export function TrashTaskCard({
  task,
  categories,
}: {
  task: DeletedTask;
  categories: Categories;
}) {
  const { restoreTask, deleteForeverTask } = useTaskMutations(task.id);

  // User deletions carry deletedAt; the archive cron sets archivedAt only.
  const isArchived = !task.deletedAt && !!task.archivedAt;
  const category = categories?.find((c) => c.id === task.categoryId);

  const isBusy = restoreTask.isPending || deleteForeverTask.isPending;

  return (
    <div className="border-border-strong bg-surface-2/60 rounded-xl border p-3 backdrop-blur-sm sm:rounded-2xl sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 grow space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={
                isArchived
                  ? "border-border-strong bg-surface-2 text-muted-foreground flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
                  : "text-destructive flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
              }
            >
              {isArchived ? (
                <Archive className="h-3 w-3" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              {isArchived ? "Archived" : "Deleted"}
            </span>
          </div>

          <h2 className="text-muted-foreground truncate text-sm font-medium sm:text-base">
            {task.title}
          </h2>

          {task.description ? (
            <p className="text-muted-foreground/70 line-clamp-2 text-sm">
              {task.description}
            </p>
          ) : null}

          {/* Read-only metadata */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 sm:gap-2">
            <PriorityBadge priority={task.priority} variant="compact" />
            {task.dueDate && (
              <div className="border-border-strong bg-surface-2/80 text-muted-foreground flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium">
                <Calendar className="h-3 w-3" />
                {new Date(task.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            )}
            {category && (
              <div
                className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
                style={{
                  backgroundColor: `${category.color}20`,
                  borderColor: `${category.color}40`,
                  color: category.color,
                }}
              >
                {category.name}
              </div>
            )}
            {task.list && (
              <div className="text-muted-foreground flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      task.list.color ?? "var(--muted-foreground)",
                  }}
                />
                {task.list.name}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() =>
              restoreTask.mutate(task.id, {
                onSuccess: () => toast.success("Task restored"),
              })
            }
            disabled={isBusy}
            className="text-muted-foreground hover:bg-primary/10 hover:text-primary focus:ring-border-focus/20 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus:ring-2 focus:outline-none disabled:opacity-50"
            aria-label="Restore task"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Restore</span>
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={isBusy}
                className="text-muted-foreground focus:ring-border-focus/20 hover:text-destructive flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-red-500/10 focus:ring-2 focus:outline-none disabled:opacity-50"
                aria-label="Delete task forever"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Delete forever</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete forever?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{task.title}&rdquo; and its subtasks will be
                  permanently deleted. This can&rsquo;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => deleteForeverTask.mutate(task.id)}
                >
                  Delete forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
