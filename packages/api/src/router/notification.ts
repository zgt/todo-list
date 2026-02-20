import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq } from "@acme/db";
import { PushToken, UserPreference } from "@acme/db/schema";

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

      // Upsert: if this token already exists (maybe for a different user), update it
      const existing = await ctx.db.query.PushToken.findFirst({
        where: eq(PushToken.token, input.token),
      });

      if (existing) {
        if (existing.userId === userId) {
          // Same user, same token — just touch updatedAt
          await ctx.db
            .update(PushToken)
            .set({ updatedAt: new Date() })
            .where(eq(PushToken.id, existing.id));
        } else {
          // Token transferred to a new user (e.g., signed out + signed in as different user)
          await ctx.db
            .update(PushToken)
            .set({ userId, updatedAt: new Date() })
            .where(eq(PushToken.id, existing.id));
        }
      } else {
        await ctx.db.insert(PushToken).values({
          userId,
          token: input.token,
          platform: input.platform,
        });
      }

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
  sendTestPush: protectedProcedure
    .input(
      z.object({
        variant: z.enum([
          "generic",
          "round-started",
          "voting-open",
          "results-available",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const messages = {
        generic: {
          title: "🔔 Test Notification",
          body: "If you see this, push notifications are working!",
          data: { type: "test" },
        },
        "round-started": {
          title: "🎵 New Round: 90s One-Hit Wonders",
          body: "Test League — Submit by Feb 25, 11:59 PM",
          data: { type: "league", leagueId: "test", roundId: "test" },
        },
        "voting-open": {
          title: "🗳️ Time to Vote!",
          body: 'Test League — "90s One-Hit Wonders" voting open until Mar 1',
          data: { type: "league", leagueId: "test", roundId: "test" },
        },
        "results-available": {
          title: "🏆 Results Are In!",
          body: 'Test League — See who won "90s One-Hit Wonders"',
          data: { type: "league", leagueId: "test", roundId: "test" },
        },
      };

      const msg = messages[input.variant];
      await sendPushToUser(ctx.session.user.id, msg);

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

      return {
        emailReminders: prefs!.emailReminders,
        pushReminders: prefs!.pushReminders,
        reminderOffsetMinutes: prefs!.reminderOffsetMinutes,
      };
    }),
} satisfies TRPCRouterRecord;
