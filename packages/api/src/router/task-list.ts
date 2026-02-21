import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq, isNull, or, sql } from "@acme/db";
import {
  CreateTaskListSchema,
  Task,
  TaskList,
  TaskListInvite,
  TaskListMember,
  UpdateTaskListSchema,
} from "@acme/db/schema";

import { assertListAccess } from "../lib/list-access";
import { protectedProcedure } from "../trpc";

export const taskListRouter = {
  // ── List CRUD ─────────────────────────────────────────────────────

  all: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get lists where user is owner OR member, not soft-deleted
    const lists = await ctx.db
      .selectDistinctOn([TaskList.id], {
        id: TaskList.id,
        name: TaskList.name,
        description: TaskList.description,
        color: TaskList.color,
        icon: TaskList.icon,
        ownerId: TaskList.ownerId,
        isDefault: TaskList.isDefault,
        createdAt: TaskList.createdAt,
        updatedAt: TaskList.updatedAt,
      })
      .from(TaskList)
      .leftJoin(TaskListMember, eq(TaskList.id, TaskListMember.listId))
      .where(
        and(
          isNull(TaskList.deletedAt),
          or(eq(TaskList.ownerId, userId), eq(TaskListMember.userId, userId)),
        ),
      );

    // Get member and task counts in parallel
    const listIds = lists.map((l) => l.id);

    if (listIds.length === 0) return [];

    const [memberCounts, taskCounts] = await Promise.all([
      ctx.db
        .select({
          listId: TaskListMember.listId,
          count: sql<number>`count(*)::int`,
        })
        .from(TaskListMember)
        .where(sql`${TaskListMember.listId} = ANY(${listIds})`)
        .groupBy(TaskListMember.listId),
      ctx.db
        .select({
          listId: Task.listId,
          count: sql<number>`count(*)::int`,
        })
        .from(Task)
        .where(
          and(sql`${Task.listId} = ANY(${listIds})`, isNull(Task.deletedAt)),
        )
        .groupBy(Task.listId),
    ]);

    const memberCountMap = new Map(
      memberCounts.map((r) => [r.listId, r.count]),
    );
    const taskCountMap = new Map(taskCounts.map((r) => [r.listId, r.count]));

    return lists.map((list) => ({
      ...list,
      createdAt: new Date(list.createdAt),
      updatedAt: list.updatedAt ? new Date(list.updatedAt) : null,
      memberCount: memberCountMap.get(list.id) ?? 0,
      taskCount: taskCountMap.get(list.id) ?? 0,
    }));
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertListAccess(ctx.db, ctx.session.user.id, input.id, "viewer");

      const list = await ctx.db.query.TaskList.findFirst({
        where: and(eq(TaskList.id, input.id), isNull(TaskList.deletedAt)),
        with: {
          members: {
            with: {
              user: {
                columns: { id: true, name: true, email: true, image: true },
              },
            },
          },
          tasks: {
            where: isNull(Task.deletedAt),
          },
        },
      });

      if (!list) return null;

      return {
        ...list,
        createdAt: new Date(list.createdAt),
        updatedAt: list.updatedAt ? new Date(list.updatedAt) : null,
        deletedAt: list.deletedAt ? new Date(list.deletedAt) : null,
      };
    }),

  create: protectedProcedure
    .input(CreateTaskListSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [list] = await ctx.db
        .insert(TaskList)
        .values({ ...input, ownerId: userId })
        .returning();

      if (!list) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create list",
        });
      }

      // Add owner as a member
      await ctx.db.insert(TaskListMember).values({
        listId: list.id,
        userId,
        role: "owner",
      });

      return {
        ...list,
        createdAt: new Date(list.createdAt),
        updatedAt: list.updatedAt ? new Date(list.updatedAt) : null,
        deletedAt: list.deletedAt ? new Date(list.deletedAt) : null,
      };
    }),

  update: protectedProcedure
    .input(UpdateTaskListSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      await assertListAccess(ctx.db, ctx.session.user.id, id, "owner");

      const [list] = await ctx.db
        .update(TaskList)
        .set(updates)
        .where(eq(TaskList.id, id))
        .returning();

      if (!list) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update list",
        });
      }

      return {
        ...list,
        createdAt: new Date(list.createdAt),
        updatedAt: list.updatedAt ? new Date(list.updatedAt) : null,
        deletedAt: list.deletedAt ? new Date(list.deletedAt) : null,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertListAccess(ctx.db, ctx.session.user.id, input.id, "owner");

      // Soft delete the list
      await ctx.db
        .update(TaskList)
        .set({ deletedAt: new Date() })
        .where(eq(TaskList.id, input.id));

      // Orphan tasks back to personal
      await ctx.db
        .update(Task)
        .set({ listId: null })
        .where(eq(Task.listId, input.id));

      return { success: true };
    }),

  // ── Invite Management ─────────────────────────────────────────────

  createInvite: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        role: z.enum(["editor", "viewer"]).default("editor"),
        maxUses: z.number().int().positive().optional(),
        expiresInHours: z.number().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertListAccess(
        ctx.db,
        ctx.session.user.id,
        input.listId,
        "owner",
      );

      const inviteCode = crypto.randomUUID().slice(0, 8);
      const expiresAt = input.expiresInHours
        ? new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000)
        : undefined;

      await ctx.db.insert(TaskListInvite).values({
        listId: input.listId,
        inviteCode,
        role: input.role,
        maxUses: input.maxUses,
        expiresAt,
        createdBy: ctx.session.user.id,
      });

      return { inviteCode, role: input.role };
    }),

  joinByInvite: protectedProcedure
    .input(z.object({ inviteCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const invite = await ctx.db.query.TaskListInvite.findFirst({
        where: and(
          eq(TaskListInvite.inviteCode, input.inviteCode),
          isNull(TaskListInvite.deletedAt),
        ),
        with: { list: true },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found or has been revoked",
        });
      }

      // Check expiry
      if (invite.expiresAt && new Date() > invite.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has expired",
        });
      }

      // Check max uses
      if (invite.maxUses && invite.useCount >= invite.maxUses) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has reached maximum uses",
        });
      }

      // Check if already a member
      const existing = await ctx.db.query.TaskListMember.findFirst({
        where: and(
          eq(TaskListMember.listId, invite.listId),
          eq(TaskListMember.userId, userId),
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Already a member of this list",
        });
      }

      // Add member and increment use count
      await ctx.db.insert(TaskListMember).values({
        listId: invite.listId,
        userId,
        role: invite.role,
        invitedBy: invite.createdBy,
      });

      await ctx.db
        .update(TaskListInvite)
        .set({ useCount: invite.useCount + 1 })
        .where(eq(TaskListInvite.id, invite.id));

      return {
        id: invite.list.id,
        name: invite.list.name,
        description: invite.list.description,
        color: invite.list.color,
        icon: invite.list.icon,
      };
    }),

  // ── Member Management ─────────────────────────────────────────────

  removeMember: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertListAccess(
        ctx.db,
        ctx.session.user.id,
        input.listId,
        "owner",
      );

      // Cannot remove the owner
      const list = await ctx.db.query.TaskList.findFirst({
        where: eq(TaskList.id, input.listId),
        columns: { ownerId: true },
      });

      if (list?.ownerId === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove the list owner",
        });
      }

      await ctx.db
        .delete(TaskListMember)
        .where(
          and(
            eq(TaskListMember.listId, input.listId),
            eq(TaskListMember.userId, input.userId),
          ),
        );

      return { success: true };
    }),

  updateMemberRole: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        userId: z.string(),
        role: z.enum(["editor", "viewer"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertListAccess(
        ctx.db,
        ctx.session.user.id,
        input.listId,
        "owner",
      );

      // Cannot change owner's own role
      const list = await ctx.db.query.TaskList.findFirst({
        where: eq(TaskList.id, input.listId),
        columns: { ownerId: true },
      });

      if (list?.ownerId === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change the owner's role",
        });
      }

      await ctx.db
        .update(TaskListMember)
        .set({ role: input.role })
        .where(
          and(
            eq(TaskListMember.listId, input.listId),
            eq(TaskListMember.userId, input.userId),
          ),
        );

      return { success: true };
    }),

  leave: protectedProcedure
    .input(z.object({ listId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Owners cannot leave — they must delete or transfer
      const list = await ctx.db.query.TaskList.findFirst({
        where: eq(TaskList.id, input.listId),
        columns: { ownerId: true },
      });

      if (!list) {
        throw new TRPCError({ code: "NOT_FOUND", message: "List not found" });
      }

      if (list.ownerId === userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Owners cannot leave their own list. Delete or transfer ownership instead.",
        });
      }

      await ctx.db
        .delete(TaskListMember)
        .where(
          and(
            eq(TaskListMember.listId, input.listId),
            eq(TaskListMember.userId, userId),
          ),
        );

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
