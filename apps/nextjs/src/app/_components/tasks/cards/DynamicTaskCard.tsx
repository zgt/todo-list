"use client";

import type { PanInfo } from "framer-motion";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
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

import type { RecurrenceRuleType } from "../recurrence-utils";
import type { CardTask, CardWeight, DueStatus } from "./card-utils";
import { useSnoozeMutation } from "../hooks/useSnoozeMutation";
import { useTaskMutations } from "../hooks/useTaskMutations";
import { formatRecurrenceLabel } from "../recurrence-utils";
import {
  formatReminder,
  getReminderBadgeClasses,
  getReminderStatus,
} from "../reminder-utils";
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

/** Viewing distance for the card's 3D space. Paired with the `tz()` counter-scale. */
const PERSPECTIVE = 900;

/**
 * Flip duration. Long enough to read as a physical card turning over rather
 * than a crossfade — the old 180ms swapped the two faces so fast it looked like
 * the fields were spinning inside a stationary frame.
 */
export const FLIP_MS = 920;
/**
 * Symmetric ease. A front-loaded curve (the old [0.22, 1, 0.36, 1]) spent ~70%
 * of the rotation in the first eighth of the duration, so lengthening the flip
 * did nothing to how long it actually looked — it just added a long tail
 * creeping through the last couple of degrees.
 */
export const FLIP_EASE = [0.65, 0, 0.35, 1] as const;

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

/**
 * Per-weight face metrics.
 *
 * `pad` is kept separate from the rest of the face classes because the BACK
 * face has to use the same padding as the front one at the same weight —
 * otherwise flipping a card shifts its content sideways under the flip.
 *
 * `actionPull` is DERIVED from the face padding, not hand-picked: every action
 * button is a 44px hit box around a much smaller glyph, so the row is pulled
 * outward by `padding − 12px`. That leaves the hit box a constant 12px clear of
 * the tile border at every weight while the glyph still lands on the content
 * column. The previous single hardcoded pull (-ml-2.5 / -mr-2.5 / -mb-1.5) was
 * tuned for 16px padding and left the row 6px from the border on standard and
 * compact tiles, and out of step with the header chips on hero.
 */
const FACE_METRICS = {
  hero: {
    pad: "p-6 sm:p-7",
    face: "min-h-44 gap-4",
    actionPull: "-mx-3 -mb-3 sm:-mx-4 sm:-mb-4",
  },
  standard: {
    pad: "p-5",
    face: "min-h-36 gap-3",
    actionPull: "-mx-2 -mb-2",
  },
  compact: {
    pad: "p-4",
    face: "min-h-24 gap-2.5",
    actionPull: "-mx-1 -mb-1",
  },
} satisfies Record<
  CardWeight,
  { pad: string; face: string; actionPull: string }
>;

/** One chip shape for the whole header row — no bare, background-less outliers. */
const CHIP =
  "flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] leading-none font-medium";
/** Chips whose content is short and fixed never give up width to a long name. */
const CHIP_FIXED = "shrink-0";
const CHIP_NEUTRAL = "border-border-strong bg-surface/70 text-muted-foreground";

/**
 * The shared reminder badge palette is tuned for the list view, whose card is
 * `bg-surface-2` — so its "reminded" (neutral) state fills with
 * `bg-surface-2/80`, the exact value of this card's own glass layer. On a tile
 * that chip would composite flat and break the one-fill chip rhythm, so the
 * neutral state resolves to CHIP_NEUTRAL's darker `surface` here instead.
 */
function chipClassesForReminder(
  reminderAt: Date,
  reminderSentAt: Date | null,
): string {
  return getReminderStatus(reminderAt, reminderSentAt) === "reminded"
    ? CHIP_NEUTRAL
    : getReminderBadgeClasses(reminderAt, reminderSentAt);
}

/**
 * Hero's right rail: label above value, definition-list style. Full-strength
 * `muted-foreground` (no alpha): at 10px these labels are the only thing
 * disambiguating the three values stacked beneath them, and /70 put them at
 * ~3.9:1 on the glass — under the 4.5:1 floor, let alone the documented 7:1.
 * Tracking comes off the theme scale (`wider`), matching the identical
 * micro-label in the list view's expanded editor.
 */
