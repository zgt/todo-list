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
  Category,
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

/**
 * Verify a categoryId (when provided) is usable by the given user: either
 * owned by them, or reachable through a shared list they belong to (a
 * co-member legitimately re-saves a task that carries the list owner's
 * category — see category.all, which exposes exactly that shared set).
 * Rejects unknown, foreign-and-unshared, and soft-deleted categories.
 */
async function assertCategoryAccess(
  db: Parameters<typeof assertListAccess>[0],
  categoryId: string,
  userId: string,
): Promise<void> {
  const category = await db.query.Category.findFirst({
    where: and(eq(Category.id, categoryId), isNull(Category.deletedAt)),
    columns: { id: true, userId: true },
  });

  if (category) {
    if (category.userId === userId) return;

    const memberListIds = await getMemberListIds(db, userId);
    if (memberListIds.length > 0) {
      const sharedUse = await db.query.Task.findFirst({
        where: and(
          eq(Task.categoryId, categoryId),
          inArray(Task.listId, memberListIds),
          isNull(Task.deletedAt),
        ),
        columns: { id: true },
      });
      if (sharedUse) return;
    }
  }

  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Category not found",
  });
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

/**
 * Add whole months to a date, clamping the day-of-month to the last valid day
 * of the target month instead of overflowing (e.g. Jan 31 + 1 month lands on
 * Feb 28, not "Mar 3"). Preserves time-of-day.
 *
 * NOTE (F045): this clamps against the *previous* occurrence's day, not the
 * recurrence's original anchor day. Without additional state to carry the
 * original anchor (the schema has no such field, and looking it up via
 * recurrenceSourceId on every completion would add a query + assumes the
 * source task's original due date is still reachable), a task anchored on
 * the 31st will drift to the 28th/29th/30th once it passes through a short
 * month and stay there — it will not "jump back" to the 31st in a later long
 * month. This is an accepted simplification; preserving the true anchor is a
 * follow-up if it turns out to matter in practice.
 */
function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const next = new Date(date);
  next.setDate(1); // avoid month-overflow while advancing the month
  next.setMonth(next.getMonth() + months);
  const lastDayOfTargetMonth = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();
  next.setDate(Math.min(day, lastDayOfTargetMonth));
  return next;
}

/**
 * Calculate the next due date based on a recurrence rule and interval.
 * Extracted as a pure function so it can be unit tested directly (F045).
 *
 * NOTE (F014): this is plain local wall-clock `Date` arithmetic with no
 * explicit timezone anchor. Across a DST transition the resulting
 * time-of-day can shift by an hour (e.g. a 9am reminder recurring over a
 * clock change). Accepted as a simplification — a full timezone-aware
 * recurrence system is out of scope here.
 */
