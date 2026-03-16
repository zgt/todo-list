import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  notInArray,
  or,
  sql,
} from "@acme/db";
import {
  BlockedUser,
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
    snoozedUntil: unknown;
    recurrenceEndDate: unknown;
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
    snoozedUntil: task.snoozedUntil
      ? new Date(task.snoozedUntil as string | number | Date)
      : null,
    recurrenceEndDate: task.recurrenceEndDate
      ? new Date(task.recurrenceEndDate as string | number | Date)
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

/** Calculate the next due date based on recurrence rule and interval */
function getNextDueDate(
  currentDueDate: Date | null,
  rule: string,
  interval: number,
): Date {
  const base = currentDueDate ?? new Date();
  const next = new Date(base);

  switch (rule) {
    case "daily":
      next.setDate(next.getDate() + interval);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7 * interval);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + interval);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + interval);
      break;
    case "custom":
      // For custom, interval represents days
      next.setDate(next.getDate() + interval);
      break;
    default:
      next.setDate(next.getDate() + interval);
  }

  return next;
}

export const taskRouter = {
  // Get all non-deleted, non-snoozed tasks for current user (personal + shared lists)
  all: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const memberListIds = await getMemberListIds(ctx.db, userId);
    const now = new Date();

    // Fetch blocked user IDs to filter out their shared list content
    const blockedRows = await ctx.db.query.BlockedUser.findMany({
      where: eq(BlockedUser.userId, userId),
      columns: { blockedUserId: true },
    });
    const blockedUserIds = blockedRows.map((r) => r.blockedUserId);

    const tasks = await ctx.db.query.Task.findMany({
      where: and(
        isNull(Task.deletedAt),
        isNull(Task.archivedAt),
        // Filter out snoozed tasks (snoozedUntil is null OR in the past)
        or(isNull(Task.snoozedUntil), lt(Task.snoozedUntil, now)),
        memberListIds.length > 0
          ? or(
              and(eq(Task.userId, userId), isNull(Task.listId)),
              inArray(Task.listId, memberListIds),
            )
          : eq(Task.userId, userId),
        // Exclude tasks from blocked users in shared lists
        blockedUserIds.length > 0
          ? or(isNull(Task.listId), notInArray(Task.userId, blockedUserIds))
          : undefined,
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

  // Get deleted/archived tasks for current user
  deleted: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const tasks = await ctx.db.query.Task.findMany({
      where: and(
        eq(Task.userId, userId),
        or(isNotNull(Task.deletedAt), isNotNull(Task.archivedAt)),
      ),
      orderBy: [desc(Task.deletedAt), desc(Task.archivedAt)],
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

      // Fetch existing task to check access and recurrence info
      const existing = await ctx.db.query.Task.findFirst({
        where: and(eq(Task.id, id), isNull(Task.deletedAt)),
        columns: {
          userId: true,
          listId: true,
          completed: true,
          title: true,
          description: true,
          categoryId: true,
          dueDate: true,
          priority: true,
          reminderAt: true,
          recurrenceRule: true,
          recurrenceInterval: true,
          recurrenceEndDate: true,
          recurrenceSourceId: true,
        },
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

      // Auto-create next recurring task when completing a recurring task
      if (
        updates.completed === true &&
        !existing.completed &&
        existing.recurrenceRule
      ) {
        const interval = existing.recurrenceInterval ?? 1;
        const nextDueDate = getNextDueDate(
          existing.dueDate,
          existing.recurrenceRule,
          interval,
        );

        // Only create next occurrence if before end date (or no end date)
        const shouldCreate =
          !existing.recurrenceEndDate ||
          nextDueDate <= existing.recurrenceEndDate;

        if (shouldCreate) {
          // Calculate new reminder offset relative to due date
          let nextReminderAt: Date | null = null;
          if (existing.reminderAt && existing.dueDate) {
            const offset =
              existing.dueDate.getTime() - existing.reminderAt.getTime();
            nextReminderAt = new Date(nextDueDate.getTime() - offset);
          }

          // Snooze the next occurrence until its due date if it's in the future
          // This prevents clutter when completing recurring tasks early
          const now = new Date();
          const startOfDueDate = new Date(nextDueDate);
          startOfDueDate.setHours(0, 0, 0, 0);
          const snoozedUntil = startOfDueDate > now ? startOfDueDate : null;

          void ctx.db
            .insert(Task)
            .values({
              userId,
              title: existing.title,
              description: existing.description,
              categoryId: existing.categoryId,
              listId: existing.listId,
              dueDate: nextDueDate,
              priority: existing.priority,
              reminderAt: nextReminderAt,
              snoozedUntil,
              recurrenceRule: existing.recurrenceRule,
              recurrenceInterval: existing.recurrenceInterval,
              recurrenceEndDate: existing.recurrenceEndDate,
              recurrenceSourceId: existing.recurrenceSourceId ?? id,
              lastSyncedAt: new Date(),
            })
            .catch((err) =>
              console.error("Failed to create recurring task:", err),
            );
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

  // Bulk soft delete tasks
  deleteMany: protectedProcedure
    .input(z.array(z.uuid()).min(1).max(100))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const existingTasks = await ctx.db.query.Task.findMany({
        where: and(inArray(Task.id, input), isNull(Task.deletedAt)),
        columns: { id: true, userId: true, listId: true },
      });
      for (const task of existingTasks) {
        if (task.listId) {
          await assertListAccess(ctx.db, userId, task.listId, "editor");
        } else if (task.userId !== userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized",
          });
        }
      }
      const validIds = existingTasks.map((t) => t.id);
      if (validIds.length === 0) return { deletedCount: 0 };
      const newDate = new Date();
      await ctx.db
        .update(Task)
        .set({ deletedAt: newDate, lastSyncedAt: newDate })
        .where(inArray(Task.id, validIds));
      return { deletedCount: validIds.length };
    }),

  // Snooze a task until a specific date
  snooze: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        snoozedUntil: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const existing = await ctx.db.query.Task.findFirst({
        where: and(eq(Task.id, input.id), isNull(Task.deletedAt)),
        columns: { userId: true, listId: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      if (existing.listId) {
        await assertListAccess(ctx.db, userId, existing.listId, "editor");
      } else if (existing.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      const [task] = await ctx.db
        .update(Task)
        .set({
          snoozedUntil: input.snoozedUntil,
          reminderAt: input.snoozedUntil,
          reminderSentAt: null,
          updatedAt: new Date(),
        })
        .where(eq(Task.id, input.id))
        .returning();

      if (!task) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to snooze task",
        });
      }

      return serializeTaskDates(task);
    }),

  // Clear snooze from a task
  unsnooze: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const existing = await ctx.db.query.Task.findFirst({
        where: and(eq(Task.id, input.id), isNull(Task.deletedAt)),
        columns: { userId: true, listId: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      if (existing.listId) {
        await assertListAccess(ctx.db, userId, existing.listId, "editor");
      } else if (existing.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      const [task] = await ctx.db
        .update(Task)
        .set({ snoozedUntil: null, updatedAt: new Date() })
        .where(eq(Task.id, input.id))
        .returning();

      if (!task) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to unsnooze task",
        });
      }

      return serializeTaskDates(task);
    }),

  // Get all currently snoozed tasks
  snoozed: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const now = new Date();

    const tasks = await ctx.db.query.Task.findMany({
      where: and(
        eq(Task.userId, userId),
        isNull(Task.deletedAt),
        isNull(Task.archivedAt),
        gt(Task.snoozedUntil, now),
      ),
      orderBy: [asc(Task.snoozedUntil)],
      with: { category: true, subtasks: true, list: true },
    });

    return tasks.map(serializeTaskDates);
  }),
} satisfies TRPCRouterRecord;
