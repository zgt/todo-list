"use client";

import { Fragment } from "react";

import { cn } from "@acme/ui";

interface ConstellationSubtask {
  id: string;
  completed: boolean;
}

const MAX_DOTS = 10;

/**
 * Subtask progress as a constellation: completed subtasks are lit stars joined
 * by a glowing thread, the next one up ("the frontier") pulses softly, and the
 * rest wait as hollow dots. Reduced motion: the frontier pulse is disabled via
 * the tk-* CSS (see CardView) and the constellation reads statically.
 */
export function SubtaskConstellation({
  subtasks,
  className,
}: {
  subtasks: ConstellationSubtask[];
  className?: string;
}) {
  const done = subtasks.filter((s) => s.completed).length;
  const shown = subtasks.slice(0, MAX_DOTS);
  const frontierIndex = shown.findIndex((s) => !s.completed);

  return (
    <div
      role="img"
      aria-label={`${done} of ${subtasks.length} subtasks complete`}
      className={cn("flex items-center", className)}
    >
      {shown.map((s, i) => (
        <Fragment key={s.id}>
          {i > 0 && (
            <span
              aria-hidden
              className={cn(
                "h-px w-2.5 sm:w-3",
                shown[i - 1]?.completed ? "bg-primary/50" : "bg-border-strong",
              )}
            />
          )}
          <span
            aria-hidden
            className={cn(
              "size-2 shrink-0 rounded-full",
              s.completed
                ? "bg-primary shadow-[0_0_8px_var(--color-primary)]"
                : i === frontierIndex
                  ? "tk-frontier border-primary/60 bg-primary/30 border"
                  : "border-border-focus border",
            )}
          />
        </Fragment>
      ))}
      {subtasks.length > MAX_DOTS && (
        <span aria-hidden className="text-muted-foreground ml-1.5 text-[10px]">
          +{subtasks.length - MAX_DOTS}
        </span>
      )}
      <span
        aria-hidden
        className="text-muted-foreground ml-2 text-[11px] font-medium tabular-nums"
      >
        {done}/{subtasks.length}
      </span>
    </div>
  );
}
