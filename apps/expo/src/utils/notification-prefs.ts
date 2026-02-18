import * as SecureStore from "expo-secure-store";

const TASK_REMINDERS_ENABLED_KEY = "notification_task_reminders_enabled";
const TASK_REMINDER_OFFSET_KEY = "notification_task_reminder_offset";

export interface TaskNotificationPrefs {
  enabled: boolean;
  /** Minutes before due date to fire reminder (0 = at due time) */
  offsetMinutes: number;
}

export const REMINDER_OFFSET_OPTIONS = [
  { label: "At due time", value: 0 },
  { label: "5 minutes before", value: 5 },
  { label: "15 minutes before", value: 15 },
  { label: "30 minutes before", value: 30 },
  { label: "1 hour before", value: 60 },
  { label: "2 hours before", value: 120 },
  { label: "1 day before", value: 1440 },
] as const;

export async function getTaskNotificationPrefs(): Promise<TaskNotificationPrefs> {
  const enabled = await SecureStore.getItemAsync(TASK_REMINDERS_ENABLED_KEY);
  const offset = await SecureStore.getItemAsync(TASK_REMINDER_OFFSET_KEY);

  return {
    enabled: enabled !== "false", // default true
    offsetMinutes: offset ? parseInt(offset, 10) : 15, // default 15 min
  };
}

export async function setTaskRemindersEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(
    TASK_REMINDERS_ENABLED_KEY,
    enabled ? "true" : "false",
  );
}

export async function setTaskReminderOffset(minutes: number): Promise<void> {
  await SecureStore.setItemAsync(TASK_REMINDER_OFFSET_KEY, String(minutes));
}
