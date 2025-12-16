import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, desc, eq, gt, isNull } from "@acme/db";
import { Task } from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

/**
 * Sync Router
 *
 * Handles bidirectional synchronization between SQLite (Expo mobile) and Supabase (backend).
 *
 * Architecture:
 * - Mobile maintains local SQLite cache with sync metadata
 * - Backend is the source of truth (Supabase)
 * - Conflict resolution: Last-write-wins based on updatedAt timestamp
 * - Version tracking prevents lost updates
 */

// Input schema for sync.push
const SyncPushTaskSchema = z.object({
  id: z.string().uuid(),
  operation: z.enum(["create", "update", "delete"]),
  data: z.object({
    title: z.string().max(500).optional(),
    description: z.string().max(5000).nullable().optional(),
    completed: z.boolean().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    dueDate: z.date().nullable().optional(),
    createdAt: z.date().optional(),
    completedAt: z.date().nullable().optional(),
    archivedAt: z.date().nullable().optional(),
    deletedAt: z.date().nullable().optional(),
    updatedAt: z.date(),
    localVersion: z.number().int(),
    serverVersion: z.number().int(),
  }),
});

const SyncPushInputSchema = z.object({
  tasks: z.array(SyncPushTaskSchema),
});

const SyncPullInputSchema = z.object({
  lastSyncTimestamp: z.number().int(),
  entityTypes: z.array(z.enum(["task"])),
});

