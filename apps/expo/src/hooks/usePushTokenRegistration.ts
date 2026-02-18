import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { getExpoPushToken } from "~/utils/notifications";
import { vanillaTrpc } from "~/utils/api";

/**
 * Registers the device's Expo push token with the server on mount.
 * Should be called once when the user is authenticated.
 */
export function usePushTokenRegistration() {
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;

    const register = async () => {
      try {
        const token = await getExpoPushToken();
        if (!token) return;

        await vanillaTrpc.notification.registerToken.mutate({
          token,
          platform: Platform.OS as "ios" | "android",
        });

        registered.current = true;
        console.log("[PushToken] Registered:", token.slice(0, 20) + "...");
      } catch (error) {
        console.error("[PushToken] Registration failed:", error);
      }
    };

    void register();
  }, []);
}
