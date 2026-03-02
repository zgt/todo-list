import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, asc, desc, eq, inArray, isNull, or, sql } from "@acme/db";
import {
  CreateTaskWithSubtasksSchema,
  Subtask,
  Task,
  TaskListMember,
  TaskPriority,
  UpdateTaskSchema,
} from "@acme/db/schema";

import { flagContentIfNeeded } from "../lib/content-filter";
import { assertListAccess } from "../lib/list-access";
import {
  pushNotifyTaskCompleted,
  pushNotifyTaskEdited,
} from "../lib/push/shared-list-notifications";
import { protectedProcedure } from "../trpc";

function serializeSubtaskDates<
  T extends {
    createdAt: unknown;
    updatedAt: unknown;
    completedAt: unknown;
  },
>(subtask: T) {
  return {
    ...subtask,
    createdAt: new Date(subtask.createdAt as string | number | Date),
    updatedAt: subtask.updatedAt
      ? new Date(subtask.updatedAt as string | number | Date)
      : null,
    completedAt: subtask.completedAt
      ? new Date(subtask.completedAt as string | number | Date)
      : null,
  };
}

function serializeTaskDates<
  T extends {
    createdAt: unknown;
    updatedAt: unknown;
    dueDate: unknown;
    completedAt: unknown;
    archivedAt: unknown;
    deletedAt: unknown;
    lastSyncedAt: unknown;
    reminderAt: unknown;
    reminderSentAt: unknown;
    subtasks?: {
      createdAt: unknown;
      updatedAt: unknown;
      completedAt: unknown;
    }[];
  },
>(task: T) {
  return {
    ...task,
    createdAt: new Date(task.createdAt as string | number | Date),
    updatedAt: task.updatedAt
      ? new Date(task.updatedAt as string | number | Date)
      : null,
    dueDate: task.dueDate
      ? new Date(task.dueDate as string | number | Date)
      : null,
    completedAt: task.completedAt
      ? new Date(task.completedAt as string | number | Date)
      : null,
    archivedAt: task.archivedAt
      ? new Date(task.archivedAt as string | number | Date)
      : null,
    deletedAt: task.deletedAt
      ? new Date(task.deletedAt as string | number | Date)
      : null,
    lastSyncedAt: task.lastSyncedAt
      ? new Date(task.lastSyncedAt as string | number | Date)
      : null,
    reminderAt: task.reminderAt
      ? new Date(task.reminderAt as string | number | Date)
      : null,
    reminderSentAt: task.reminderSentAt
      ? new Date(task.reminderSentAt as string | number | Date)
      : null,
    subtasks: task.subtasks?.map(serializeSubtaskDates),
  };
}

/** Get all list IDs the user is a member of */
async function getMemberListIds(
  db: Parameters<typeof assertListAccess>[0],
  userId: string,
): Promise<string[]> {
  const memberships = await db.query.TaskListMember.findMany({
    where: eq(TaskListMember.userId, userId),
    columns: { listId: true },
  });
  return memberships.map((m) => m.listId);
}

