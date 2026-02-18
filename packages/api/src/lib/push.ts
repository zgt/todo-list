import Expo from "expo-server-sdk";
import { eq, inArray } from "@acme/db";
import { db } from "@acme/db/client";
import { PushToken } from "@acme/db/schema";

const expo = new Expo();

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** Optional: override the default sound */
  sound?: "default" | null;
}

/**
 * Send push notifications to a list of user IDs.
 * Fetches their registered push tokens and sends via Expo's push service.
 * Silently skips users with no registered tokens.
 */
export async function sendPushToUsers(
  userIds: string[],
  message: PushMessage,
): Promise<void> {
  if (userIds.length === 0) return;

  try {
    // Fetch all push tokens for the target users
    const tokens = await db.query.PushToken.findMany({
      where: inArray(PushToken.userId, userIds),
    });

    if (tokens.length === 0) return;

    // Build messages
    const messages = tokens
      .filter((t) => Expo.isExpoPushToken(t.token))
      .map((t) => ({
        to: t.token,
        title: message.title,
        body: message.body,
        data: message.data,
        sound: (message.sound ?? "default") as "default",
      }));

    if (messages.length === 0) return;

    // Chunk and send
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);

        // Log any errors (don't throw — this is fire-and-forget)
        for (const ticket of tickets) {
          if (ticket.status === "error") {
            console.error(
              `[Push] Error sending notification:`,
              ticket.message,
              ticket.details,
            );
          }
        }
      } catch (error) {
        console.error("[Push] Failed to send chunk:", error);
      }
    }
  } catch (error) {
    console.error("[Push] Failed to send push notifications:", error);
  }
}

/**
 * Send push notification to a single user.
 */
export async function sendPushToUser(
  userId: string,
  message: PushMessage,
): Promise<void> {
  return sendPushToUsers([userId], message);
}
