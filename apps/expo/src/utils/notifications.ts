import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";

// ─── Types ───────────────────────────────────────────────────────────

export interface TaskNotificationData {
  taskId: string;
  type: "task-reminder";
}

export interface LeagueNotificationData {
  type: "league";
  leagueId?: string;
  roundId?: string;
}

export type NotificationData = TaskNotificationData | LeagueNotificationData;

// ─── Configuration ───────────────────────────────────────────────────

/** Configure how notifications are displayed when the app is foregrounded */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ─── Permissions ─────────────────────────────────────────────────────

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return status === "granted";
}

export async function getPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// ─── Push Token ──────────────────────────────────────────────────────

export async function getExpoPushToken(): Promise<string | null> {
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

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
  tasks: Array<{
    id: string;
    title: string;
    dueDate: Date | null;
    completed: boolean;
    deletedAt: Date | null;
  }>,
  offsetMinutes = 0,
): Promise<void> {
  // Cancel all existing task reminders
  await cancelAllTaskReminders();

  // Reschedule for all active tasks with due dates
  const activeTasks = tasks.filter(
    (t) => t.dueDate && !t.completed && !t.deletedAt,
  );

  await Promise.all(
    activeTasks.map((t) =>
      scheduleTaskReminder(t.id, t.title, t.dueDate!, offsetMinutes),
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
