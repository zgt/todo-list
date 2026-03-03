import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { eq } from "@acme/db";
import {
  account,
  Category,
  Comment,
  League,
  LeagueMember,
  PushToken,
  session,
  Submission,
  Task,
  TaskList,
  TaskListInvite,
  TaskListMember,
  user,
  UserPreference,
  Vote,
} from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

export const userRouter = {
  updateDisplayName: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(50).trim() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(user)
        .set({ name: input.name })
        .where(eq(user.id, ctx.session.user.id));

      return { name: input.name };
    }),

  deleteAccount: protectedProcedure
    .input(
      z.object({
        confirmation: z.string().refine((val) => val === "DELETE", {
          message: 'You must type "DELETE" to confirm account deletion',
        }),
      }),
    )
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      await ctx.db.transaction(async (tx) => {
        // 1. Delete music league data (votes, comments, submissions depend on user)
        await tx.delete(Vote).where(eq(Vote.voterId, userId));
        await tx.delete(Comment).where(eq(Comment.userId, userId));
        await tx.delete(Submission).where(eq(Submission.userId, userId));
        await tx.delete(LeagueMember).where(eq(LeagueMember.userId, userId));

        // Delete leagues the user created (cascades rounds/submissions/votes)
        await tx.delete(League).where(eq(League.creatorId, userId));

        // 2. Delete task-related data
        // Subtasks cascade from tasks, so just delete tasks
        await tx.delete(Task).where(eq(Task.userId, userId));
        await tx.delete(Category).where(eq(Category.userId, userId));

        // Delete task list memberships and invites created by user
        await tx
          .delete(TaskListMember)
          .where(eq(TaskListMember.userId, userId));
        await tx
          .delete(TaskListInvite)
          .where(eq(TaskListInvite.createdBy, userId));

        // Delete task lists owned by user (cascades members/invites/tasks)
        await tx.delete(TaskList).where(eq(TaskList.ownerId, userId));

        // 3. Delete user preferences and push tokens
        await tx
          .delete(UserPreference)
          .where(eq(UserPreference.userId, userId));
        await tx.delete(PushToken).where(eq(PushToken.userId, userId));

        // 4. Delete auth data (sessions, accounts, then user)
        await tx.delete(session).where(eq(session.userId, userId));
        await tx.delete(account).where(eq(account.userId, userId));

        // 5. Delete the user
        await tx.delete(user).where(eq(user.id, userId));
      });

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
