import type { RouterOutputs } from "@acme/api";

import { getReminderStatus } from "../reminder-utils";

export type CardTask = RouterOutputs["task"]["all"][number];

/** Urgency read from the task's dates (completed tasks are never urgent). */
export type DueStatus = "overdue" | "due-soon" | "none";

/** Visual weight of a card in the mosaic. */
export type CardWeight = "hero" | "standard" | "compact";

const DAY_MS = 24 * 60 * 60 * 1000;

export function getDueStatus(task: CardTask): DueStatus {
  if (task.completed) return "none";

  const reminderOverdue =
    !!task.reminderAt &&
    getReminderStatus(task.reminderAt, task.reminderSentAt ?? null) ===
      "overdue";

  if (task.dueDate) {
    const due = new Date(task.dueDate).getTime();
    const now = Date.now();
    if (due < now || reminderOverdue) return "overdue";
    if (due - now < DAY_MS) return "due-soon";
    return "none";
  }

  return reminderOverdue ? "overdue" : "none";
}

export function isSnoozed(task: CardTask): boolean {
  return !!task.snoozedUntil && new Date(task.snoozedUntil) > new Date();
}

/**
 * Weighted mosaic: what demands attention renders larger. Overdue and
 * high-priority tasks become heroes, low-priority ones tuck in small, and
 * completed cards shrink into the "done pile".
 */
export function getCardWeight(task: CardTask, status: DueStatus): CardWeight {
  if (task.completed) return "compact";
  if (status === "overdue" || task.priority === "high") return "hero";
  if (task.priority === "low") return "compact";
  return "standard";
}

/** Higher = more urgent = earlier in the mosaic. */
export function getUrgencyScore(task: CardTask, status: DueStatus): number {
  if (task.completed) return -100;
  let score = 0;
  if (status === "overdue") score += 100;
  else if (status === "due-soon") score += 50;
  score += task.priority === "high" ? 30 : task.priority === "medium" ? 20 : 10;
  if (isSnoozed(task)) score -= 40; // snoozed tasks recede
  return score;
}

/** Deterministic per-task value in [-1, 1] for entrance rotation jitter. */
export function seededJitter(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 1000) / 500 - 1;
}

export interface CardEntry {
  task: CardTask;
  dueStatus: DueStatus;
  weight: CardWeight;
  snoozed: boolean;
}

/** Decorate + sort tasks for the mosaic (urgent first, done pile last). */
export function buildCardEntries(tasks: CardTask[]): CardEntry[] {
  return tasks
    .map((task, index) => {
      const dueStatus = getDueStatus(task);
      return {
        task,
        dueStatus,
        weight: getCardWeight(task, dueStatus),
        snoozed: isSnoozed(task),
        score: getUrgencyScore(task, dueStatus),
        index,
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ task, dueStatus, weight, snoozed }) => ({
      task,
      dueStatus,
      weight,
      snoozed,
    }));
}
