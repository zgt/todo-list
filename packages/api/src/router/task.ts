import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { and, desc, eq, isNull } from "@acme/db";
import { CreateTaskSchema, Task, UpdateTaskSchema } from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

export const taskRouter = {
  // Get all non-deleted tasks for current user
  all: protectedProcedure.query(({ ctx }) => {
    return ctx.db.query.Task.findMany({
      where: and(
        eq(Task.userId, ctx.session.user.id),
        isNull(Task.deletedAt),
      ),
      orderBy: [desc(Task.createdAt)],
      limit: 100,
    });
  }),

  // Get single task by ID
  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return ctx.db.query.Task.findFirst({
        where: and(
          eq(Task.id, input.id),
          eq(Task.userId, ctx.session.user.id),
          isNull(Task.deletedAt),
        ),
      });
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
      return task;
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

      return task;
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
