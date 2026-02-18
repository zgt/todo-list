import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";

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
  const responseListener = useRef<Notifications.EventSubscription>();
  const notificationListener = useRef<Notifications.EventSubscription>();

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
        const data = response.notification.request.content
          .data as NotificationData;

        if (data?.type === "task-reminder" && "taskId" in data) {
          // Navigate to task list — could add a task detail route later
          router.push("/");
        } else if (data?.type === "league" && "roundId" in data && data.roundId) {
          router.push(`/music/round/${data.roundId}`);
        } else if (data?.type === "league" && "leagueId" in data && data.leagueId) {
          router.push(`/music/league/${data.leagueId}`);
        }
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current,
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(
          responseListener.current,
        );
      }
    };
  }, [router]);
}
