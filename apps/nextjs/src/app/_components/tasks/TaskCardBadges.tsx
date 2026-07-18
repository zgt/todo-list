"use client";

import type { ReactNode } from "react";
import { Bell, Calendar, Repeat } from "lucide-react";

import type { RouterOutputs } from "@acme/api";
import { cn } from "@acme/ui";

import type { RecurrenceRuleType } from "./recurrence-utils";
import { PriorityBadge } from "../priority";
import { formatRecurrenceLabel } from "./recurrence-utils";
import {
  formatReminder,
  getReminderBadgeClasses,
  getReminderStatus,
} from "./reminder-utils";

type Task = RouterOutputs["task"]["all"][number];
type Category = RouterOutputs["category"]["all"][number];

// Parameterized wrapper for the ~6 near-identical hover-slide badges shown in
// the collapsed task-card row. Reveals on hover, slides off-screen while the
// card is expanding.
export function HoverSlideBadge({
  isAnimatingExpand,
  children,
}: {
  isAnimatingExpand: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "z-10 hidden shrink-0 transition-transform duration-300 ease-in-out sm:block",
        isAnimatingExpand
          ? "translate-x-[600px]"
          : "translate-x-0 sm:group-hover:-translate-x-48",
      )}
    >
      {children}
    </div>
  );
}

// Always-visible compact metadata for narrow (<sm) viewports, where the
// hover-slide badges are hidden. Shows a priority dot (high/low only — medium is
// the default and stays implicit) and a compact due-date, amber-tinted when
// overdue to match the card's overdue treatment.
export function CompactMobileMeta({
  task,
  editedDueDate,
  isDueDateOverdue,
}: {
  task: Task;
  editedDueDate: Date | undefined;
  isDueDateOverdue: boolean;
}) {
  const priorityDot =
    task.priority === "high" || task.priority === "low" ? task.priority : null;

  if (!priorityDot && !editedDueDate) return null;

  return (
    <div className="flex items-center gap-2 sm:hidden">
      {priorityDot && (
        <>
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              priorityDot === "high" ? "bg-priority-high" : "bg-priority-low",
            )}
            aria-hidden="true"
          />
          <span className="sr-only">{priorityDot} priority</span>
        </>
      )}
      {editedDueDate && (
        <span
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            isDueDateOverdue ? "text-amber-400" : "text-muted-foreground",
          )}
        >
          <Calendar className="h-3 w-3" aria-hidden="true" />
          {new Date(editedDueDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
          {isDueDateOverdue && <span className="sr-only">, overdue</span>}
        </span>
      )}
    </div>
  );
}

