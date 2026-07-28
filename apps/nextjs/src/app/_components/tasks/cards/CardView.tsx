"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import type { RouterOutputs } from "@acme/api";
import { cn } from "@acme/ui";

import { useCreateTask } from "../../create-task-context";
import { InlineCreateTask } from "../InlineCreateTask";
import { buildCardEntries, seededJitter } from "./card-utils";
import { DynamicTaskCard, FLIP_EASE, FLIP_MS } from "./DynamicTaskCard";
import { useFinePointer } from "./useCardTilt";

/**
 * Keyframes for the living-card effects (breathing priority glow, overdue
 * smolder, subtask frontier pulse, due-soon urgency ring). Scoped with a tk-
 * prefix and kept next to the only view that uses them; the media query kills
 * every ambient animation under prefers-reduced-motion.
 */
const CARD_VIEW_CSS = `
/* Applied to a dedicated glow layer carrying a STATIC box-shadow; only its
   opacity animates, which stays on the compositor — animating box-shadow
   itself is paint-bound and repainted the whole blurred card every frame. */
@keyframes tk-breathe {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}
@keyframes tk-smolder {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
}
/* The "next up" subtask segment. Opacity only — this now lights a bar segment
   rather than a dot, and a scale pulse would make the bar visibly jitter. */
@keyframes tk-frontier {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
}
@keyframes tk-urgent {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--priority-medium) 45%, transparent); }
  70% { box-shadow: 0 0 0 7px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}
.tk-breathe { animation: tk-breathe 3.6s ease-in-out infinite; }
.tk-breathe-slow { animation: tk-breathe 5.4s ease-in-out infinite; }
.tk-smolder { animation: tk-smolder 2.6s ease-in-out infinite; }
.tk-frontier { animation: tk-frontier 1.8s ease-in-out infinite; }
.tk-urgent { animation: tk-urgent 1.7s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .tk-breathe, .tk-breathe-slow, .tk-smolder, .tk-frontier, .tk-urgent {
    animation: none;
  }
}
/* Gapless tessellation: tighten every rounded-2xl inside the mosaic so the
   corner notches where four tiles meet stay small. */
.tk-mosaic { --radius-2xl: 0.75rem; }
`;

/**
 * The card view: a weighted glass mosaic where urgency takes up space.
 * Overdue and high-priority tasks deal in as wide hero cards, standard tasks
 * fill the grid, low-priority ones tuck in small, and completed cards sink
 * dimmed to the bottom of the pile. Reflows are spring-animated; entrances are
 * staggered like a dealt hand.
 */
export function CardView({
  tasks,
  categories,
}: {
  tasks: RouterOutputs["task"]["all"];
  categories: RouterOutputs["category"]["all"] | undefined;
}) {
  const { isCreating } = useCreateTask();
  const reducedMotion = useReducedMotion();
  const finePointer = useFinePointer();

  const entries = useMemo(() => buildCardEntries(tasks), [tasks]);

  // Cards mid-flip resize on the flip's timing; everything else keeps the
  // snappy reorder spring. A Set rather than a single id because more than one
  // card can be open at once.
  const [flipping, setFlipping] = useState<ReadonlySet<string>>(new Set());
  const handleFlipActive = useCallback((taskId: string, active: boolean) => {
    setFlipping((prev) => {
      if (prev.has(taskId) === active) return prev;
      const next = new Set(prev);
      if (active) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  }, []);

  return (
    // `@container`, not viewport breakpoints: the mosaic lives inside a panel
    // whose width the collapsible sidebar changes by 256px. Keyed off the
    // viewport, `sm:grid-cols-2` handed out 184px tiles at a 768px viewport
    // with the sidebar open — narrower than the 180px of 44px action targets a
    // tile has to carry, and a tile cannot clip them (overflow would flatten
    // the preserve-3d parallax). Measuring the panel instead makes the column
    // count fall back to 1 exactly when the panel is too narrow to hold two.
    <div className="@container w-full">
      <style>{CARD_VIEW_CSS}</style>

      {finePointer && !reducedMotion && (
        <p className="text-muted-foreground mb-3 hidden text-xs sm:block">
          Flick a card right to complete it · pull one down to snooze · click to
          flip and edit
        </p>
      )}

      {isCreating && (
        <div className="mb-4">
          <InlineCreateTask />
        </div>
      )}

      {/* Snug tiling: stretch alignment makes every card fill its row so tile
          edges line up; a hairline gap keeps the tiles from fusing together. */}
      <div className="tk-mosaic grid grid-flow-dense grid-cols-1 gap-2 @md:grid-cols-2 @3xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {entries.map(({ task, weight, dueStatus, snoozed }, i) => (
            <motion.div
              key={task.id}
              layout={!reducedMotion}
              // Must track the grid's own breakpoint: a `span 2` in a
              // single-column grid would materialise an implicit second column.
              className={cn(weight === "hero" && "@md:col-span-2")}
              initial={
                reducedMotion
                  ? { opacity: 0 }
                  : {
                      opacity: 0,
                      y: 36,
                      scale: 0.92,
                      rotate: seededJitter(task.id) * 2.5,
                    }
              }
              animate={
                reducedMotion
                  ? { opacity: 1 }
                  : { opacity: 1, y: 0, scale: 1, rotate: 0 }
              }
              exit={
                // Explicit delay: 0 — the mount stagger below would otherwise
                // also delay EXIT, leaving a popLayout ghost floating around.
                reducedMotion
                  ? { opacity: 0, transition: { duration: 0.15, delay: 0 } }
                  : {
                      opacity: 0,
                      y: -12,
                      scale: 0.9,
                      transition: {
                        type: "spring",
                        stiffness: 320,
                        damping: 28,
                        delay: 0,
                      },
                    }
              }
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 28,
                // Stagger the deal on mount…
                delay: Math.min(i, 9) * 0.055,
                // …but never delay reflows when the mosaic re-sorts.
                layout: flipping.has(task.id)
                  ? // Grow/shrink in lockstep with the card's own rotation.
                    {
                      duration: FLIP_MS / 1000,
                      ease: FLIP_EASE,
                      delay: 0,
                    }
                  : {
                      type: "spring",
                      stiffness: 320,
                      damping: 28,
                      delay: 0,
                    },
              }}
            >
              <DynamicTaskCard
                task={task}
                categories={categories}
                weight={weight}
                dueStatus={dueStatus}
                snoozed={snoozed}
                onFlipActive={handleFlipActive}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
