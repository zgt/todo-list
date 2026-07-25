import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq, sql } from "@acme/db";
import { PushToken, user, UserPreference } from "@acme/db/schema";

import { sendPushToUser } from "../lib/push";
import { protectedProcedure } from "../trpc";

export const notificationRouter = {
  /** Register or update a push token for the current user + device */
  registerToken: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
        platform: z.enum(["ios", "android"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Real upsert on the unique token constraint — the previous
      // find-then-write raced concurrent registrations into duplicate rows.
      // A token registered by a different user is transferred to the caller
      // (signed out + signed in as someone else on the same device).
      await ctx.db
        .insert(PushToken)
        .values({
          userId,
          token: input.token,
          platform: input.platform,
        })
        .onConflictDoUpdate({
          target: PushToken.token,
          set: { userId, platform: input.platform, updatedAt: new Date() },
        });

      return { success: true };
    }),

  /** Remove push token on logout */
  removeToken: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(PushToken)
        .where(
          and(
            eq(PushToken.token, input.token),
            eq(PushToken.userId, ctx.session.user.id),
          ),
        );

      return { success: true };
    }),

  /** List current user's registered tokens (for debugging/settings) */
  myTokens: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.PushToken.findMany({
      where: eq(PushToken.userId, ctx.session.user.id),
    });
  }),

  /** Send a test push notification to the current user's devices */
  sendTestPush: protectedProcedure.mutation(async ({ ctx }) => {
    await sendPushToUser(ctx.session.user.id, {
      title: "🔔 Test Notification",
      body: "If you see this, push notifications are working!",
      data: { type: "test" },
    });

    return { success: true };
  }),

  /** Get the current user's notification preferences (with defaults) */
  getUserPreferences: protectedProcedure.query(async ({ ctx }) => {
    const prefs = await ctx.db.query.UserPreference.findFirst({
      where: eq(UserPreference.userId, ctx.session.user.id),
    });

    if (!prefs) {
      return {
        emailReminders: false,
        pushReminders: true,
        reminderOffsetMinutes: 15,
      };
    }

    return {
      emailReminders: prefs.emailReminders,
      pushReminders: prefs.pushReminders,
      reminderOffsetMinutes: prefs.reminderOffsetMinutes,
    };
  }),

  /** Get the current user's shared list notification preference */
  getSharedListNotificationPref: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await ctx.db.query.user.findFirst({
      where: eq(user.id, ctx.session.user.id),
      columns: { notificationPreferences: true },
    });
    const prefs = dbUser?.notificationPreferences as Record<
      string,
      boolean
    > | null;
    return { sharedListActivity: prefs?.sharedListActivity !== false };
  }),

  /** Update the current user's shared list notification preference */
  updateSharedListNotificationPref: protectedProcedure
    .input(z.object({ sharedListActivity: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(user)
        .set({
          notificationPreferences: sql`coalesce(${user.notificationPreferences}, '{}'::jsonb) || ${JSON.stringify(input)}::jsonb`,
        })
        .where(eq(user.id, ctx.session.user.id));
      return { success: true };
    }),

  /** Upsert the current user's notification preferences */
  updateUserPreferences: protectedProcedure
    .input(
      z.object({
        emailReminders: z.boolean().optional(),
        pushReminders: z.boolean().optional(),
        reminderOffsetMinutes: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [prefs] = await ctx.db
        .insert(UserPreference)
        .values({
          userId,
          emailReminders: input.emailReminders ?? false,
          pushReminders: input.pushReminders ?? true,
          reminderOffsetMinutes: input.reminderOffsetMinutes ?? 15,
        })
        .onConflictDoUpdate({
          target: UserPreference.userId,
          set: {
            ...(input.emailReminders !== undefined && {
              emailReminders: input.emailReminders,
            }),
            ...(input.pushReminders !== undefined && {
              pushReminders: input.pushReminders,
            }),
            ...(input.reminderOffsetMinutes !== undefined && {
              reminderOffsetMinutes: input.reminderOffsetMinutes,
            }),
            updatedAt: new Date(),
          },
        })
        .returning();

      // prefs is guaranteed to exist after upsert with .returning()
      const result = prefs ?? {
        emailReminders: input.emailReminders ?? false,
        pushReminders: input.pushReminders ?? true,
        reminderOffsetMinutes: input.reminderOffsetMinutes ?? 15,
      };

      return {
        emailReminders: result.emailReminders,
        pushReminders: result.pushReminders,
        reminderOffsetMinutes: result.reminderOffsetMinutes,
      };
    }),
} satisfies TRPCRouterRecord;
