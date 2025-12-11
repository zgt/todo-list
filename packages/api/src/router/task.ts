import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { and, desc, eq, isNull } from "@acme/db";
import { CreateTaskSchema, Task, UpdateTaskSchema } from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

export const taskRouter = {
  // Get all non-deleted tasks for current user
  all: protectedProcedure.query(async ({ ctx }) => {
    const tasks = await ctx.db.query.Task.findMany({
      where: and(
        eq(Task.userId, ctx.session.user.id),
        isNull(Task.deletedAt),
      ),
      orderBy: [desc(Task.createdAt)],
      limit: 100,
    });

    // Ensure dates are proper Date objects for SuperJSON serialization
    return tasks.map((task) => ({
      ...task,
      createdAt: new Date(task.createdAt),
      updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
      completedAt: task.completedAt ? new Date(task.completedAt) : null,
      archivedAt: task.archivedAt ? new Date(task.archivedAt) : null,
      deletedAt: task.deletedAt ? new Date(task.deletedAt) : null,
      lastSyncedAt: task.lastSyncedAt ? new Date(task.lastSyncedAt) : null,
    }));
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
      });

      if (!task) return null;

      // Ensure dates are proper Date objects for SuperJSON serialization
      return {
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
        completedAt: task.completedAt ? new Date(task.completedAt) : null,
        archivedAt: task.archivedAt ? new Date(task.archivedAt) : null,
        deletedAt: task.deletedAt ? new Date(task.deletedAt) : null,
        lastSyncedAt: task.lastSyncedAt ? new Date(task.lastSyncedAt) : null,
      };
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

      // Ensure dates are proper Date objects for SuperJSON serialization
      return {
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
        completedAt: task.completedAt ? new Date(task.completedAt) : null,
        archivedAt: task.archivedAt ? new Date(task.archivedAt) : null,
        deletedAt: task.deletedAt ? new Date(task.deletedAt) : null,
        lastSyncedAt: task.lastSyncedAt ? new Date(task.lastSyncedAt) : null,
      };
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

      if (updates.completed !== undefined) {
        updateData.completedAt = updates.completed ? new Date() : null;
      }

      const [task] = await ctx.db
        .update(Task)
        .set(updateData)
        .where(and(eq(Task.id, id), eq(Task.userId, ctx.session.user.id)))
        .returning();

      if (!task) {
        throw new Error("Task not found or update failed");
      }

      // Ensure dates are proper Date objects for SuperJSON serialization
      return {
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
        completedAt: task.completedAt ? new Date(task.completedAt) : null,
        archivedAt: task.archivedAt ? new Date(task.archivedAt) : null,
        deletedAt: task.deletedAt ? new Date(task.deletedAt) : null,
        lastSyncedAt: task.lastSyncedAt ? new Date(task.lastSyncedAt) : null,
      };
    }),

  // Soft delete task
  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(Task)
        .set({
          deletedAt: new Date(),
          lastSyncedAt: new Date(),
        })
        .where(and(eq(Task.id, input), eq(Task.userId, ctx.session.user.id)));

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
