"use client";

import type { PanInfo } from "framer-motion";
import { memo, useRef, useState } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import {
  AlarmClock,
  Bell,
  CalendarDays,
  Check,
  MoonStar,
  Pencil,
  Repeat,
  Trash2,
  Users,
} from "lucide-react";

import type { RouterOutputs } from "@acme/api";
import { cn } from "@acme/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

import type { CardTask, CardWeight, DueStatus } from "./card-utils";
import { useSnoozeMutation } from "../hooks/useSnoozeMutation";
import { useTaskMutations } from "../hooks/useTaskMutations";
import { getTomorrowAt9am } from "../snooze-utils";
import { SnoozePopoverContent } from "../SnoozePill";
import { CardBack } from "./CardBack";
import { CompletionBurst } from "./CompletionBurst";
import { SubtaskConstellation } from "./SubtaskConstellation";
import { useCardTilt, useFinePointer } from "./useCardTilt";

// Gesture thresholds (px / px-per-second)
const COMPLETE_OFFSET = 150;
const COMPLETE_FLICK_OFFSET = 70;
const SNOOZE_OFFSET = 110;
const SNOOZE_FLICK_OFFSET = 50;
const FLICK_VELOCITY = 500;

const WOBBLE_SPRING = { type: "spring", stiffness: 380, damping: 13 } as const;

/** Per-priority breathing glow color (fed to the tk-breathe keyframes). */
function glowFor(task: CardTask, dueStatus: DueStatus): string | undefined {
  if (task.completed) return undefined;
  if (dueStatus === "overdue")
    return "color-mix(in srgb, var(--priority-medium) 42%, transparent)";
  if (task.priority === "high")
    return "color-mix(in srgb, var(--priority-high) 40%, transparent)";
  if (task.priority === "medium")
    return "color-mix(in srgb, var(--priority-medium) 26%, transparent)";
  return undefined;
}

