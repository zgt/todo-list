import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import type {
  NotificationData,
  TaskNotificationData,
} from "~/utils/notifications";
import { vanillaTrpc } from "~/utils/api";
import {
  configureNotificationHandler,
  requestPermissions,
  scheduleTaskReminder,
  TASK_REMINDER_ACTIONS,
} from "~/utils/notifications";

/**
 * Handle a notification action button tap (snooze or mark done).
 * Runs outside React render cycle — uses vanillaTrpc for mutations.
 */
async function handleTaskAction(
  actionIdentifier: string,
  data: TaskNotificationData,
  notificationTitle: string,
) {
  const { taskId } = data;

  switch (actionIdentifier) {
    case TASK_REMINDER_ACTIONS.SNOOZE_10MIN: {
      const snoozeUntil = new Date(Date.now() + 10 * 60 * 1000);
      await scheduleTaskReminder(taskId, notificationTitle, snoozeUntil);
      try {
        await vanillaTrpc.task.update.mutate({
          id: taskId,
          reminderAt: snoozeUntil,
        });
      } catch (err) {
        console.error("[Notifications] Failed to update reminder:", err);
      }
      break;
    }
    case TASK_REMINDER_ACTIONS.SNOOZE_1HR: {
      const snoozeUntil = new Date(Date.now() + 60 * 60 * 1000);
      await scheduleTaskReminder(taskId, notificationTitle, snoozeUntil);
      try {
        await vanillaTrpc.task.update.mutate({
          id: taskId,
          reminderAt: snoozeUntil,
        });
      } catch (err) {
        console.error("[Notifications] Failed to update reminder:", err);
      }
      break;
    }
    case TASK_REMINDER_ACTIONS.MARK_DONE: {
      try {
        await vanillaTrpc.task.update.mutate({ id: taskId, completed: true });
      } catch (err) {
        console.error("[Notifications] Failed to mark task done:", err);
      }
      break;
    }
  }
}

/**
 * Hook to set up notification handling at the app root level.
 * - Configures the foreground handler
 * - Requests permissions
 * - Handles notification taps (deep linking)
 * - Handles action button responses (snooze/done) in background
 */
export function useNotifications() {
  const router = useRouter();
  const responseListener = useRef<Notifications.EventSubscription | undefined>(
    undefined,
  );
  const notificationListener = useRef<
    Notifications.EventSubscription | undefined
  >(undefined);

  useEffect(() => {
    // Configure foreground behavior + register notification categories
    configureNotificationHandler();

    // Request permissions on mount
    void requestPermissions();

    // Handle notification received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log(
          "[Notifications] Received in foreground:",
          notification.request.content.title,
        );
      });

    // Handle user tapping a notification or an action button
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as unknown as
          | NotificationData
          | undefined;
        const actionIdentifier = response.actionIdentifier;

        // Handle action buttons (snooze/done) — these don't open the app
        if (
          data?.type === "task-reminder" &&
          "taskId" in data &&
          actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
        ) {
          const title =
            response.notification.request.content.body ?? "Task Reminder";
          void handleTaskAction(actionIdentifier, data, title);
          return;
        }

        // Default tap — navigate into the app
        if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          if (data?.type === "task-reminder" && "taskId" in data) {
            router.push({
              pathname: "/",
              params: { openTask: data.taskId },
            });
          }
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router]);
}