export function getNextDueDate(
  currentDueDate: Date | null,
  rule: string,
  interval: number,
): Date {
  const base = currentDueDate ?? new Date();

  switch (rule) {
    case "monthly":
      return addMonthsClamped(base, interval);
    case "yearly":
      return addMonthsClamped(base, interval * 12);
    case "weekly": {
      const next = new Date(base);
      next.setDate(next.getDate() + 7 * interval);
      return next;
    }
    case "daily":
    case "custom":
    default: {
      // "custom" and the fallback both treat `interval` as a day count.
      const next = new Date(base);
      next.setDate(next.getDate() + interval);
      return next;
    }
  }
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
      // Trash is expected to stay small (auto-archived tasks age out, and
      // deleteForever/restore keep it churning); a sane cap avoids an
      // unbounded scan rather than building full pagination (F033).
      limit: 500,
      with: { category: true, subtasks: true, list: true },
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
          isNull(Task.deletedAt),
          isNull(Task.archivedAt),
        ),
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

      // If assigning to a category, verify the user may use it
      if (taskInput.categoryId) {
        await assertCategoryAccess(
          ctx.db,
          taskInput.categoryId,
          ctx.session.user.id,
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
        where: and(
          eq(Task.id, id),
          isNull(Task.deletedAt),
          isNull(Task.archivedAt),
        ),
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

      // If reassigning to a category, verify the user may use it. An
      // unchanged categoryId is skipped — edit forms resubmit the full task,
      // and a co-member must not be blocked by a category they merely kept.
      if (
        updates.categoryId !== undefined &&
        updates.categoryId !== null &&
        updates.categoryId !== existing.categoryId
      ) {
        await assertCategoryAccess(ctx.db, updates.categoryId, userId);
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

      // Reset reminderSentAt only when reminderAt actually changes — edit
      // forms resubmit every field, and re-arming on a no-op value would
      // re-fire an already-delivered reminder after any unrelated edit.
      if (
        updates.reminderAt !== undefined &&
        (updates.reminderAt?.getTime() ?? null) !==
          (existing.reminderAt?.getTime() ?? null)
      ) {
        updateData.reminderSentAt = null;
      }

      // Wrap the completion update + next-occurrence insert in one
      // transaction (F022): previously the next-occurrence insert was a
      // fire-and-forget `void insert(...).catch(console.error)` outside any
      // transaction, so a failure there silently dropped the next
      // occurrence while the completion update still committed. Now both
      // commit together or neither does.
      // F013: a completion transition is guarded by `completed = false` in
      // the UPDATE's WHERE so two concurrent completions cannot both fire
      // the next-occurrence insert and the completion push.
      const isCompletionTransition =
        updates.completed === true && !existing.completed;

      const { row: task, completionRaced } = await ctx.db.transaction(
        async (tx) => {
          const [updated] = await tx
            .update(Task)
            .set(updateData)
            .where(
              isCompletionTransition
                ? and(eq(Task.id, id), eq(Task.completed, false))
                : eq(Task.id, id),
            )
            .returning();

          if (!updated) {
            if (isCompletionTransition) {
              // A concurrent request already completed this task; return
              // the current row and fire no duplicate side-effects.
              const current = await tx.query.Task.findFirst({
                where: eq(Task.id, id),
              });
              if (current) return { row: current, completionRaced: true };
            }
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Task not found or update failed",
            });
          }

          // Auto-create next recurring task when completing a recurring task
          if (isCompletionTransition && existing.recurrenceRule) {
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

              // Snooze the next occurrence until its due date if it's in
              // the future — prevents clutter when completing recurring
              // tasks early. Clamped to the next reminder time: the
              // reminder cron skips snoozed tasks, so snoozing past
              // reminderAt would swallow the reminder until the due date.
              const now = new Date();
              const startOfDueDate = new Date(nextDueDate);
              startOfDueDate.setHours(0, 0, 0, 0);
              const snoozeTarget =
                nextReminderAt && nextReminderAt < startOfDueDate
                  ? nextReminderAt
                  : startOfDueDate;
              const snoozedUntil = snoozeTarget > now ? snoozeTarget : null;

              await tx.insert(Task).values({
                // The series stays owned by its original owner even when a
                // shared-list co-member completes an occurrence.
                userId: existing.userId,
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
              });
            }
          }

          return { row: updated, completionRaced: false };
        },
      );

      // Notify other shared list members (fire-and-forget, best-effort —
      // deliberately outside the transaction above; a push failure must
      // never roll back an already-committed task update).
      if (existing.listId) {
        const notifyParams = {
          listId: existing.listId,
          actorUserId: userId,
          actorName: ctx.session.user.name,
          taskId: id,
          taskTitle: task.title,
        };

        if (isCompletionTransition && !completionRaced) {
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
        where: and(
          eq(Task.id, input),
          isNull(Task.deletedAt),
          isNull(Task.archivedAt),
        ),
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

  // Restore a soft-deleted task (used by the delete undo action)
  restore: protectedProcedure
    .input(z.uuid())
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Fetch the trashed/archived task to check access
      const existing = await ctx.db.query.Task.findFirst({
        where: and(
          eq(Task.id, input),
          or(isNotNull(Task.deletedAt), isNotNull(Task.archivedAt)),
        ),
        columns: {
          userId: true,
          listId: true,
          deletedAt: true,
          archivedAt: true,
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
          message: "Not authorized to restore this task",
        });
      }

      // Un-complete tasks that were auto-archived (not user-deleted) —
      // otherwise the archive cron would re-archive them on its next run.
      const wasArchivedOnly =
        existing.archivedAt !== null && existing.deletedAt === null;

      const newDate = new Date();
      await ctx.db
        .update(Task)
        .set({
          deletedAt: null,
          archivedAt: null,
          lastSyncedAt: newDate,
          ...(wasArchivedOnly ? { completed: false, completedAt: null } : {}),
        })
        .where(eq(Task.id, input));

      return { success: true };
    }),

  // Permanently delete a trashed or archived task (irreversible). Subtasks
  // cascade via the Subtask.taskId FK (onDelete: "cascade").
  deleteForever: protectedProcedure
    .input(z.uuid())
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Only hard-delete rows the user owns that are already trashed or
      // archived — never an active task.
      const deleted = await ctx.db
        .delete(Task)
        .where(
          and(
            eq(Task.id, input),
            eq(Task.userId, userId),
            or(isNotNull(Task.deletedAt), isNotNull(Task.archivedAt)),
          ),
        )
        .returning({ id: Task.id });

      if (deleted.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      return { success: true };
    }),

  // Bulk soft delete tasks
  deleteMany: protectedProcedure
    .input(z.array(z.uuid()).min(1).max(100))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const existingTasks = await ctx.db.query.Task.findMany({
        where: and(
          inArray(Task.id, input),
          isNull(Task.deletedAt),
          isNull(Task.archivedAt),
        ),
        columns: { id: true, userId: true, listId: true },
      });
      // Dedupe listIds so each shared list is only access-checked once,
      // instead of once per task (F029).
      const listIdsToCheck = new Set<string>();
      for (const task of existingTasks) {
        if (task.listId) {
          listIdsToCheck.add(task.listId);
        } else if (task.userId !== userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized",
          });
        }
      }
      for (const listId of listIdsToCheck) {
        await assertListAccess(ctx.db, userId, listId, "editor");
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
        where: and(
          eq(Task.id, input.id),
          isNull(Task.deletedAt),
          isNull(Task.archivedAt),
        ),
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

      // F109/F011: snoozing must NEVER overwrite reminderAt. reminderAt is
      // the user's true reminder time and is also the anchor the recurring
      // next-occurrence generator derives its offset from — overwriting it
      // with the snooze target corrupted that offset for every future
      // occurrence, and left `unsnooze` with a bogus reminderAt to "restore"
      // (there was nothing coherent to restore it to). Instead, snoozing is
      // expressed purely via snoozedUntil: the reminders-due query (see
      // lib/reminders.ts) skips any task whose snoozedUntil is still in the
      // future, and reminderSentAt is reset here so that once the snooze
      // window elapses, the *original* reminder re-fires exactly once
      // (rather than firing early while still snoozed, or never firing
      // again because it was already marked sent).
      const [task] = await ctx.db
        .update(Task)
        .set({
          snoozedUntil: input.snoozedUntil,
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
        where: and(
          eq(Task.id, input.id),
          isNull(Task.deletedAt),
          isNull(Task.archivedAt),
        ),
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

      // F011: reminderAt is intentionally left untouched — since `snooze`
      // no longer overwrites it (see above), there's no corrupted state to
      // restore here. Clearing snoozedUntil is sufficient: if the
      // underlying reminderAt is already due and reminderSentAt is null
      // (reset by the snooze call), the next cron tick delivers it
      // immediately, which is the correct "un-snoozed" behavior.
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
