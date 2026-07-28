"use client";

import { cn } from "@acme/ui";

interface ConstellationSubtask {
  id: string;
  completed: boolean;
}

/** Above this many subtasks the segmented bar becomes a continuous fill. */
const MAX_SEGMENTS = 8;

/**
 * Subtask progress as a constellation bar: completed subtasks are lit segments,
 * the next one up ("the frontier") glows softly, and the rest wait dim. Short
 * lists stay segmented so you can still count them; long ones collapse to a
 * single proportional fill. Reduced motion: the frontier pulse is disabled via
 * the tk-* CSS (see CardView) and the bar reads statically.
 *
 * `dense` is the compact-tile form — no label, bar and count share one line.
 */
export function SubtaskConstellation({
  subtasks,
  className,
  dense = false,
}: {
  subtasks: ConstellationSubtask[];
  className?: string;
  dense?: boolean;
}) {
  const total = subtasks.length;
  const done = subtasks.filter((s) => s.completed).length;
  const allDone = total > 0 && done === total;
  const frontier = subtasks.findIndex((s) => !s.completed);

  const bar =
    total <= MAX_SEGMENTS ? (
      <div aria-hidden className="flex h-1.5 items-stretch gap-1">
        {subtasks.map((s, i) => (
          <span
            key={s.id}
            className={cn(
              "min-w-0 flex-1 rounded-full transition-colors duration-300",
              s.completed
                ? "bg-primary shadow-[0_0_8px_var(--color-primary)]"
                : i === frontier
                  ? "tk-frontier bg-primary/35"
                  : "bg-border-strong",
            )}
          />
        ))}
      </div>
    ) : (
      <div aria-hidden className="bg-border-strong h-1.5 rounded-full">
        <div
          style={{ width: `${Math.round((done / total) * 100)}%` }}
          className="bg-primary h-full rounded-full shadow-[0_0_8px_var(--color-primary)] transition-[width] duration-300"
        />
      </div>
    );

  const count = (
    <span
      className={cn(
        "shrink-0 text-[11px] font-semibold tabular-nums",
        allDone ? "text-primary" : "text-muted-foreground",
      )}
    >
      {done}
      {/* Hierarchy from weight, not alpha: `muted-foreground/60` put the
          denominator at ~3.2:1 on the glass (and ~2.1:1 on a completed tile,
          which the slab now dims as a unit) — it is content, not decoration. */}
      <span className="text-muted-foreground font-normal">/{total}</span>
    </span>
  );

  const label = `${done} of ${total} subtasks complete`;

  if (dense) {
    return (
      <div
        role="img"
        aria-label={label}
        className={cn("flex min-w-0 items-center gap-2", className)}
      >
        <div className="min-w-0 flex-1">{bar}</div>
        {count}
      </div>
    );
  }

  return (
    <div role="img" aria-label={label} className={cn("min-w-0", className)}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
          {allDone ? "All subtasks done" : "Subtasks"}
        </span>
        {count}
      </div>
      {bar}
    </div>
  );
}
