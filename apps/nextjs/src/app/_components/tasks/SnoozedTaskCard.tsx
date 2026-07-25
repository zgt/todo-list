"use client";

import { AlarmClock, BellOff, Calendar } from "lucide-react";

import type { RouterOutputs } from "@acme/api";

import { PriorityBadge } from "../priority";
import { useUnsnoozeMutation } from "./hooks/useUnsnoozeMutation";

type SnoozedTask = RouterOutputs["task"]["snoozed"][number];
type Categories = RouterOutputs["category"]["all"] | undefined;

// Formats the wake-up time as "Today at 4:00 PM" / "Tomorrow at 9:00 AM" /
// "Mon, Jul 28 at 9:00 AM", so the common near-term snoozes read at a glance.
function formatWakeUp(date: Date): string {
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDelta = Math.round(
    (startOfDay(date) - startOfDay(new Date())) / 86_400_000,
  );

  if (dayDelta === 0) return `Today at ${time}`;
  if (dayDelta === 1) return `Tomorrow at ${time}`;

  return `${date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} at ${time}`;
}

// Read-mostly card for the Snoozed view. Snoozed tasks are filtered out of
// `task.all` until they wake up, so this card exists purely to surface them and
// offer the one action that brings them back: Unsnooze.
export function SnoozedTaskCard({
  task,
  categories,
}: {
  task: SnoozedTask;
  categories: Categories;
}) {
  const unsnoozeTask = useUnsnoozeMutation();

  const category = categories?.find((c) => c.id === task.categoryId);
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

  return (
    <div className="border-border-strong bg-surface-2/60 rounded-xl border p-3 backdrop-blur-sm sm:rounded-2xl sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 grow space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-400 uppercase">
              <AlarmClock className="h-3 w-3" aria-hidden="true" />
              {task.snoozedUntil
                ? `Wakes ${formatWakeUp(new Date(task.snoozedUntil))}`
                : "Snoozed"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <h2 className="text-foreground truncate text-sm font-medium sm:text-base">
              {task.title}
            </h2>
            {task.subtasks.length > 0 && (
              <span className="text-muted-foreground shrink-0 text-sm">
                {completedSubtasks}/{task.subtasks.length}
              </span>
            )}
          </div>

          {task.description ? (
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {task.description}
            </p>
          ) : null}

          {/* Read-only metadata */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 sm:gap-2">
            <PriorityBadge priority={task.priority} variant="compact" />
            {task.dueDate && (
              <div className="border-border-strong bg-surface-2/80 text-muted-foreground flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium">
                <Calendar className="h-3 w-3" aria-hidden="true" />
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
            onClick={() => unsnoozeTask.mutate({ id: task.id })}
            disabled={unsnoozeTask.isPending}
            className="text-muted-foreground hover:bg-primary/10 hover:text-primary focus:ring-border-focus/20 flex min-h-11 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus:ring-2 focus:outline-none disabled:opacity-50"
            aria-label={`Unsnooze ${task.title}`}
          >
            <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Unsnooze</span>
          </button>
        </div>
      </div>
    </div>
  );
}
