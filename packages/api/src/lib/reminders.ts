import type { db as dbClient } from "@acme/db/client";
import { and, eq, isNull, lte } from "@acme/db";
import { PushToken, Task, user, UserPreference } from "@acme/db/schema";

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
  pushTokens: (typeof PushToken.$inferSelect)[];
}

const DEFAULT_PREFERENCES = {
  emailReminders: false,
  pushReminders: true,
  reminderOffsetMinutes: 15,
};

/**
 * Query tasks with reminders that are due to be sent.
 */
export async function getUpcomingReminders(
  db: DB,
): Promise<UpcomingReminder[]> {
  const now = new Date();

  // Find tasks where reminder is due and hasn't been sent
  const tasks = await db.query.Task.findMany({
    where: and(
      lte(Task.reminderAt, now),
      isNull(Task.reminderSentAt),
      eq(Task.completed, false),
      isNull(Task.deletedAt),
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

    // Get push tokens
    const tokens = await db.query.PushToken.findMany({
      where: eq(PushToken.userId, task.userId),
    });

    results.push({
      task,
      user: { id: taskUser.id, email: taskUser.email, name: taskUser.name },
      preferences: prefs
        ? {
            emailReminders: prefs.emailReminders,
            pushReminders: prefs.pushReminders,
            reminderOffsetMinutes: prefs.reminderOffsetMinutes,
          }
        : DEFAULT_PREFERENCES,
      pushTokens: tokens,
    });
  }

  return results;
}

/**
 * Process all pending reminders: send push/email notifications and mark as sent.
 */
export async function processReminders(
  db: DB,
): Promise<{ processed: number; errors: number }> {
  const reminders = await getUpcomingReminders(db);

  let processed = 0;
  let errors = 0;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tokilist.com";

  for (const { task, user: taskUser, preferences } of reminders) {
    try {
      // Send push notification
      if (preferences.pushReminders) {
        await sendPushToUser(taskUser.id, {
          title: "⏰ Task Reminder",
          body: task.title,
          data: { type: "task-reminder", taskId: task.id },
        });
      }

      // Send email notification
      if (preferences.emailReminders && taskUser.email) {
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
      }

      // Mark reminder as sent
      await db
        .update(Task)
        .set({ reminderSentAt: new Date() })
        .where(eq(Task.id, task.id));

      processed++;
    } catch (error) {
      console.error(
        `[Reminders] Failed to process reminder for task ${task.id}:`,
        error,
      );
      errors++;
    }
  }

  return { processed, errors };
}
