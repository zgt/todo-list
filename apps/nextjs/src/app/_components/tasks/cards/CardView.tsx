"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import type { RouterOutputs } from "@acme/api";
import { cn } from "@acme/ui";

import { useCreateTask } from "../../create-task-context";
import { InlineCreateTask } from "../InlineCreateTask";
import { buildCardEntries, seededJitter } from "./card-utils";
import { DynamicTaskCard } from "./DynamicTaskCard";
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
@keyframes tk-frontier {
  0%, 100% { transform: scale(1); opacity: 0.65; }
  50% { transform: scale(1.4); opacity: 1; }
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

  return (
    <div className="w-full">
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

      {/* Gapless: default stretch alignment makes every card fill its row so
          tile edges meet flush; the cards' own borders are the only seams. */}
      <div className="tk-mosaic grid grid-flow-dense grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {entries.map(({ task, weight, dueStatus, snoozed }, i) => (
            <motion.div
              key={task.id}
              layout={!reducedMotion}
              className={cn(weight === "hero" && "sm:col-span-2")}
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
                layout: {
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
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
