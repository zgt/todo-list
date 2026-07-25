import Expo from "expo-server-sdk";

import { inArray } from "@acme/db";
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
 * Result of a push send attempt (G005). Non-throwing by design — this stays
 * safe for fire-and-forget callers that just `void sendPushToUsers(...)` —
 * but callers that care can inspect `sent`/`failed`/`invalidTokens` instead
 * of the previous silent `void`.
 */
export interface PushSendResult {
  /** Number of push tokens we actually attempted to send to. */
  attempted: number;
  /** Tickets that came back with status "ok". */
  sent: number;
  /** Tickets that came back with status "error". */
  failed: number;
  /** Tokens Expo reported as permanently invalid (pruned from PushToken). */
  invalidTokens: string[];
}

function emptyResult(failed = 0): PushSendResult {
  return { attempted: 0, sent: 0, failed, invalidTokens: [] };
}

/**
 * Send push notifications to a list of user IDs.
 * Fetches their registered push tokens and sends via Expo's push service.
 * Silently skips users with no registered tokens.
 */
export async function sendPushToUsers(
  userIds: string[],
  message: PushMessage,
): Promise<PushSendResult> {
  if (userIds.length === 0) return emptyResult();

  try {
    // Fetch all push tokens for the target users
    const tokens = await db.query.PushToken.findMany({
      where: inArray(PushToken.userId, userIds),
    });

    if (tokens.length === 0) return emptyResult();

    // Build messages
    const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t.token));
    const messages = validTokens.map((t) => ({
      to: t.token,
      title: message.title,
      body: message.body,
      data: message.data,
      sound: message.sound ?? "default",
    }));

    if (messages.length === 0) return emptyResult();

    // Chunk and send
    const chunks = expo.chunkPushNotifications(messages);

    let sent = 0;
    let failed = 0;
    const invalidTokens: string[] = [];

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);

        tickets.forEach((ticket, i) => {
          if (ticket.status === "error") {
            failed++;
            console.error(
              `[Push] Error sending notification:`,
              ticket.message,
              ticket.details,
            );

            // F052: prune tokens Expo says are permanently invalid so we
            // stop retrying them every cron tick / notification.
            if (ticket.details?.error === "DeviceNotRegistered") {
              const token = ticket.details.expoPushToken ?? chunk[i]?.to;
              if (typeof token === "string") invalidTokens.push(token);
            }
          } else {
            sent++;
          }
        });
      } catch (error) {
        // The whole chunk failed to send (network/API error) — we don't
        // know per-message status, so count every message in it as failed.
        failed += chunk.length;
        console.error("[Push] Failed to send chunk:", error);
      }
    }

    if (invalidTokens.length > 0) {
      await db
        .delete(PushToken)
        .where(inArray(PushToken.token, invalidTokens))
        .catch((err) =>
          console.error("[Push] Failed to prune invalid tokens:", err),
        );
    }

    return { attempted: messages.length, sent, failed, invalidTokens };
  } catch (error) {
    console.error("[Push] Failed to send push notifications:", error);
    // We don't know how many messages would have been attempted at this
    // point (the failure happened before/while building them), so we can
    // only signal "something went wrong" rather than fabricate a count.
    return emptyResult(1);
  }
}

/**
 * Send push notification to a single user.
 */
export async function sendPushToUser(
  userId: string,
  message: PushMessage,
): Promise<PushSendResult> {
  return sendPushToUsers([userId], message);
}
