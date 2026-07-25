import type { db as dbClient } from "@acme/db/client";
import { and, eq, isNull, lte, or } from "@acme/db";
import { Task, user, UserPreference } from "@acme/db/schema";

import { sendEmail } from "./email/client";
import { taskReminderEmail } from "./email/templates/task-reminder";
import { sendPushToUser } from "./push";

type DB = typeof dbClient;

interface UpcomingReminder {
  task: typeof Task.$inferSelect;
  user: { id: string; email: string; name: string };
  preferences: {
    emailReminders: boolean;
    pushReminders: boolean;
    reminderOffsetMinutes: number;
  };
}

const DEFAULT_PREFERENCES = {
  emailReminders: false,
  pushReminders: true,
  reminderOffsetMinutes: 15,
};

/**
 * Safety margin used to widen the SQL "is this reminder anywhere near due"
 * window (G006). reminderOffsetMinutes is a per-user preference and can't be
 * expressed as a single SQL predicate without a join + correlated
 * computation per row, so we over-fetch by the largest offset we could
 * plausibly need and then filter precisely per-user in JS via
 * `isReminderDue`. The product UI currently offers at most 1440 minutes (1
 * day before); 7 days gives comfortable headroom above that without
 * fetching the entire table.
 */
export const MAX_REMINDER_OFFSET_MINUTES = 7 * 24 * 60;

/**
 * Pure helper: is this reminder due yet, given the user's offset preference?
 * Due when now >= reminderAt - offsetMinutes (G006). Extracted for unit
 * testing.
 */
export function isReminderDue(
  reminderAt: Date | null,
  offsetMinutes: number,
  now: Date,
): boolean {
  if (!reminderAt) return false;
  const dueAt = reminderAt.getTime() - offsetMinutes * 60_000;
  return now.getTime() >= dueAt;
}

/**
 * Query tasks with reminders that are due to be sent.
 */
export async function getUpcomingReminders(
  db: DB,
): Promise<UpcomingReminder[]> {
  const now = new Date();
  const widestLookahead = new Date(
    now.getTime() + MAX_REMINDER_OFFSET_MINUTES * 60_000,
  );

  // Find tasks whose reminder could plausibly be due (widened window, see
  // MAX_REMINDER_OFFSET_MINUTES) and hasn't been sent. Also excludes tasks
  // that are currently snoozed into the future (F011/F109): snoozing no
  // longer touches reminderAt, so without this exclusion a snoozed task
  // whose original reminderAt has already passed would fire immediately.
  const tasks = await db.query.Task.findMany({
    where: and(
      lte(Task.reminderAt, widestLookahead),
      isNull(Task.reminderSentAt),
      eq(Task.completed, false),
      isNull(Task.deletedAt),
      or(isNull(Task.snoozedUntil), lte(Task.snoozedUntil, now)),
    ),
  });

  if (tasks.length === 0) return [];

  const results: UpcomingReminder[] = [];

  for (const task of tasks) {
    // Get the user
    const taskUser = await db.query.user.findFirst({
      where: eq(user.id, task.userId),
    });
    if (!taskUser) continue;

    // Get user preferences
    const prefs = await db.query.UserPreference.findFirst({
      where: eq(UserPreference.userId, task.userId),
    });

    const preferences = prefs
      ? {
          emailReminders: prefs.emailReminders,
          pushReminders: prefs.pushReminders,
          reminderOffsetMinutes: prefs.reminderOffsetMinutes,
        }
      : DEFAULT_PREFERENCES;

    // Apply the per-user offset precisely now that we have it (G006) — the
    // SQL query above only narrowed candidates down to the widened window.
    if (
      !isReminderDue(task.reminderAt, preferences.reminderOffsetMinutes, now)
    ) {
      continue;
    }

    results.push({
      task,
      user: { id: taskUser.id, email: taskUser.email, name: taskUser.name },
      preferences,
    });
  }

  return results;
}

/**
 * Process all pending reminders: send push/email notifications and mark as sent.
 *
 * F018: push delivery and the reminderSentAt write used to share a single
 * try/catch with email, so an email failure (or the write itself failing)
 * would cause the push to be re-sent on the next cron tick. This now claims
 * the reminder via an atomic `UPDATE ... WHERE reminder_sent_at IS NULL`
 * *before* sending the push, and only rolls the claim back if the push
 * totally failed to reach any device. Trade-off: a crash between a
 * successful push send and this function returning would leave the
 * reminder claimed-but-arguably-not-fully-processed, but it will correctly
 * never resend — which is the safer failure mode for a notification (worse
 * to double-send than to occasionally under-report). Email is deliberately
 * NOT part of the claim: it's best-effort with its own try/catch and must
 * never cause the push to be resent.
 */
export async function processReminders(
  db: DB,
): Promise<{ processed: number; errors: number }> {
  const reminders = await getUpcomingReminders(db);

  let processed = 0;
  let errors = 0;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://toki.calayo.net";

  for (const { task, user: taskUser, preferences } of reminders) {
    // Claim this reminder atomically. If reminderSentAt is no longer NULL
    // (a concurrent/overlapping cron run already claimed it), skip.
    const [claimed] = await db
      .update(Task)
      .set({ reminderSentAt: new Date() })
      .where(and(eq(Task.id, task.id), isNull(Task.reminderSentAt)))
      .returning({ id: Task.id });

    if (!claimed) continue;

    let pushOk = true;
    try {
      if (preferences.pushReminders) {
        const result = await sendPushToUser(taskUser.id, {
          title: "⏰ Task Reminder",
          body: task.title,
          data: { type: "task-reminder", taskId: task.id },
        });
        // Total failure: we attempted to notify at least one device and
        // none succeeded — un-claim so the next tick retries.
        if (result.attempted > 0 && result.sent === 0) {
          pushOk = false;
        }
      }
    } catch (error) {
      console.error(`[Reminders] Push failed for task ${task.id}:`, error);
      pushOk = false;
    }

    if (!pushOk) {
      await db
        .update(Task)
        .set({ reminderSentAt: null })
        .where(eq(Task.id, task.id));
      errors++;
      continue;
    }

    // Email is best-effort and independent of the push claim above — its
    // failure must not cause the push to be resent next cron tick.
    if (preferences.emailReminders && taskUser.email) {
      try {
        const { subject, html } = taskReminderEmail({
          taskTitle: task.title,
          taskDescription: task.description,
          dueDate: task.dueDate
            ? task.dueDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : null,
          appUrl,
        });

        await sendEmail({ to: taskUser.email, subject, html });
      } catch (error) {
        console.error(`[Reminders] Email failed for task ${task.id}:`, error);
      }
    }

    processed++;
  }

  return { processed, errors };
}
