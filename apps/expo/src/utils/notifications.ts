import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

// ─── Types ───────────────────────────────────────────────────────────

export interface TaskNotificationData {
  taskId: string;
  type: "task-reminder";
}

export type NotificationData = TaskNotificationData;

// ─── Configuration ───────────────────────────────────────────────────

/** Configure how notifications are displayed when the app is foregrounded */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
  });

  // Register iOS notification category with snooze/done action buttons
  void registerTaskReminderCategory();
}

// ─── Notification Categories ────────────────────────────────────────

export const TASK_REMINDER_ACTIONS = {
  SNOOZE_10MIN: "SNOOZE_10MIN",
  SNOOZE_1HR: "SNOOZE_1HR",
  MARK_DONE: "MARK_DONE",
} as const;

/** Register the task-reminder category with actionable buttons on iOS */
async function registerTaskReminderCategory() {
  if (Platform.OS !== "ios") return;

  await Notifications.setNotificationCategoryAsync("task-reminder", [
    {
      identifier: TASK_REMINDER_ACTIONS.SNOOZE_10MIN,
      buttonTitle: "Snooze 10min",
      options: { opensAppToForeground: false },
    },
    {
      identifier: TASK_REMINDER_ACTIONS.SNOOZE_1HR,
      buttonTitle: "Snooze 1hr",
      options: { opensAppToForeground: false },
    },
    {
      identifier: TASK_REMINDER_ACTIONS.MARK_DONE,
      buttonTitle: "Done ✓",
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);
}

// ─── Permissions ─────────────────────────────────────────────────────

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === Notifications.PermissionStatus.GRANTED) return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return status === Notifications.PermissionStatus.GRANTED;
}

export async function getPermissionStatus(): Promise<string> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch (e) {
    console.error("[Notifications] Failed to get permission status:", e);
    return "undetermined";
  }
}

// ─── Push Token ──────────────────────────────────────────────────────

export async function getExpoPushToken(): Promise<string | null> {
  try {
    const expoEasConfig = Constants.expoConfig?.extra?.eas as
      | { projectId?: string }
      | undefined;
    const easConfig = Constants.easConfig as { projectId?: string } | undefined;
    const projectId = expoEasConfig?.projectId ?? easConfig?.projectId;

    if (!projectId) {
      console.warn("[Notifications] No EAS project ID found");
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    console.error("[Notifications] Failed to get push token:", error);
    return null;
  }
}

// ─── Local Task Reminders ────────────────────────────────────────────

/**
 * Schedule a local notification for a task's due date.
 * @param taskId - The task UUID (used as the notification identifier for easy cancellation)
 * @param title - The task title
 * @param dueDate - When the task is due
 * @param offsetMinutes - How many minutes before the due date to fire (default: 0 = at due time)
 */
export async function scheduleTaskReminder(
  taskId: string,
  title: string,
  dueDate: Date,
  offsetMinutes = 0,
): Promise<string | null> {
  const triggerDate = new Date(dueDate.getTime() - offsetMinutes * 60 * 1000);

  // Don't schedule if the trigger time is in the past
  if (triggerDate <= new Date()) {
    return null;
  }

  // Cancel any existing reminder for this task first
  await cancelTaskReminder(taskId);

  const id = await Notifications.scheduleNotificationAsync({
    identifier: `task-${taskId}`,
    content: {
      title: "Task Reminder",
      body: title,
      data: { taskId, type: "task-reminder" } satisfies TaskNotificationData,
      sound: "default",
      ...(Platform.OS === "ios" && {
        categoryIdentifier: "task-reminder",
      }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return id;
}

/**
 * Cancel a previously scheduled task reminder.
 */
export async function cancelTaskReminder(taskId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`task-${taskId}`);
}

/**
 * Cancel all task reminders.
 */
export async function cancelAllTaskReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const taskNotifications = scheduled.filter((n) =>
    n.identifier.startsWith("task-"),
  );

  await Promise.all(
    taskNotifications.map((n) =>
      Notifications.cancelScheduledNotificationAsync(n.identifier),
    ),
  );
}

/**
 * Reschedule reminders for all tasks that have due dates.
 * Call on app launch as a safety net.
 */
export async function rescheduleAllReminders(
  tasks: {
    id: string;
    title: string;
    dueDate: Date | null;
    completed: boolean;
    deletedAt: Date | null;
  }[],
  offsetMinutes = 0,
): Promise<void> {
  // Cancel all existing task reminders
  await cancelAllTaskReminders();

  // Reschedule for all active tasks with due dates
  const activeTasks = tasks.filter(
    (t) => t.dueDate && !t.completed && !t.deletedAt,
  );

  await Promise.all(
    activeTasks
      .filter((t): t is typeof t & { dueDate: Date } => t.dueDate !== null)
      .map((t) =>
        scheduleTaskReminder(t.id, t.title, t.dueDate, offsetMinutes),
      ),
  );
}

// ─── Badge ───────────────────────────────────────────────────────────

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}
