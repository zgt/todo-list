import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq } from "@acme/db";
import { BlockedUser, Report } from "@acme/db/schema";

import { flagContentIfNeeded } from "../lib/content-filter";
import { adminProcedure, protectedProcedure } from "../trpc";

export const moderationRouter = {
  reportContent: protectedProcedure
    .input(
      z.object({
        contentType: z.enum(["TASK", "USER", "COMMENT"]),
        contentId: z.string().min(1).max(255),
        reportedUserId: z.string().max(255).optional(),
        reason: z.enum(["SPAM", "OFFENSIVE", "HARASSMENT", "OTHER"]),
        details: z.string().max(2000).optional(),
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

      const [report] = await ctx.db
        .insert(Report)
        .values({
          reporterId: userId,
          reportedUserId: input.reportedUserId ?? null,
          contentType: input.contentType,
          contentId: input.contentId,
          reason: input.reason,
          details: input.details ?? null,
        })
        .returning();

      if (!report) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create report",
        });
      }

      // Run the free-text details through the same content filter used for
      // task titles — still store the report either way, but also flag it
      // for review if it matches the blocklist (same pattern as tasks).
      if (input.details) {
        void flagContentIfNeeded("COMMENT", report.id, input.details);
      }

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

  // Admin-only: list reports (for the admin panel). Gated by adminProcedure
  // — a minimal check against ADMIN_USER_IDS until a real role system exists.
  getReports: adminProcedure
    .input(
      z
        .object({
          status: z.enum(["PENDING", "REVIEWED", "DISMISSED"]).optional(),
          limit: z.number().min(1).max(100).optional().default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
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

  // Admin-only: transition a report through its review lifecycle.
  setReportStatus: adminProcedure
    .input(
      z.object({
        reportId: z.string().uuid(),
        status: z.enum(["REVIEWED", "DISMISSED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(Report)
        .set({ status: input.status })
        .where(eq(Report.id, input.reportId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found",
        });
      }

      return updated;
    }),

  // Admin-only: list auto-flagged content (most recent first).
  getFlags: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.ContentFlag.findMany({
      orderBy: (table, { desc }) => desc(table.createdAt),
      limit: 100,
    });
  }),
} satisfies TRPCRouterRecord;
