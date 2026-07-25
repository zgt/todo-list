import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { and, asc, eq, isNotNull, isNull, ne } from "@acme/db";
import {
  account,
  Category,
  PushToken,
  session,
  Task,
  TaskList,
  TaskListInvite,
  TaskListMember,
  user,
  UserPreference,
} from "@acme/db/schema";

import { sendPushToUser } from "../lib/push";
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

      // Lists whose ownership got transferred away from the departing user
      // during this deletion (F040) — used for a best-effort push after the
      // transaction commits.
      const promotedOwners: { userId: string; listName: string }[] = [];

      await ctx.db.transaction(async (tx) => {
        // 1. Shared lists owned by the departing user (F040): hard-deleting
        // the TaskList row would cascade-delete every other member's
        // membership and silently detach their tasks (listId -> SET NULL).
        // Instead, transfer ownership to the earliest-joined remaining
        // member so the list stays alive for everyone else. Lists with no
        // other members fall through to the delete below, unchanged.
        const ownedLists = await tx
          .select({ id: TaskList.id, name: TaskList.name })
          .from(TaskList)
          .where(and(eq(TaskList.ownerId, userId), isNull(TaskList.deletedAt)));

        for (const list of ownedLists) {
          const otherMembers = await tx
            .select({
              userId: TaskListMember.userId,
              role: TaskListMember.role,
            })
            .from(TaskListMember)
            .where(
              and(
                eq(TaskListMember.listId, list.id),
                ne(TaskListMember.userId, userId),
              ),
            )
            .orderBy(asc(TaskListMember.joinedAt));

          if (otherMembers.length === 0) continue;

          // Prefer the earliest-joined editor; fall back to the
          // earliest-joined member of any role (e.g. viewer-only lists).
          const newOwner =
            otherMembers.find((m) => m.role === "editor") ?? otherMembers[0];
          if (!newOwner) continue;

          await tx
            .update(TaskList)
            .set({ ownerId: newOwner.userId })
            .where(eq(TaskList.id, list.id));

          await tx
            .update(TaskListMember)
            .set({ role: "owner" })
            .where(
              and(
                eq(TaskListMember.listId, list.id),
                eq(TaskListMember.userId, newOwner.userId),
              ),
            );

          promotedOwners.push({ userId: newOwner.userId, listName: list.name });
        }

        // 2. Reassign tasks the departing user created inside a shared list
        // owned by someone else (F016), including lists just transferred
        // above — otherwise that content would vanish from the list with
        // no notice. Subtasks cascade off task.id, so they follow the task
        // automatically. Tasks that are personal or in a list the user
        // still owns (solo lists, deleted below) are left alone here and
        // removed with the rest of the account.
        const listIdsWithOwnTasks = await tx
          .selectDistinct({ listId: Task.listId })
          .from(Task)
          .where(and(eq(Task.userId, userId), isNotNull(Task.listId)));

        for (const { listId } of listIdsWithOwnTasks) {
          if (!listId) continue;
          const [list] = await tx
            .select({ ownerId: TaskList.ownerId })
            .from(TaskList)
            .where(eq(TaskList.id, listId));

          if (list && list.ownerId !== userId) {
            await tx
              .update(Task)
              .set({ userId: list.ownerId })
              .where(and(eq(Task.userId, userId), eq(Task.listId, listId)));
          }
        }

        // 3. Delete remaining task-related data (personal tasks, and tasks
        // in solo-owned lists that are about to be deleted below).
        // Subtasks cascade from tasks, so just delete tasks.
        await tx.delete(Task).where(eq(Task.userId, userId));
        await tx.delete(Category).where(eq(Category.userId, userId));

        // Delete task list memberships and invites created by user.
        // Surviving members' rows may reference the departing user via
        // invitedBy (FK with no cascade) — null those out or the final
        // user delete below fails the FK check and rolls everything back.
        await tx
          .update(TaskListMember)
          .set({ invitedBy: null })
          .where(eq(TaskListMember.invitedBy, userId));
        await tx
          .delete(TaskListMember)
          .where(eq(TaskListMember.userId, userId));
        await tx
          .delete(TaskListInvite)
          .where(eq(TaskListInvite.createdBy, userId));

        // Delete task lists still owned by user (only solo lists remain at
        // this point — shared lists were transferred to a new owner above).
        // Cascades members/invites/tasks for those solo lists.
        await tx.delete(TaskList).where(eq(TaskList.ownerId, userId));

        // 4. Delete user preferences and push tokens
        await tx
          .delete(UserPreference)
          .where(eq(UserPreference.userId, userId));
        await tx.delete(PushToken).where(eq(PushToken.userId, userId));

        // 5. Delete auth data (sessions, accounts, then user)
        await tx.delete(session).where(eq(session.userId, userId));
        await tx.delete(account).where(eq(account.userId, userId));

        // 6. Delete the user
        await tx.delete(user).where(eq(user.id, userId));
      });

      // Best-effort notification to promoted owners, sent after the
      // transaction commits so a push failure never blocks deletion.
      for (const promoted of promotedOwners) {
        try {
          await sendPushToUser(promoted.userId, {
            title: "You're now the list owner",
            body: `You've been made the owner of "${promoted.listName}" after the previous owner deleted their account.`,
            data: { type: "shared-list" },
          });
        } catch (error) {
          console.error(
            "[deleteAccount] Failed to notify promoted owner:",
            error,
          );
        }
      }

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