export const DynamicTaskCard = memo(function DynamicTaskCard({
  task,
  categories,
  weight,
  dueStatus,
  snoozed,
}: {
  task: CardTask;
  categories: RouterOutputs["category"]["all"] | undefined;
  weight: CardWeight;
  dueStatus: DueStatus;
  snoozed: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const finePointer = useFinePointer();

  const { updateTask, deleteTask } = useTaskMutations(task.id);
  const snoozeTask = useSnoozeMutation();

  const [flipped, setFlipped] = useState(false);
  const [burst, setBurst] = useState(false);
  const [snoozeFlash, setSnoozeFlash] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Stays true through the post-release spring/fly-out so the card keeps
  // floating above its neighbors until it has settled.
  const [elevated, setElevated] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  // True from drag start until a tick after drag end. framer-motion's drag
  // feature releases the global drag lock in its own window pointerup handler,
  // which runs BEFORE the press gesture's pointerup checks isDragActive() —
  // so onTap fires after every drag release. This ref is our own guard; it is
  // cleared via setTimeout(0) because onDragEnd and onTap run in the same
  // frame.postRender batch (drag first), so clearing synchronously is too
  // early.
  const draggedRef = useRef(false);

  // --- Physics ---
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const dragRotate = useTransform(x, [-200, 200], [-5, 5]);
  // Stay solid through the decision zone, then dissolve on the way out.
  const dragOpacity = useTransform(x, [0, 180, 400], [1, 0.92, 0.05]);
  const completeHint = useTransform(x, [30, 140], [0, 1]);
  const completeHintScale = useTransform(x, [30, 160], [0.5, 1.15]);
  const snoozeHint = useTransform(y, [24, 95], [0, 1]);

  const canDrag = finePointer && !reducedMotion && !flipped && !task.completed;

  // --- Tilt ---
  const tilt = useCardTilt(weight === "hero" ? 6 : 9);
  const tiltActive = finePointer && !reducedMotion && !flipped && !dragging;

  // --- Actions ---
  const celebrate = () => {
    setBurst(true);
    window.dispatchEvent(new Event("trigger-ripple"));
    window.setTimeout(() => setBurst(false), 900);
  };

  const handleToggleComplete = () => {
    if (task.completed) {
      updateTask.mutate({ id: task.id, completed: false });
      return;
    }
    celebrate();
    updateTask.mutate({ id: task.id, completed: true });
  };

  const springHome = () => {
    void Promise.all([
      animate(x, 0, WOBBLE_SPRING),
      animate(y, 0, WOBBLE_SPRING),
    ]).then(() => setElevated(false));
  };

  /** Flick right: velocity-aware exit, then the card resurfaces in the done pile. */
  const flingComplete = (velocity: number) => {
    celebrate();
    const exitDistance =
      typeof window === "undefined" ? 1200 : window.innerWidth;
    const exit = animate(x, exitDistance, {
      type: "spring",
      stiffness: 150,
      damping: 26,
      velocity: Math.max(velocity, 600),
    });
    animate(y, 0, WOBBLE_SPRING);
    // Complete mid-flight so the mosaic reflows while the card is offscreen.
    window.setTimeout(
      () => updateTask.mutate({ id: task.id, completed: true }),
      260,
    );
    void exit.then(() => {
      // Reappear (dimmed) at the card's new slot in the done pile with a pop.
      x.jump(0);
      y.jump(0);
      scale.jump(0.88);
      animate(scale, 1, { type: "spring", stiffness: 320, damping: 20 });
      setElevated(false);
    });
  };

  /** Pull down: quick-snooze until tomorrow 9am, sink + wobble back. */
  const gestureSnooze = () => {
    setSnoozeFlash(true);
    window.setTimeout(() => setSnoozeFlash(false), 800);
    snoozeTask.mutate({ id: task.id, snoozedUntil: getTomorrowAt9am() });
    springHome();
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setDragging(false);
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
    const { offset, velocity } = info;
    if (
      offset.x > COMPLETE_OFFSET ||
      (offset.x > COMPLETE_FLICK_OFFSET && velocity.x > FLICK_VELOCITY)
    ) {
      flingComplete(velocity.x);
      return;
    }
    if (
      offset.y > SNOOZE_OFFSET ||
      (offset.y > SNOOZE_FLICK_OFFSET && velocity.y > FLICK_VELOCITY)
    ) {
      gestureSnooze();
      return;
    }
    springHome();
  };

  const closeBack = () => {
    setFlipped(false);
    // Return focus to the card so keyboard flow isn't dropped.
    window.setTimeout(() => articleRef.current?.focus(), 0);
  };

  const handleTap = (e: MouseEvent | TouchEvent | PointerEvent) => {
    if (draggedRef.current) return;
    if (flipped) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, [role='dialog']")) return;
    setFlipped(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && flipped) {
      // Escape inside a portaled Radix popover still bubbles here through the
      // React tree; only unflip when the event originated in the card's own
      // DOM, otherwise the popover's Escape would discard unsaved edits.
      if (!articleRef.current?.contains(e.target as Node)) return;
      e.stopPropagation();
      closeBack();
      return;
    }
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setFlipped((f) => !f);
    }
  };

  const glow = glowFor(task, dueStatus);
  const hero = weight === "hero";
  const compact = weight === "compact";

  // Parallax depths (only meaningful while tilting; harmless flat otherwise)
  const tz = (depth: number) =>
    tiltActive ? { transform: `translateZ(${depth}px)` } : undefined;

  const actionBtn =
    "flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:outline-none";

  return (
    <motion.article
      ref={articleRef}
      tabIndex={0}
      aria-label={`${task.title}${task.completed ? ", completed" : ""}${dueStatus === "overdue" ? ", overdue" : ""}`}
      onKeyDown={handleKeyDown}
      drag={canDrag}
      dragSnapToOrigin={false}
      dragMomentum={false}
      onDragStart={() => {
        draggedRef.current = true;
        setDragging(true);
        setElevated(true);
        tilt.reset();
      }}
      onDragEnd={handleDragEnd}
      onTap={handleTap}
      onPointerMove={tiltActive ? tilt.handlePointerMove : undefined}
      onPointerLeave={tiltActive ? tilt.reset : undefined}
      style={{
        x,
        y,
        scale,
        // Keyed off `elevated` too: during flingComplete the optimistic
        // completed:true flips canDrag false mid-flight, and keying off canDrag
        // alone would snap these to rest while the card is still flying.
        rotate: canDrag || elevated ? dragRotate : 0,
        opacity: canDrag || elevated ? dragOpacity : 1,
        // Lift the card above its neighbors while it's being thrown around.
        zIndex: elevated ? 30 : undefined,
        perspective: 900,
        ...(glow ? ({ "--tk-glow": glow } as React.CSSProperties) : {}),
      }}
      className={cn(
        "group relative h-full rounded-2xl outline-none",
        // z-lift on focus so the ring isn't painted over by flush neighbors
        "focus-visible:ring-border-focus focus-visible:z-20 focus-visible:ring-2",
        canDrag && "cursor-grab active:cursor-grabbing",
        !canDrag && !flipped && "cursor-pointer",
      )}
    >
      {/* Tilting glass slab. Grouping properties (backdrop-filter, filter,
          overflow, clip-path) must NOT live on this element: they force the
          used transform-style to flat and kill the translateZ parallax — the
          blur + background live on the absolute child layer below instead. */}
      <motion.div
        style={{
          rotateX: tiltActive ? tilt.rotateX : 0,
          rotateY: tiltActive ? tilt.rotateY : 0,
          transformStyle: "preserve-3d",
        }}
        className={cn(
          "relative h-full rounded-2xl border shadow-lg transition-colors duration-300",
          "border-border-strong",
          task.completed
            ? "border-primary/40"
            : dueStatus === "overdue"
              ? "border-amber-500/30"
              : "hover:border-border-focus",
        )}
      >
        {/* Breathing priority glow — a static box-shadow whose OPACITY is
            animated (compositor-friendly), instead of animating box-shadow
            itself (paint-bound, repaints the whole card every frame). */}
        {glow && !task.completed && !reducedMotion && (
          <div
            aria-hidden
            style={{ boxShadow: "0 0 30px -2px var(--tk-glow)" }}
            className={cn(
              "pointer-events-none absolute inset-0 rounded-2xl",
              dueStatus === "overdue" || task.priority === "high"
                ? "tk-breathe"
                : "tk-breathe-slow",
            )}
          />
        )}

        {/* Glass background layer (see the preserve-3d note above) */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 rounded-2xl backdrop-blur-sm transition-colors duration-300",
            task.completed ? "bg-primary/5" : "bg-surface-2/80",
          )}
        />
        {/* Pointer sheen — light gliding across the glass */}
        {tiltActive && (
          <motion.div
            aria-hidden
            style={{ background: tilt.sheen }}
            className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
          />
        )}

        {/* Overdue smolder — amber embers at the foot of the card */}
        {dueStatus === "overdue" && !task.completed && (
          <div
            aria-hidden
            className="tk-smolder from-priority-medium/15 pointer-events-none absolute inset-x-0 bottom-0 h-1/2 rounded-b-2xl bg-gradient-to-t to-transparent"
          />
        )}

        {/* Drag gesture hints */}
        {canDrag && (
          <>
            <motion.div
              aria-hidden
              style={{ opacity: completeHint }}
              className="from-primary/40 pointer-events-none absolute inset-y-0 right-0 z-20 flex w-1/2 items-center justify-end rounded-r-2xl bg-gradient-to-l to-transparent pr-5"
            >
              <motion.span style={{ scale: completeHintScale }}>
                <Check className="text-primary size-8 drop-shadow-[0_0_12px_var(--color-primary)]" />
              </motion.span>
            </motion.div>
            <motion.div
              aria-hidden
              style={{ opacity: snoozeHint }}
              className="from-priority-medium/25 pointer-events-none absolute inset-x-0 bottom-0 z-20 flex h-1/2 items-end justify-center rounded-b-2xl bg-gradient-to-t to-transparent pb-3"
            >
              <AlarmClock className="text-priority-medium size-7" />
            </motion.div>
          </>
        )}

        {/* Quick-snooze confirmation flash */}
        <AnimatePresence>
          {snoozeFlash && (
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-priority-medium/10 pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-2xl"
            >
              <MoonStar className="text-priority-medium size-8 drop-shadow-[0_0_10px_var(--priority-medium)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {burst && <CompletionBurst />}

        {/* Faces — book-flip between front and edit form */}
        <AnimatePresence mode="wait" initial={false}>
          {flipped ? (
            <motion.div
              key="back"
              initial={
                reducedMotion ? { opacity: 0 } : { rotateY: 90, opacity: 0 }
              }
              animate={
                reducedMotion ? { opacity: 1 } : { rotateY: 0, opacity: 1 }
              }
              exit={
                reducedMotion ? { opacity: 0 } : { rotateY: 90, opacity: 0 }
              }
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <CardBack
                task={task}
                categories={categories}
                updateTask={updateTask}
                onClose={closeBack}
              />
            </motion.div>
          ) : (
            <motion.div
              key="front"
              initial={
                reducedMotion ? { opacity: 0 } : { rotateY: -90, opacity: 0 }
              }
              animate={
                reducedMotion ? { opacity: 1 } : { rotateY: 0, opacity: 1 }
              }
              exit={
                reducedMotion ? { opacity: 0 } : { rotateY: -90, opacity: 0 }
              }
              transition={{ duration: 0.18, ease: "easeOut" }}
              style={{ transformStyle: "preserve-3d" }}
              className={cn(
                "flex h-full flex-col",
                hero ? "min-h-44 gap-3 p-5 sm:p-6" : "gap-2.5 p-4",
                compact ? "min-h-24" : !hero && "min-h-36",
                task.completed && "opacity-60",
              )}
            >
              {/* Header chips — floating above the glass */}
              <div
                style={tz(36)}
                className="flex flex-wrap items-center gap-1.5"
              >
                {/* Priority ember */}
                <span
                  aria-hidden
                  className={cn(
                    "size-2.5 shrink-0 rounded-full",
                    task.completed
                      ? "bg-white/20"
                      : cn(
                          task.priority === "high" &&
                            "bg-priority-high shadow-[0_0_10px_var(--priority-high)]",
                          task.priority === "medium" &&
                            "bg-priority-medium shadow-[0_0_8px_var(--priority-medium)]",
                          task.priority === "low" && "bg-priority-low/80",
                        ),
                  )}
                />
                <span className="sr-only">{task.priority} priority</span>

                {task.category && (
                  <span className="border-border-strong bg-surface/60 text-muted-foreground flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium">
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: task.category.color }}
                    />
                    {task.category.name}
                  </span>
                )}

                {task.list && (
                  <span className="border-border-strong bg-surface/60 text-muted-foreground flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium">
                    <Users aria-hidden className="size-3" />
                    {task.list.name}
                  </span>
                )}

                {snoozed && (
                  <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                    <MoonStar aria-hidden className="size-3" />
                    Snoozed
                  </span>
                )}

                <span className="grow" />

                {task.recurrenceRule && (
                  <Repeat
                    aria-label="Recurring task"
                    className="text-muted-foreground size-3.5"
                  />
                )}
                {task.reminderAt && (
                  <Bell
                    aria-label="Has reminder"
                    className="text-muted-foreground size-3.5"
                  />
                )}

                {task.dueDate && (
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      dueStatus === "overdue"
                        ? "bg-amber-500/15 text-amber-400"
                        : dueStatus === "due-soon"
                          ? "tk-urgent text-priority-medium bg-surface/60"
                          : "text-muted-foreground",
                    )}
                  >
                    <CalendarDays aria-hidden className="size-3" />
                    {dueStatus === "overdue" && "Overdue · "}
                    {new Date(task.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>

              {/* Title + description */}
              <div style={tz(24)} className="min-w-0">
                <h2
                  className={cn(
                    "font-semibold tracking-tight",
                    hero
                      ? "text-lg sm:text-xl"
                      : compact
                        ? "text-sm"
                        : "text-base",
                    task.completed
                      ? "text-white/50 line-through"
                      : "text-white",
                  )}
                >
                  {task.title}
                </h2>
                {task.description && !compact && (
                  <p
                    className={cn(
                      "text-muted-foreground mt-1 text-sm leading-relaxed",
                      hero ? "line-clamp-3" : "line-clamp-2",
                    )}
                  >
                    {task.description}
                  </p>
                )}
              </div>

              <span className="grow" />

              {task.subtasks.length > 0 && (
                <SubtaskConstellation
                  subtasks={task.subtasks}
                  className="px-0.5"
                />
              )}

              {/* Actions — always visible, keyboard-reachable, 44px targets.
                  Pointer-down is stopped here so a wiggle over a button can't
                  start a card drag that ends in an accidental native click. */}
              <div
                style={tz(30)}
                onPointerDownCapture={(e) => e.stopPropagation()}
                className="-mb-1.5 flex items-center gap-0.5"
              >
                <button
                  type="button"
                  onClick={handleToggleComplete}
                  disabled={updateTask.isPending}
                  aria-pressed={task.completed}
                  aria-label="Complete task"
                  className={cn(actionBtn, "hover:bg-primary/10 -ml-2.5")}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border-2 transition-all",
                      task.completed
                        ? "border-primary bg-primary text-black"
                        : "hover:border-primary border-white/30",
                    )}
                  >
                    {task.completed && (
                      <Check className="size-4" strokeWidth={3} />
                    )}
                  </span>
                </button>

                <span className="grow" />

                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Snooze task"
                      className={cn(
                        actionBtn,
                        "hover:bg-amber-500/10 hover:text-amber-400",
                      )}
                    >
                      <AlarmClock className="size-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="end">
                    <SnoozePopoverContent taskId={task.id} />
                  </PopoverContent>
                </Popover>

                <button
                  type="button"
                  onClick={() => setFlipped(true)}
                  aria-label="Edit task"
                  className={cn(
                    actionBtn,
                    "hover:bg-primary/10 hover:text-primary",
                  )}
                >
                  <Pencil className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => deleteTask.mutate(task.id)}
                  disabled={deleteTask.isPending}
                  aria-label="Delete task"
                  className={cn(
                    actionBtn,
                    "-mr-2.5 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50",
                  )}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.article>
  );
});