export const syncRouter = {
  /**
   * Push batched operations from mobile to server
   *
   * Processes create, update, and delete operations from the mobile sync queue.
   * Implements conflict detection using version numbers and last-write-wins strategy.
   *
   * Returns:
   * - successful: Operations applied successfully
   * - conflicts: Operations with version conflicts (client should re-pull)
   * - failures: Operations that failed with error messages
   */
  push: protectedProcedure
    .input(SyncPushInputSchema)
    .mutation(async ({ ctx, input }) => {
      const results = {
        successful: [] as Array<{ id: string }>,
        conflicts: [] as Array<{ id: string; serverVersion: number; serverData: any }>,
        failures: [] as Array<{ id: string; error: string }>,
      };

      for (const taskOp of input.tasks) {
        try {
          const { id, operation, data } = taskOp;

          // Fetch current server state
          const serverTask = await ctx.db.query.Task.findFirst({
            where: and(eq(Task.id, id), eq(Task.userId, ctx.session.user.id)),
          });

          if (operation === "create") {
            // CREATE operation
            if (serverTask) {
              // Task already exists on server - possible duplicate or conflict
              results.conflicts.push({
                id,
                serverVersion: serverTask.version,
                serverData: serverTask,
              });
              continue;
            }

            // Create new task
            const [newTask] = await ctx.db
              .insert(Task)
              .values({
                id,
                userId: ctx.session.user.id,
                title: data.title ?? "Untitled",
                description: data.description ?? null,
                completed: data.completed ?? false,
                categoryId: data.categoryId ?? null,
                dueDate: data.dueDate ?? null,
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
            // UPDATE operation
            if (!serverTask) {
              results.failures.push({ id, error: "Task not found on server" });
              continue;
            }

            // Check for version conflict
            if (serverTask.version !== data.serverVersion) {
              // Server has newer version - conflict detected
              results.conflicts.push({
                id,
                serverVersion: serverTask.version,
                serverData: serverTask,
              });
              continue;
            }

            // Apply last-write-wins based on updatedAt timestamp
            const serverUpdatedAt = new Date(serverTask.updatedAt as string | number | Date);
            const clientUpdatedAt = data.updatedAt;

            if (serverUpdatedAt > clientUpdatedAt) {
              // Server is newer - conflict
              results.conflicts.push({
                id,
                serverVersion: serverTask.version,
                serverData: serverTask,
              });
              continue;
            }

            // Client wins - apply update
            const updateData: Record<string, unknown> = {
              version: serverTask.version + 1,
              updatedAt: new Date(),
              lastSyncedAt: new Date(),
            };

            // Copy fields from client data
            if (data.title !== undefined) updateData.title = data.title;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.completed !== undefined) {
              updateData.completed = data.completed;
              // Auto-set completedAt based on completed status
              if (data.completedAt === undefined) {
                updateData.completedAt = data.completed ? new Date() : null;
              }
            }
            if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;
            if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
            if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
            if (data.archivedAt !== undefined) updateData.archivedAt = data.archivedAt;
            if (data.deletedAt !== undefined) updateData.deletedAt = data.deletedAt;

            const [updatedTask] = await ctx.db
              .update(Task)
              .set(updateData)
              .where(and(eq(Task.id, id), eq(Task.userId, ctx.session.user.id)))
              .returning();

            if (!updatedTask) {
              results.failures.push({ id, error: "Failed to update task" });
              continue;
            }

            results.successful.push({ id });
          } else if (operation === "delete") {
            // DELETE operation (soft delete)
            if (!serverTask) {
              // Already deleted or doesn't exist - consider successful
              results.successful.push({ id });
              continue;
            }

            // Check for version conflict
            if (serverTask.version !== data.serverVersion) {
              results.conflicts.push({
                id,
                serverVersion: serverTask.version,
                serverData: serverTask,
              });
              continue;
            }

            // Soft delete
            const [deletedTask] = await ctx.db
              .update(Task)
              .set({
                deletedAt: new Date(),
                version: serverTask.version + 1,
                updatedAt: new Date(),
                lastSyncedAt: new Date(),
              })
              .where(and(eq(Task.id, id), eq(Task.userId, ctx.session.user.id)))
              .returning();

            if (!deletedTask) {
              results.failures.push({ id, error: "Failed to delete task" });
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
   * Returns all tasks modified after lastSyncTimestamp for the current user.
   * Includes soft-deleted tasks so mobile can remove them from local cache.
   *
   * Mobile should:
   * 1. Apply these changes to local SQLite
   * 2. Detect conflicts with pending local changes
   * 3. Update lastSyncTimestamp in sync_meta table
   */
  pull: protectedProcedure
    .input(SyncPullInputSchema)
    .query(async ({ ctx, input }) => {
      const { lastSyncTimestamp, entityTypes } = input;

      const results: { tasks: any[] } = {
        tasks: [],
      };

      // Only process tasks for MVP
      if (entityTypes.includes("task")) {
        const lastSyncDate = new Date(lastSyncTimestamp);

        // Fetch all tasks modified after lastSyncTimestamp
        // Include deleted tasks so mobile can clean them up
        const tasks = await ctx.db.query.Task.findMany({
          where: and(
            eq(Task.userId, ctx.session.user.id),
            gt(Task.updatedAt, lastSyncDate),
          ),
          orderBy: [desc(Task.updatedAt)],
          limit: 1000, // Prevent excessive data transfer
          with: { category: true },
        });

        // Ensure dates are proper Date objects for SuperJSON serialization
        results.tasks = tasks.map((task) => ({
          ...task,
          createdAt: new Date(task.createdAt as string | number | Date),
          updatedAt: task.updatedAt ? new Date(task.updatedAt as string | number | Date) : new Date(),
          dueDate: task.dueDate ? new Date(task.dueDate as string | number | Date) : null,
          completedAt: task.completedAt ? new Date(task.completedAt as string | number | Date) : null,
          archivedAt: task.archivedAt ? new Date(task.archivedAt as string | number | Date) : null,
          deletedAt: task.deletedAt ? new Date(task.deletedAt as string | number | Date) : null,
          lastSyncedAt: task.lastSyncedAt ? new Date(task.lastSyncedAt as string | number | Date) : null,
        }));

        console.log(
          `[Sync] Pull: Returning ${results.tasks.length} tasks modified since ${lastSyncDate.toISOString()}`,
        );
      }

      return results;
    }),
} satisfies TRPCRouterRecord;
