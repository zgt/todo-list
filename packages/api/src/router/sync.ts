import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, asc, eq, gt, inArray, isNull, or } from "@acme/db";
import {
  Category,
  RecurrenceRule,
  Task,
  TaskListMember,
  TaskPriority,
} from "@acme/db/schema";

import { assertListAccess } from "../lib/list-access";
import { computeNextCursor } from "../lib/sync-cursor";
import { protectedProcedure } from "../trpc";

type TaskType = typeof Task.$inferSelect;

/**
 * Sync Router
 *
 * Handles bidirectional synchronization between SQLite (Expo mobile) and Supabase (backend).
 *
 * Architecture:
 * - Mobile maintains local SQLite cache with sync metadata
 * - Backend is the source of truth (Supabase)
 * - Conflict resolution: server version is authoritative (atomic conditional
 *   update), not client-supplied timestamps — clock skew must never stall a
 *   valid edit or mask a real conflict
 *
 * Guard parity: push/pull enforce the same authorization the online task.ts
 * router does — ownership OR editor+ role on the task's shared list (see
 * `../lib/list-access`). See AUDIT.md findings G001/G004/G008/G014/G017/
 * F001/F019/F020 for the history behind these guards.
 */

// Caps the number of ops a single push can carry (G014) — keeps the batch's
// existence/category lookups and worst-case sequential writes bounded.
const MAX_PUSH_BATCH = 500;

// Rows returned per pull page (G004) — paired with keyset pagination so
// tasks beyond this page are never silently dropped.
const PULL_PAGE_SIZE = 1000;

// Input schema for sync.push
export const SyncPushTaskSchema = z.object({
  id: z.string().uuid(),
  operation: z.enum(["create", "update", "delete"]),
  data: z.object({
    title: z.string().max(500).optional(),
    description: z.string().max(5000).nullable().optional(),
    completed: z.boolean().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    listId: z.string().uuid().nullable().optional(),
    dueDate: z.date().nullable().optional(),
    priority: TaskPriority.nullable().optional(),
    orderIndex: z.number().int().nullable().optional(),
    reminderAt: z.date().nullable().optional(),
    recurrenceRule: RecurrenceRule.nullable().optional(),
    recurrenceInterval: z.number().int().min(1).max(365).nullable().optional(),
    recurrenceEndDate: z.date().nullable().optional(),
    createdAt: z.date().optional(),
    completedAt: z.date().nullable().optional(),
    archivedAt: z.date().nullable().optional(),
    // Accepted on the wire (a `delete` op sets this server-side) but never
    // trusted on the `update` branch — see G008 below.
    deletedAt: z.date().nullable().optional(),
    updatedAt: z.date(),
    localVersion: z.number().int(),
    serverVersion: z.number().int(),
  }),
});

export const SyncPushInputSchema = z.object({
  tasks: z.array(SyncPushTaskSchema).max(MAX_PUSH_BATCH),
});

export const SyncPullInputSchema = z.object({
  lastSyncTimestamp: z.number().int(),
  // Tiebreak id for keyset pagination (G004). Omit/null on a client's very
  // first pull for a given lastSyncTimestamp.
  cursorId: z.string().uuid().nullable().optional(),
  entityTypes: z.array(z.enum(["task"])),
});

/** Get all list IDs the user is a member of (mirrors task.ts's helper of the
 * same name — duplicated here since task.ts doesn't export it). Owners are
 * auto-added as members on list creation (see task-list.ts `create`), so
 * this also covers lists the user owns. */
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

function serializeTaskDates(task: TaskType) {
  return {
    ...task,
    createdAt: new Date(task.createdAt),
    updatedAt: task.updatedAt ? new Date(task.updatedAt) : new Date(),
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    completedAt: task.completedAt ? new Date(task.completedAt) : null,
    archivedAt: task.archivedAt ? new Date(task.archivedAt) : null,
    deletedAt: task.deletedAt ? new Date(task.deletedAt) : null,
    lastSyncedAt: task.lastSyncedAt ? new Date(task.lastSyncedAt) : null,
  };
}