// Collapsed-row badges (desktop only), revealed on hover.
export function CollapsedHoverBadges({
  task,
  editedDueDate,
  editedCategory,
  isAnimatingExpand,
  isDueDateOverdue,
}: {
  task: Task;
  editedDueDate: Date | undefined;
  editedCategory: Category | undefined;
  isAnimatingExpand: boolean;
  isDueDateOverdue: boolean;
}) {
  return (
    <>
      {/* Priority badge - collapsed row - hidden on mobile, show on hover on desktop */}
      <HoverSlideBadge isAnimatingExpand={isAnimatingExpand}>
        <PriorityBadge priority={task.priority} variant="compact" />
      </HoverSlideBadge>

      {/* Due Date - collapsed row - hidden on mobile */}
      {editedDueDate ? (
        <HoverSlideBadge isAnimatingExpand={isAnimatingExpand}>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium sm:gap-2 sm:px-4 sm:py-1.5",
              isDueDateOverdue
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : "border-border-strong bg-surface-2/80 text-foreground",
            )}
          >
            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden lg:inline">
              {new Date(editedDueDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="lg:hidden">
              {new Date(editedDueDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
            {isDueDateOverdue && (
              <span className="hidden font-semibold sm:inline">Overdue</span>
            )}
          </div>
        </HoverSlideBadge>
      ) : null}

      {/* Category - collapsed row - hidden on mobile */}
      {editedCategory ? (
        <HoverSlideBadge isAnimatingExpand={isAnimatingExpand}>
          <div
            className="max-w-[100px] truncate rounded-full border px-2 py-1 text-xs font-medium sm:max-w-none sm:px-4 sm:py-1.5"
            style={{
              backgroundColor: `${editedCategory.color}60`,
              borderColor: `${editedCategory.color}80`,
              color: editedCategory.color,
            }}
          >
            {editedCategory.name}
          </div>
        </HoverSlideBadge>
      ) : null}

      {/* Reminder - collapsed row - hidden on mobile (hide overdue badge for completed tasks) */}
      {task.reminderAt &&
      !(
        task.completed &&
        getReminderStatus(task.reminderAt, task.reminderSentAt ?? null) ===
          "overdue"
      ) ? (
        <HoverSlideBadge isAnimatingExpand={isAnimatingExpand}>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium sm:gap-2 sm:px-4 sm:py-1.5",
              getReminderBadgeClasses(task.reminderAt, task.reminderSentAt),
            )}
          >
            <Bell className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">
              {formatReminder(task.reminderAt, task.reminderSentAt)}
            </span>
          </div>
        </HoverSlideBadge>
      ) : null}

      {/* List badge - collapsed row - hidden on mobile */}
      {task.list ? (
        <HoverSlideBadge isAnimatingExpand={isAnimatingExpand}>
          <div className="text-muted-foreground flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium sm:gap-1.5 sm:px-3 sm:py-1.5">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2"
              style={{
                backgroundColor: task.list.color ?? "var(--muted-foreground)",
              }}
            />
            <span className="max-w-[80px] truncate sm:max-w-none">
              {task.list.name}
            </span>
          </div>
        </HoverSlideBadge>
      ) : null}

      {/* Recurrence - collapsed row - hidden on mobile */}
      {task.recurrenceRule ? (
        <HoverSlideBadge isAnimatingExpand={isAnimatingExpand}>
          <div className="border-primary/30 bg-primary/10 text-primary flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium sm:gap-2 sm:px-4 sm:py-1.5">
            <Repeat className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">
              {formatRecurrenceLabel(
                task.recurrenceRule as RecurrenceRuleType,
                task.recurrenceInterval ?? 1,
              )}
            </span>
          </div>
        </HoverSlideBadge>
      ) : null}
    </>
  );
}

// Read-only badges shown when a card is expanded but not being edited.
export function ExpandedReadonlyBadges({
  task,
  editedCategory,
  isDueDateOverdue,
}: {
  task: Task;
  editedCategory: Category | undefined;
  isDueDateOverdue: boolean;
}) {
  return (
    <div className="border-border-strong/40 mt-4 border-t pt-3">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <PriorityBadge priority={task.priority} variant="compact" />
        {task.dueDate && (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
              isDueDateOverdue
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : "border-border-strong bg-surface-2/80 text-muted-foreground",
            )}
          >
            <Calendar className="h-3 w-3" />
            {new Date(task.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {isDueDateOverdue && (
              <span className="font-semibold text-amber-400">Overdue</span>
            )}
          </div>
        )}
        {editedCategory && (
          <div
            className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
            style={{
              backgroundColor: `${editedCategory.color}20`,
              borderColor: `${editedCategory.color}40`,
              color: editedCategory.color,
            }}
          >
            {editedCategory.name}
          </div>
        )}
        {task.reminderAt &&
          !(
            task.completed &&
            getReminderStatus(task.reminderAt, task.reminderSentAt ?? null) ===
              "overdue"
          ) && (
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                getReminderBadgeClasses(task.reminderAt, task.reminderSentAt),
              )}
            >
              <Bell className="h-3 w-3" />
              {formatReminder(task.reminderAt, task.reminderSentAt)}
            </div>
          )}
        {task.recurrenceRule && (
          <div className="border-primary/20 bg-primary/5 text-primary flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium">
            <Repeat className="h-3 w-3" />
            {formatRecurrenceLabel(
              task.recurrenceRule as RecurrenceRuleType,
              task.recurrenceInterval ?? 1,
            )}
          </div>
        )}
        {task.list && (
          <div className="text-muted-foreground flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor: task.list.color ?? "var(--muted-foreground)",
              }}
            />
            {task.list.name}
          </div>
        )}
      </div>
    </div>
  );
}