const RAIL_LABEL =
  "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase";

export const DynamicTaskCard = memo(function DynamicTaskCard({
  task,
  categories,
  weight,
  dueStatus,
  snoozed,
  onFlipActive,
}: {
  task: CardTask;
  categories: RouterOutputs["category"]["all"] | undefined;
  weight: CardWeight;
  dueStatus: DueStatus;
  snoozed: boolean;
  /**
   * Reports whether this card is mid-flip, so the mosaic can grow the tile on
   * the flip's own timing instead of the reorder spring. Without it the tile
   * snapped to the taller height in ~150ms while the card kept rotating for
   * another 800.
   */
  onFlipActive?: (taskId: string, active: boolean) => void;
}) {
  const reducedMotion = useReducedMotion();
  const finePointer = useFinePointer();

  const { updateTask, deleteTask } = useTaskMutations(task.id);
  const snoozeTask = useSnoozeMutation();

  const [flipped, setFlipped] = useState(false);
  // The height the tile had BEFORE the faces swapped. It has to be sampled at
  // the moment the flip is requested: by the time a layout effect runs, React
  // has already put the other face in flow and the tile has resized, so
  // measuring there reads the destination as the origin and animates nothing.
  const preFlipHeightRef = useRef<number | null>(null);
  const requestFlip = (next: boolean | ((f: boolean) => boolean)) => {
    const target = typeof next === "function" ? next(flipped) : next;
    preFlipHeightRef.current =
      articleRef.current?.getBoundingClientRect().height ?? null;
    // Mount the back face in the SAME commit as the flip. Deferring it to an
    // effect left one frame where `flipped` had already pushed the front face
    // out of flow but the back did not exist yet — no face in flow, so the tile
    // collapsed to its min-height and visibly shrank before expanding.
    if (target) setBackMounted(true);
    setFlipped(target);
  };
  // Both faces have to exist for the whole turn, otherwise the card shows a
  // blank side on the way back. CardBack is still unmounted once the flip
  // settles so its form state resets and its autofocus only fires on a real
  // flip — mounting it permanently would have every card grabbing focus.
  const [backMounted, setBackMounted] = useState(false);
  const [burst, setBurst] = useState(false);
  const [snoozeFlash, setSnoozeFlash] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Stays true through the post-release spring/fly-out so the card keeps
  // floating above its neighbors until it has settled.
  const [elevated, setElevated] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
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
  // Hero tilts less than the rest, and now less again: overhang from a 3D
  // rotation scales with the card's WIDTH, and hero spans two columns. At 6deg
  // a 1162px hero projected 37px past its own box — past the scroll container's
  // clip edge, slicing the leading edge and its glow. At 4deg it stays inside.
  // A 577px standard card only overhangs 11px at the full 9deg, so it keeps it.
  const tilt = useCardTilt(weight === "hero" ? 4 : 9);
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
    requestFlip(false);
    // Return focus to the card so keyboard flow isn't dropped.
    window.setTimeout(() => articleRef.current?.focus(), 0);
  };

  const handleTap = (e: MouseEvent | TouchEvent | PointerEvent) => {
    if (draggedRef.current) return;
    if (flipped) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, [role='dialog']")) return;
    requestFlip(true);
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
      requestFlip((f) => !f);
    }
  };

  useEffect(() => {
    if (flipped) {
      setBackMounted(true);
      return;
    }
    const t = window.setTimeout(() => setBackMounted(false), FLIP_MS);
    return () => window.clearTimeout(t);
  }, [flipped]);

  // `backMounted` already spans the whole turn in both directions — true the
  // moment the flip starts, false only once the return flip has finished — so
  // it is exactly the window the tile should be resizing over.
  useEffect(() => {
    onFlipActive?.(task.id, backMounted);
  }, [backMounted, onFlipActive, task.id]);

  /**
   * Which face is in flow — and therefore what the tile's height is. Derived
   * from both flags so exactly one face is ever in flow: keying it off
   * `flipped` alone allowed a frame with neither, which collapsed the tile.
   */
  const showBack = flipped && backMounted;

  /**
   * Drive the tile's height for the length of the flip.
   *
   * The two faces differ a lot in height (≈200px front vs ≈430px back), and
   * whichever one is in flow sets the card's size — so without this the tile
   * SNAPPED to the new height on the first frame while the card kept rotating
   * for another 900ms. Framer's `layout` can't fix it from the grid item:
   * layout animations interpolate transforms, and no transform resizes a grid
   * ROW. The height has to be a real animated length on the card itself, which
   * the row then follows. Outside the flip the height is released so the tile
   * goes back to stretching with its row.
   */
  useLayoutEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    // Written straight to the node rather than through a motion style: framer
    // does not clear an inline value when the key stops being supplied, so the
    // tile stayed frozen at its flipped height forever.
    const release = () => {
      article.style.height = "";
    };
    if (!backMounted) {
      release();
      return;
    }
    const target = showBack ? backRef.current : frontRef.current;
    const from = preFlipHeightRef.current;
    if (!target || from === null) return;
    // Measure the destination with any leftover inline height removed — the
    // faces are h-full, so they would just report the height we are animating
    // away from and the card would appear not to resize at all.
    const carried = article.style.height;
    article.style.height = "";
    const to = target.offsetHeight;
    article.style.height = carried;
    if (Math.abs(to - from) < 1) {
      release();
      return;
    }
    // Pin the starting height in this same commit. `animate` does not emit its
    // first onUpdate until the next frame, which would leave one painted frame
    // with no inline height — the tile snapping to the incoming face's size
    // before the animation pulled it back.
    article.style.height = `${from}px`;
    const controls = animate(from, to, {
      duration: FLIP_MS / 1000,
      ease: FLIP_EASE,
      onUpdate: (v) => {
        article.style.height = `${v}px`;
      },
      onComplete: release,
    });
    return () => controls.stop();
    // `showBack` covers the two flip transitions; `backMounted` additionally
    // catches the unmount at the end of a return flip, which releases the
    // inline height as a safety net if the animation never completed.
  }, [showBack, backMounted]);

  const glow = glowFor(task, dueStatus);
  const hero = weight === "hero";
  const compact = weight === "compact";
  const metrics = FACE_METRICS[weight];
  // Hero spans two grid columns. When it has any schedule facts to show they
  // move out of the chip row into a right rail, so the extra width carries
  // content instead of sitting empty beside a short title.
  const hasRail =
    hero && (!!task.dueDate || !!task.reminderAt || !!task.recurrenceRule);

  // Parallax depths (only meaningful while tilting; harmless flat otherwise).
  //
  // The counter-scale is NOT optional. Under `perspective: 900` an element
  // pushed to translateZ(d) is projected 900/(900−d) larger — tz(36) inflates a
  // full-width row by ~4%. Because these rows are horizontally centred on the
  // perspective origin, that inflation spends itself entirely on the left and
  // right edges: the header chips rendered 6px from the tile border instead of
  // the 28px the padding specifies, and hero's action row projected 7px OUTSIDE
  // the card. Scaling by the reciprocal (900−d)/900 cancels the projection so
  // the row occupies exactly its laid-out width, while the depth — and so the
  // parallax on tilt — is untouched. It also stops the layout shifting when
  // tiltActive flips and tz() drops out entirely.
  const tz = (depth: number) =>
    tiltActive
      ? {
          transform: `translateZ(${depth}px) scale(${(PERSPECTIVE - depth) / PERSPECTIVE})`,
        }
      : undefined;

  const actionBtn =
    "flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:outline-none";

  // --- Front-face pieces (composed differently per weight below) ---

  const completeButton = (
    <button
      type="button"
      onClick={handleToggleComplete}
      disabled={updateTask.isPending}
      aria-pressed={task.completed}
      aria-label="Complete task"
      className={cn(actionBtn, "hover:bg-primary/10")}
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full border-2 transition-all",
          task.completed
            ? "border-primary bg-primary text-black"
            : "hover:border-primary border-white/30",
        )}
      >
        {task.completed && <Check className="size-4" strokeWidth={3} />}
      </span>
    </button>
  );

  const secondaryActions = (
    <>
      {/* Snoozing something already done is meaningless, and dropping it buys
          the compact row ~44px of title width on narrow viewports. */}
      {!task.completed && (
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
      )}

      <button
        type="button"
        onClick={() => requestFlip(true)}
        aria-label="Edit task"
        className={cn(actionBtn, "hover:bg-primary/10 hover:text-primary")}
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
          "hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50",
        )}
      >
        <Trash2 className="size-4" />
      </button>
    </>
  );

  /** Who/what the task belongs to. */
  const identityChips = (
    <>
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
        <span className={cn(CHIP, CHIP_NEUTRAL)}>
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: task.category.color }}
          />
          <span className="truncate">{task.category.name}</span>
        </span>
      )}

      {task.list && (
        <span className={cn(CHIP, CHIP_NEUTRAL)}>
          <Users aria-hidden className="size-3 shrink-0" />
          <span className="truncate">{task.list.name}</span>
        </span>
      )}

      {snoozed && (
        <span
          className={cn(
            CHIP,
            CHIP_FIXED,
            "border-amber-500/30 bg-amber-500/10 text-amber-400",
          )}
        >
          <MoonStar aria-hidden className="size-3" />
          Snoozed
        </span>
      )}
    </>
  );

  /** When it happens. Hero shows these in the rail instead. */
  const scheduleChips = (
    <>
      {task.recurrenceRule && (
        <span
          className={cn(
            CHIP,
            CHIP_FIXED,
            "border-primary/25 bg-primary/10 text-primary",
            compact && "px-1.5",
          )}
        >
          <Repeat aria-hidden className="size-3" />
          {compact ? (
            <span className="sr-only">Recurring task</span>
          ) : (
            formatRecurrenceLabel(
              task.recurrenceRule as RecurrenceRuleType,
              task.recurrenceInterval ?? 1,
            )
          )}
        </span>
      )}

      {task.reminderAt && (
        <span
          className={cn(
            CHIP,
            CHIP_FIXED,
            chipClassesForReminder(
              task.reminderAt,
              task.reminderSentAt ?? null,
            ),
            compact && "px-1.5",
          )}
        >
          <Bell aria-hidden className="size-3" />
          {compact ? (
            <span className="sr-only">Has reminder</span>
          ) : (
            formatReminder(task.reminderAt, task.reminderSentAt)
          )}
        </span>
      )}

      {task.dueDate && (
        <span
          className={cn(
            CHIP,
            CHIP_FIXED,
            "font-semibold",
            dueStatus === "overdue"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
              : dueStatus === "due-soon"
                ? "tk-urgent border-priority-medium/40 bg-priority-medium/10 text-priority-medium"
                : CHIP_NEUTRAL,
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
    </>
  );

  const rail = hasRail && (
    // `justify-center` (not `items-center` on the parent row): the rail has to
    // STRETCH to the body's height or its `border-l` divider renders as a short
    // floating hairline whose length changes with how many facts the card
    // happens to carry. Stretched, the facts centre themselves inside it.
    <dl className="border-border-strong/60 flex shrink-0 flex-col gap-3 border-t pt-4 @md:w-52 @md:justify-center @md:border-t-0 @md:border-l @md:pt-0 @md:pl-6">
      {task.dueDate && (
        <div className="flex flex-col gap-1">
          <dt className={cn(RAIL_LABEL, "flex items-center gap-1.5")}>
            <CalendarDays aria-hidden className="size-3" />
            Due
          </dt>
          <dd
            className={cn(
              "text-sm font-semibold",
              dueStatus === "overdue"
                ? "text-amber-400"
                : dueStatus === "due-soon"
                  ? "text-priority-medium"
                  : "text-foreground",
            )}
          >
            {dueStatus === "overdue" && "Overdue · "}
            {new Date(task.dueDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </dd>
        </div>
      )}

      {task.reminderAt && (
        <div className="flex flex-col gap-1">
          <dt className={cn(RAIL_LABEL, "flex items-center gap-1.5")}>
            <Bell aria-hidden className="size-3" />
            Reminder
          </dt>
          <dd className="text-foreground text-sm font-semibold">
            {formatReminder(task.reminderAt, task.reminderSentAt)}
          </dd>
        </div>
      )}

      {task.recurrenceRule && (
        <div className="flex flex-col gap-1">
          <dt className={cn(RAIL_LABEL, "flex items-center gap-1.5")}>
            <Repeat aria-hidden className="size-3" />
            Repeats
          </dt>
          <dd className="text-primary text-sm font-semibold">
            {formatRecurrenceLabel(
              task.recurrenceRule as RecurrenceRuleType,
              task.recurrenceInterval ?? 1,
            )}
          </dd>
        </div>
      )}
    </dl>
  );

  const titleBlock = (
    <div className="flex min-w-0 flex-col gap-1.5">
      <h2
        className={cn(
          "font-semibold tracking-tight",
          hero ? "text-xl sm:text-2xl" : compact ? "text-sm" : "text-base",
          compact && "line-clamp-2",
          task.completed ? "text-white/50 line-through" : "text-white",
        )}
      >
        {task.title}
      </h2>
      {task.description && !compact && (
        <p
          className={cn(
            "text-muted-foreground line-clamp-3 text-sm leading-relaxed",
            hero && "sm:text-base",
          )}
        >
          {task.description}
        </p>
      )}
    </div>
  );

  const subtaskProgress = task.subtasks.length > 0 && (
    <SubtaskConstellation
      subtasks={task.subtasks}
      dense={compact}
      className={compact ? "mt-0.5" : "mt-1"}
    />
  );

  const stopCardDrag = (e: React.PointerEvent) => e.stopPropagation();

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
        perspective: PERSPECTIVE,
        ...(glow ? ({ "--tk-glow": glow } as React.CSSProperties) : {}),
      }}
      className={cn(
        // h-full stays on unconditionally — the flip writes an inline height,
        // which outranks it, and clears it again when the turn finishes.
        "group relative h-full rounded-2xl outline-none",
        // z-lift on focus so the ring isn't painted over by flush neighbors
        "focus-visible:ring-border-focus focus-visible:z-20 focus-visible:ring-2",
        canDrag && "cursor-grab active:cursor-grabbing",
        !canDrag && !flipped && "cursor-pointer",
      )}
    >
      {/* Tilt wrapper. Carries ONLY the pointer tilt so the flip below can own
          rotateY outright — the two rotations compose through nested
          preserve-3d instead of fighting over one transform. Grouping
          properties (backdrop-filter, filter, overflow, clip-path) must NOT
          live on this element or the flipper: they force the used
          transform-style to flat and kill both the flip and the translateZ
          parallax — the blur + background live on absolute child layers. */}
      <motion.div
        style={{
          rotateX: tiltActive ? tilt.rotateX : 0,
          rotateY: tiltActive ? tilt.rotateY : 0,
          transformStyle: "preserve-3d",
        }}
        className="h-full"
      >
        {/* The flipper — the physical card. Border, glass, glow and both faces
            all live inside it, so the whole tile turns as one object. This used
            to be the static slab with only the FACES rotating inside it, which
            read as the fields spinning within a frame that never moved. */}
        <motion.div
          animate={{ rotateY: flipped && !reducedMotion ? 180 : 0 }}
          transition={{ duration: FLIP_MS / 1000, ease: FLIP_EASE }}
          style={{ transformStyle: "preserve-3d" }}
          className={cn(
            "relative h-full rounded-2xl border shadow-lg transition-[border-color,opacity] duration-300",
            "border-border-strong",
            task.completed
              ? "border-primary/40"
              : dueStatus === "overdue"
                ? "border-amber-500/30"
                : "hover:border-border-focus",
            // Fade the tile as a UNIT. Fading only the front face left the border
            // and glass at full strength, so a done card read half-erased instead
            // of resolved. Flipping to edit restores full strength.
            task.completed && !flipped && "opacity-65",
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

          {/* Faces, mounted back-to-back on the flipper.
            Exactly one is in flow at a time, so the card's height always
            follows the face you can actually see; the other is taken out of
            flow at inset-0. `backfaceVisibility: hidden` is what stops the
            front showing through mirrored once the turn passes 90deg — and it
            only works on a FLAT subtree, so the front face drops to
            transform-style: flat while flipped. That is safe because tz() is
            already inert then (tiltActive requires !flipped), so there are no
            translateZ children left to preserve. */}
          {backMounted && (
            <div
              ref={backRef}
              style={
                // Under reduced motion the flipper never turns, so a face that
                // relied on being rotated into view would simply never appear.
                // There the two faces just swap outright.
                reducedMotion
                  ? undefined
                  : {
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }
              }
              // relative + z-index, NOT a transform: a static in-flow face paints
              // in step 7 — underneath every absolutely-positioned decoration
              // layer above (step 8), including the blurred glass background.
              className={cn(
                "z-40",
                showBack ? "relative h-full" : "absolute inset-0",
                reducedMotion && !showBack && "hidden",
              )}
            >
              <CardBack
                task={task}
                categories={categories}
                updateTask={updateTask}
                onClose={closeBack}
                padding={metrics.pad}
              />
            </div>
          )}

          <div
            ref={frontRef}
            style={{
              backfaceVisibility: reducedMotion ? undefined : "hidden",
              transformStyle: flipped ? "flat" : "preserve-3d",
            }}
            className={cn(
              // Same stacking requirement as the back face: without the z-index
              // the front only cleared the decoration layers by accident, via the
              // translateZ stacking contexts that tz() adds. tz() is a no-op on
              // coarse pointers, under reduced motion and mid-drag — in all three
              // the front face washed out exactly like the back.
              "z-40 flex h-full flex-col",
              showBack ? "absolute inset-0" : "relative",
              // No backface to hide it under reduced motion — swap it out.
              reducedMotion && showBack && "hidden",
              metrics.face,
              metrics.pad,
            )}
          >
            {/* Every weight composes as the same three bands: chips pinned to
                  the top, a body that absorbs the row's slack, actions pinned to
                  the bottom. Compact briefly ran its four 44px hit boxes INLINE
                  with the content instead — 196px of unshrinkable chrome, which
                  on a one-column-wide tile left the content column ~60px (and
                  went negative on the narrowest ones, painting the buttons over
                  the neighbouring tile: nothing here can carry `overflow-hidden`
                  without flattening the preserve-3d parallax). Compact also
                  centred its single row, so any taller neighbour in the same
                  stretched grid row turned into dead glass above and below it. */}

            {/* Header chips — floating above the glass. Every chip carries
                  the same border + fill so the row reads as one rhythm; the
                  due badge no longer pops into existence only when urgent. */}
            <div
              style={tz(36)}
              className="flex shrink-0 flex-wrap items-center gap-1.5"
            >
              {identityChips}
              {!hasRail && (
                <>
                  <span className="grow" />
                  {scheduleChips}
                </>
              )}
            </div>

            {/* Body — this is what absorbs the slack. The old `grow`
                  spacer dumped every spare pixel into one dead gap above the
                  action row; here the body takes the whole remainder and
                  centres its content, so a tile composes at any row height
                  the mosaic hands it. */}
            <div
              style={tz(24)}
              className={cn(
                "flex min-w-0 flex-1 flex-col gap-4",
                // Container-, not viewport-keyed, and the same `@md` the
                // mosaic switches to two columns at: below it a hero is the
                // only tile in its row and the rail belongs under the title,
                // above it a hero is always ≥440px and can hold a side rail.
                hasRail && "@md:flex-row @md:gap-8",
              )}
            >
              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-col justify-center",
                  compact ? "gap-2" : "gap-3",
                )}
              >
                {titleBlock}
                {subtaskProgress}
              </div>
              {rail}
            </div>

            {/* Actions — always visible, keyboard-reachable, 44px targets.
                  Pointer-down is stopped here so a wiggle over a button can't
                  start a card drag that ends in an accidental native click. */}
            <div
              style={tz(30)}
              onPointerDownCapture={stopCardDrag}
              className={cn(
                "flex shrink-0 items-center gap-0.5",
                metrics.actionPull,
              )}
            >
              {completeButton}
              <span className="grow" />
              {secondaryActions}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.article>
  );
});