export const syncRouter = {
  /**
   * Push batched operations from mobile to server
   *
   * Processes create, update, and delete operations from the mobile sync queue.
   * Implements conflict detection using an atomic conditional update keyed on
   * the server version number (F001/F019) — never app-level read-then-write,
   * and never a comparison against client-supplied timestamps.
   *
   * Returns:
   * - successful: Operations applied successfully
   * - conflicts: Operations with version conflicts (client should re-pull)
   * - failures: Operations that failed with error messages
   */
  push: protectedProcedure
    .input(SyncPushInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const results = {
        successful: [] as { id: string }[],
        conflicts: [] as {
          id: string;
          serverVersion: number;
          serverData: TaskType;
        }[],
        failures: [] as { id: string; error: string }[],
      };

      if (input.tasks.length === 0) {
        return results;
      }

      // G014: one batched existence lookup instead of N sequential
      // `findFirst` round trips.
      const ids = input.tasks.map((t) => t.id);
      const existingRows = await ctx.db.query.Task.findMany({
        where: inArray(Task.id, ids),
      });
      const existingById = new Map(existingRows.map((t) => [t.id, t]));

      // F020: batch-validate every categoryId referenced in this push once,
      // instead of trusting client-supplied categoryId per task.
      const categoryIds = [
        ...new Set(
          input.tasks
            .map((t) => t.data.categoryId)
            .filter((id): id is string => !!id),
        ),
      ];
      const categoryRows = categoryIds.length
        ? await ctx.db.query.Category.findMany({
            where: inArray(Category.id, categoryIds),
          })
        : [];
      const categoryById = new Map(categoryRows.map((c) => [c.id, c]));

      const isCategoryValid = (categoryId: string | null | undefined) => {
        if (!categoryId) return true; // null/undefined clears the category
        const category = categoryById.get(categoryId);
        return (
          !!category &&
          category.userId === userId &&
          category.deletedAt === null
        );
      };

      // G001/G017: cache list-access checks per listId — a batch commonly
      // touches the same shared list from several tasks.
      const listAccessCache = new Map<string, string | null>();

      async function checkEditorAccess(listId: string): Promise<string | null> {
        if (listAccessCache.has(listId)) {
          return listAccessCache.get(listId) ?? null;
        }
        try {
          await assertListAccess(ctx.db, userId, listId, "editor");
          listAccessCache.set(listId, null);
          return null;
        } catch (err) {
          const message =
            err instanceof TRPCError ? err.message : "Not authorized";
          listAccessCache.set(listId, message);
          return message;
        }
      }

      /** G001: authorize a write to an existing task — owner, or editor on
       * its list (mirrors task.ts update/delete). */
      async function authorizeWrite(task: TaskType): Promise<string | null> {
        if (task.userId === userId) return null;
        if (task.listId) return checkEditorAccess(task.listId);
        return "Not authorized";
      }

      for (const taskOp of input.tasks) {
        try {
          const { id, operation, data } = taskOp;
          const serverTask = existingById.get(id);

          if (operation === "create") {
            if (serverTask) {
              // Task already exists on server - possible duplicate or
              // conflict. Only reveal the row to callers who could write it;
              // otherwise any authenticated user could read arbitrary task
              // rows by pushing known UUIDs as "create" ops.
              const authError = await authorizeWrite(serverTask);
              if (authError) {
                results.failures.push({
                  id,
                  error: "Task not found on server",
                });
                continue;
              }
              results.conflicts.push({
                id,
                serverVersion: serverTask.version,
                serverData: serverTask,
              });
              continue;
            }

            if (!isCategoryValid(data.categoryId)) {
              results.failures.push({
                id,
                error: "Category not found or not owned by user",
              });
              continue;
            }

            if (data.listId) {
              const accessError = await checkEditorAccess(data.listId);
              if (accessError) {
                results.failures.push({ id, error: accessError });
                continue;
              }
            }

            const [newTask] = await ctx.db
              .insert(Task)
              .values({
                id,
                userId,
                title: data.title ?? "Untitled",
                description: data.description ?? null,
                completed: data.completed ?? false,
                categoryId: data.categoryId ?? null,
                listId: data.listId ?? null,
                dueDate: data.dueDate ?? null,
                priority: data.priority ?? "medium",
                orderIndex: data.orderIndex ?? null,
                reminderAt: data.reminderAt ?? null,
                recurrenceRule: data.recurrenceRule ?? null,
                recurrenceInterval: data.recurrenceInterval ?? null,
                recurrenceEndDate: data.recurrenceEndDate ?? null,
                createdAt: data.createdAt ?? new Date(),
                completedAt: data.completedAt ?? null,
                archivedAt: data.archivedAt ?? null,
                deletedAt: data.deletedAt ?? null,
                version: 1,
                lastSyncedAt: new Date(),
              })
              .returning();

            if (!newTask) {
              results.failures.push({ id, error: "Failed to create task" });
              continue;
            }

            results.successful.push({ id });
          } else if (operation === "update") {
            // G008: a soft-deleted task is not-found for `update` purposes —
            // clients cannot resurrect or edit it this way. (An explicit
            // `delete` op below is the only path that touches deletedAt.)
            if (serverTask?.deletedAt !== null) {
              results.failures.push({ id, error: "Task not found on server" });
              continue;
            }

            // Same message as the missing-row case so an unauthorized caller
            // cannot use the difference as an existence oracle.
            const authError = await authorizeWrite(serverTask);
            if (authError) {
              results.failures.push({ id, error: "Task not found on server" });
              continue;
            }

            if (!isCategoryValid(data.categoryId)) {
              results.failures.push({
                id,
                error: "Category not found or not owned by user",
              });
              continue;
            }

            // Moving to a different list requires editor access on the
            // target list too (mirrors task.ts update).
            if (
              data.listId !== undefined &&
              data.listId !== null &&
              data.listId !== serverTask.listId
            ) {
              const accessError = await checkEditorAccess(data.listId);
              if (accessError) {
                results.failures.push({ id, error: accessError });
                continue;
              }
            }

            // Build the update payload. `data.deletedAt` is intentionally
            // never applied here (G008).
            const updateData: Record<string, unknown> = {
              updatedAt: new Date(),
              lastSyncedAt: new Date(),
            };

            if (data.title !== undefined) updateData.title = data.title;
            if (data.description !== undefined)
              updateData.description = data.description;
            if (data.completed !== undefined) {
              updateData.completed = data.completed;
              // Auto-set completedAt based on completed status
              if (data.completedAt === undefined) {
                updateData.completedAt = data.completed ? new Date() : null;
              }
            }
            if (data.completedAt !== undefined)
              updateData.completedAt = data.completedAt;
            if (data.categoryId !== undefined)
              updateData.categoryId = data.categoryId;
            if (data.listId !== undefined) updateData.listId = data.listId;
            if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
            if (data.priority !== undefined)
              updateData.priority = data.priority;
            if (data.orderIndex !== undefined)
              updateData.orderIndex = data.orderIndex;
            if (data.reminderAt !== undefined)
              updateData.reminderAt = data.reminderAt;
            if (data.recurrenceRule !== undefined)
              updateData.recurrenceRule = data.recurrenceRule;
            if (data.recurrenceInterval !== undefined)
              updateData.recurrenceInterval = data.recurrenceInterval;
            if (data.recurrenceEndDate !== undefined)
              updateData.recurrenceEndDate = data.recurrenceEndDate;
            if (data.archivedAt !== undefined)
              updateData.archivedAt = data.archivedAt;

            // F001/F019: atomic conditional update — the WHERE clause
            // itself enforces the version check, so there's no read-modify-
            // write race, and no comparison against client updatedAt.
            const [updatedTask] = await ctx.db
              .update(Task)
              .set({ ...updateData, version: serverTask.version + 1 })
              .where(
                and(
                  eq(Task.id, id),
                  eq(Task.version, data.serverVersion),
                  isNull(Task.deletedAt),
                ),
              )
              .returning();

            if (!updatedTask) {
              // 0 rows: version moved (or task got deleted) since our
              // batched read. Re-fetch to report the real conflict.
              const currentTask = await ctx.db.query.Task.findFirst({
                where: eq(Task.id, id),
              });
              if (currentTask) {
                results.conflicts.push({
                  id,
                  serverVersion: currentTask.version,
                  serverData: currentTask,
                });
              } else {
                results.failures.push({
                  id,
                  error: "Task not found on server",
                });
              }
              continue;
            }

            results.successful.push({ id });
          } else {
            // DELETE operation (soft delete)
            if (serverTask?.deletedAt !== null) {
              // Already deleted or doesn't exist - consider successful
              results.successful.push({ id });
              continue;
            }

            // Same message as the missing-row case — no existence oracle.
            const authError = await authorizeWrite(serverTask);
            if (authError) {
              results.failures.push({ id, error: "Task not found on server" });
              continue;
            }

            // F001/F019: same atomic conditional update as the update branch.
            const [deletedTask] = await ctx.db
              .update(Task)
              .set({
                deletedAt: new Date(),
                version: serverTask.version + 1,
                updatedAt: new Date(),
                lastSyncedAt: new Date(),
              })
              .where(
                and(
                  eq(Task.id, id),
                  eq(Task.version, data.serverVersion),
                  isNull(Task.deletedAt),
                ),
              )
              .returning();

            if (!deletedTask) {
              const currentTask = await ctx.db.query.Task.findFirst({
                where: eq(Task.id, id),
              });
              if (currentTask) {
                results.conflicts.push({
                  id,
                  serverVersion: currentTask.version,
                  serverData: currentTask,
                });
              } else {
                // Deleted concurrently by another op - idempotent success
                results.successful.push({ id });
              }
              continue;
            }

            results.successful.push({ id });
          }
        } catch (error) {
          console.error(`Sync push error for task ${taskOp.id}:`, error);
          results.failures.push({
            id: taskOp.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      console.log(
        `[Sync] Push processed: ${results.successful.length} successful, ${results.conflicts.length} conflicts, ${results.failures.length} failures`,
      );

      return results;
    }),

  /**
   * Pull changes from server since last sync timestamp
   *
   * Returns tasks the user owns OR that live in shared lists they're a
   * member of (G001), modified after the given cursor. Includes soft-deleted
   * tasks so mobile can remove them from local cache.
   *
   * Keyset-paginated (G004): ordered by (updatedAt, id) ascending, capped at
   * 1000 rows per page. The response's `nextCursor` is the only valid cursor
   * advance — the client must not substitute `Date.now()`, or tasks updated
   * after the request but within the same "page" would be skipped forever.
   *
   * Mobile should:
   * 1. Apply these changes to local SQLite
   * 2. Detect conflicts with pending local changes
   * 3. If `hasMore`, pull again using `nextCursor` before advancing past it
   * 4. Persist `nextCursor` as the new lastSyncTimestamp/cursorId
   */
  pull: protectedProcedure
    .input(SyncPullInputSchema)
    .query(async ({ ctx, input }) => {
      const { lastSyncTimestamp, cursorId, entityTypes } = input;
      const userId = ctx.session.user.id;

      const results: {
        tasks: TaskType[];
        nextCursor: { updatedAt: number; id: string } | null;
        hasMore: boolean;
      } = {
        tasks: [],
        nextCursor: null,
        hasMore: false,
      };

      // Only process tasks for MVP
      if (entityTypes.includes("task")) {
        const lastSyncDate = new Date(lastSyncTimestamp);

        // G001: mirror task.ts `all`'s visibility — own tasks (not in a
        // shared list), or any task in a list the user is a member of.
        // Owners are auto-added as members on list creation, so this also
        // covers lists the user owns.
        const memberListIds = await getMemberListIds(ctx.db, userId);
        const visibility =
          memberListIds.length > 0
            ? or(
                and(eq(Task.userId, userId), isNull(Task.listId)),
                inArray(Task.listId, memberListIds),
              )
            : eq(Task.userId, userId);

        // G004: keyset pagination on (updatedAt, id) instead of an unbounded
        // DESC/LIMIT window the client blindly advanced past.
        const cursorCondition = cursorId
          ? or(
              gt(Task.updatedAt, lastSyncDate),
              and(eq(Task.updatedAt, lastSyncDate), gt(Task.id, cursorId)),
            )
          : gt(Task.updatedAt, lastSyncDate);

        // Fetch one extra row to detect whether another page follows.
        const rows = await ctx.db.query.Task.findMany({
          where: and(visibility, cursorCondition),
          orderBy: [asc(Task.updatedAt), asc(Task.id)],
          limit: PULL_PAGE_SIZE + 1,
          with: { category: true },
        });

        const hasMore = rows.length > PULL_PAGE_SIZE;
        const page = hasMore ? rows.slice(0, PULL_PAGE_SIZE) : rows;

        results.tasks = page.map(serializeTaskDates);
        results.hasMore = hasMore;
        results.nextCursor = computeNextCursor(page);

        console.log(
          `[Sync] Pull: Returning ${results.tasks.length} tasks modified since ${lastSyncDate.toISOString()} (hasMore=${hasMore})`,
        );
      }

      return results;
    }),
} satisfies TRPCRouterRecord;