export const taskRouter = {
  // Get all non-deleted tasks for current user (personal + shared lists)
  all: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const memberListIds = await getMemberListIds(ctx.db, userId);

    const tasks = await ctx.db.query.Task.findMany({
      where: and(
        isNull(Task.deletedAt),
        isNull(Task.archivedAt),
        memberListIds.length > 0
          ? or(
              and(eq(Task.userId, userId), isNull(Task.listId)),
              inArray(Task.listId, memberListIds),
            )
          : eq(Task.userId, userId),
      ),
      orderBy: [
        asc(Task.completed),
        asc(
          sql`CASE ${Task.priority} WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END`,
        ),
        desc(Task.createdAt),
      ],
      limit: 100,
      with: { category: true, subtasks: true, list: true },
    });

    return tasks.map(serializeTaskDates);
  }),

  // Get single task by ID
  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.query.Task.findFirst({
        where: and(eq(Task.id, input.id), isNull(Task.deletedAt)),
        with: { category: true, subtasks: true, list: true },
      });

      if (!task) return null;

      // Verify access: own task or member of the task's list
      const userId = ctx.session.user.id;
      if (task.userId !== userId) {
        if (!task.listId) return null;
        try {
          await assertListAccess(ctx.db, userId, task.listId, "viewer");
        } catch {
          return null;
        }
      }

      return serializeTaskDates(task);
    }),

  // Get tasks filtered by priority level
  byPriority: protectedProcedure
    .input(
      z.object({
        priority: TaskPriority,
        includeCompleted: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(Task.userId, ctx.session.user.id),
        eq(Task.priority, input.priority),
        isNull(Task.deletedAt),
        isNull(Task.archivedAt),
      ];

      if (!input.includeCompleted) {
        conditions.push(eq(Task.completed, false));
      }

      const tasks = await ctx.db.query.Task.findMany({
        where: and(...conditions),
        orderBy: [asc(Task.dueDate), desc(Task.createdAt)],
        limit: 100,
        with: { category: true },
      });

      return tasks.map(serializeTaskDates);
    }),

  // Get only high priority, non-completed tasks
  highPriority: protectedProcedure.query(async ({ ctx }) => {
    const tasks = await ctx.db.query.Task.findMany({
      where: and(
        eq(Task.userId, ctx.session.user.id),
        eq(Task.priority, "high"),
        eq(Task.completed, false),
        isNull(Task.deletedAt),
        isNull(Task.archivedAt),
      ),
      orderBy: [asc(Task.dueDate), desc(Task.createdAt)],
      limit: 100,
      with: { category: true },
    });

    return tasks.map(serializeTaskDates);
  }),

  // Get count of tasks by priority level
  priorityStats: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        priority: Task.priority,
        count: sql<number>`count(*)::int`,
      })
      .from(Task)
      .where(
        and(
          eq(Task.userId, ctx.session.user.id),
          eq(Task.completed, false),
          isNull(Task.deletedAt),
          isNull(Task.archivedAt),
        ),
      )
      .groupBy(Task.priority);

    const stats: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    };

    for (const row of result) {
      const key = row.priority ?? "none";
      stats[key] = row.count;
    }

    return stats;
  }),

  // Create new task (with optional inline subtasks)
  create: protectedProcedure
    .input(CreateTaskWithSubtasksSchema)
    .mutation(async ({ ctx, input }) => {
      const { subtasks: subtaskInputs, ...taskInput } = input;

      // If assigning to a list, verify editor access
      if (taskInput.listId) {
        await assertListAccess(
          ctx.db,
          ctx.session.user.id,
          taskInput.listId,
          "editor",
        );
      }

      // Use a transaction to create task + subtasks atomically
      const result = await ctx.db.transaction(async (tx) => {
        const [task] = await tx
          .insert(Task)
          .values({
            ...taskInput,
            userId: ctx.session.user.id,
            lastSyncedAt: new Date(),
          })
          .returning();

        if (!task) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create task",
          });
        }

        if (subtaskInputs && subtaskInputs.length > 0) {
          await tx.insert(Subtask).values(
            subtaskInputs.map((s, i) => ({
              taskId: task.id,
              title: s.title,
              sortOrder: i,
            })),
          );
        }

        // Flag content for review (fire-and-forget)
        void flagContentIfNeeded("TASK", task.id, task.title);

        return task;
      });

      return serializeTaskDates(result);
    }),

  // Update existing task
  update: protectedProcedure
    .input(UpdateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const userId = ctx.session.user.id;

      // Fetch existing task to check access
      const existing = await ctx.db.query.Task.findFirst({
        where: and(eq(Task.id, id), isNull(Task.deletedAt)),
        columns: { userId: true, listId: true, completed: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      // If the task belongs to a list, verify editor access
      if (existing.listId) {
        await assertListAccess(ctx.db, userId, existing.listId, "editor");
      } else if (existing.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to update this task",
        });
      }

      // If moving to a new list, verify access to the target list
      if (
        updates.listId !== undefined &&
        updates.listId !== null &&
        updates.listId !== existing.listId
      ) {
        await assertListAccess(ctx.db, userId, updates.listId, "editor");
      }

      // Build update object
      const updateData: Record<string, unknown> = {
        ...updates,
        updatedAt: new Date(),
      };

      // Handle completedAt logic
      if (
        updates.completed !== undefined &&
        updates.completedAt === undefined
      ) {
        updateData.completedAt = updates.completed ? new Date() : null;
      }

      // Reset reminderSentAt when reminderAt changes so the cron re-processes
      if (updates.reminderAt !== undefined) {
        updateData.reminderSentAt = null;
      }

      const [task] = await ctx.db
        .update(Task)
        .set(updateData)
        .where(eq(Task.id, id))
        .returning();

      if (!task) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Task not found or update failed",
        });
      }

      // Notify other shared list members (fire-and-forget)
      if (existing.listId) {
        const notifyParams = {
          listId: existing.listId,
          actorUserId: userId,
          actorName: ctx.session.user.name,
          taskId: id,
          taskTitle: task.title,
        };

        if (updates.completed === true && !existing.completed) {
          void pushNotifyTaskCompleted(notifyParams);
        } else if (updates.completed === undefined) {
          void pushNotifyTaskEdited(notifyParams);
        }
      }

      return serializeTaskDates(task);
    }),

  // Soft delete task
  delete: protectedProcedure
    .input(z.uuid())
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Fetch existing task to check access
      const existing = await ctx.db.query.Task.findFirst({
        where: and(eq(Task.id, input), isNull(Task.deletedAt)),
        columns: { userId: true, listId: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      // If the task belongs to a list, verify editor access
      if (existing.listId) {
        await assertListAccess(ctx.db, userId, existing.listId, "editor");
      } else if (existing.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to delete this task",
        });
      }

      const newDate = new Date();
      await ctx.db
        .update(Task)
        .set({
          deletedAt: newDate,
          lastSyncedAt: newDate,
        })
        .where(eq(Task.id, input));

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
