import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq } from "@acme/db";
import { PushToken } from "@acme/db/schema";

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
} satisfies TRPCRouterRecord;
