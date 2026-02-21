import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { and, asc, desc, eq, isNull, sql } from "@acme/db";
import {
  CreateTaskSchema,
  Task,
  TaskPriority,
  UpdateTaskSchema,
} from "@acme/db/schema";

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

export const taskRouter = {
  // Get all non-deleted tasks for current user
  all: protectedProcedure.query(async ({ ctx }) => {
    const tasks = await ctx.db.query.Task.findMany({
      where: and(
        eq(Task.userId, ctx.session.user.id),
        isNull(Task.deletedAt),
        isNull(Task.archivedAt),
      ),
      orderBy: [desc(Task.createdAt)],
      limit: 100,
      with: { category: true, subtasks: true },
    });

    return tasks.map(serializeTaskDates);
  }),

  // Get single task by ID
  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.query.Task.findFirst({
        where: and(
          eq(Task.id, input.id),
          eq(Task.userId, ctx.session.user.id),
          isNull(Task.deletedAt),
        ),
        with: { category: true, subtasks: true },
      });

      if (!task) return null;

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

  // Create new task
  create: protectedProcedure
    .input(CreateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const [task] = await ctx.db
        .insert(Task)
        .values({
          ...input,
          userId: ctx.session.user.id,
          lastSyncedAt: new Date(),
        })
        .returning();

      if (!task) {
        throw new Error("Failed to create task");
      }

      return serializeTaskDates(task);
    }),

  // Update existing task
  update: protectedProcedure
    .input(UpdateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

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
        .where(and(eq(Task.id, id), eq(Task.userId, ctx.session.user.id)))
        .returning();

      if (!task) {
        throw new Error("Task not found or update failed");
      }

      return serializeTaskDates(task);
    }),

  // Soft delete task
  delete: protectedProcedure
    .input(z.uuid())
    .mutation(async ({ ctx, input }) => {
      try {
        const newDate = new Date();
        await ctx.db
          .update(Task)
          .set({
            deletedAt: newDate,
            lastSyncedAt: newDate,
          })
          .where(and(eq(Task.id, input), eq(Task.userId, ctx.session.user.id)));

        return { success: true };
      } catch (error) {
        console.error("Failed to delete task:", error);
        throw new Error(
          `Failed to delete task: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),
} satisfies TRPCRouterRecord;
