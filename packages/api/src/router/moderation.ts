import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq } from "@acme/db";
import { BlockedUser, Report } from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

export const moderationRouter = {
  reportContent: protectedProcedure
    .input(
      z.object({
        contentType: z.enum(["TASK", "USER", "COMMENT"]),
        contentId: z.string().min(1),
        reportedUserId: z.string().optional(),
        reason: z.enum(["SPAM", "OFFENSIVE", "HARASSMENT", "OTHER"]),
        details: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Prevent self-reporting
      if (input.reportedUserId === userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot report yourself",
        });
      }

      await ctx.db.insert(Report).values({
        reporterId: userId,
        reportedUserId: input.reportedUserId ?? null,
        contentType: input.contentType,
        contentId: input.contentId,
        reason: input.reason,
        details: input.details ?? null,
      });

      return { success: true };
    }),

  blockUser: protectedProcedure
    .input(z.object({ blockedUserId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      if (input.blockedUserId === userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot block yourself",
        });
      }

      // Upsert — ignore if already blocked
      await ctx.db
        .insert(BlockedUser)
        .values({
          userId,
          blockedUserId: input.blockedUserId,
        })
        .onConflictDoNothing();

      return { success: true };
    }),

  unblockUser: protectedProcedure
    .input(z.object({ blockedUserId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      await ctx.db
        .delete(BlockedUser)
        .where(
          and(
            eq(BlockedUser.userId, userId),
            eq(BlockedUser.blockedUserId, input.blockedUserId),
          ),
        );

      return { success: true };
    }),

  getBlockedUsers: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const blocked = await ctx.db.query.BlockedUser.findMany({
      where: eq(BlockedUser.userId, userId),
      with: {
        blockedUser: {
          columns: { id: true, name: true, image: true },
        },
      },
      orderBy: (table, { desc }) => desc(table.createdAt),
    });

    return blocked.map((b) => ({
      id: b.id,
      blockedUserId: b.blockedUserId,
      user: b.blockedUser,
      createdAt: b.createdAt,
    }));
  }),

  getBlockedUserIds: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const blocked = await ctx.db.query.BlockedUser.findMany({
      where: eq(BlockedUser.userId, userId),
      columns: { blockedUserId: true },
    });

    return blocked.map((b) => b.blockedUserId);
  }),

  // Admin-only: list reports (for future admin panel)
  getReports: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["PENDING", "REVIEWED", "DISMISSED"]).optional(),
          limit: z.number().min(1).max(100).optional().default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // For now, any authenticated user can view reports
      // TODO: Add admin role check when admin system is built
      const reports = await ctx.db.query.Report.findMany({
        where: input?.status ? eq(Report.status, input.status) : undefined,
        with: {
          reporter: { columns: { id: true, name: true } },
          reportedUser: { columns: { id: true, name: true } },
        },
        orderBy: (table, { desc }) => desc(table.createdAt),
        limit: input?.limit ?? 50,
      });

      return reports;
    }),
} satisfies TRPCRouterRecord;
