import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import type { NotificationData } from "~/utils/notifications";
import {
  configureNotificationHandler,
  requestPermissions,
} from "~/utils/notifications";

/**
 * Hook to set up notification handling at the app root level.
 * - Configures the foreground handler
 * - Requests permissions
 * - Handles notification taps (deep linking)
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
    // Configure foreground behavior
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

    // Handle user tapping a notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as unknown as
          | NotificationData
          | undefined;

        if (data?.type === "task-reminder" && "taskId" in data) {
          // Navigate to task list — could add a task detail route later
          router.push("/");
        } else if (data?.type === "league" && data.roundId) {
          router.push(`/music/round/${data.roundId}`);
        } else if (data?.type === "league" && data.leagueId) {
          router.push(`/music/league/${data.leagueId}`);
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router]);
}
