import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq, sql } from "@acme/db";
import {
  CreateSubtaskSchema,
  Subtask,
  Task,
  UpdateSubtaskSchema,
} from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

export const subtaskRouter = {
  // Get all subtasks for a task
  byTaskId: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify task ownership
      const task = await ctx.db.query.Task.findFirst({
        where: and(
          eq(Task.id, input.taskId),
          eq(Task.userId, ctx.session.user.id),
        ),
      });

      if (!task) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Task not found or access denied",
        });
      }

      return ctx.db.query.Subtask.findMany({
        where: eq(Subtask.taskId, input.taskId),
        orderBy: (subtask, { asc }) => [asc(subtask.sortOrder)],
      });
    }),

  // Create a new subtask
  create: protectedProcedure
    .input(CreateSubtaskSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify task ownership
      const task = await ctx.db.query.Task.findFirst({
        where: and(
          eq(Task.id, input.taskId),
          eq(Task.userId, ctx.session.user.id),
        ),
      });

      if (!task) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Task not found or access denied",
        });
      }

      // Get max sortOrder for this task
      const [maxResult] = await ctx.db
        .select({ max: sql<number>`coalesce(max(${Subtask.sortOrder}), -1)` })
        .from(Subtask)
        .where(eq(Subtask.taskId, input.taskId));

      const nextOrder = (maxResult?.max ?? -1) + 1;

      const [subtask] = await ctx.db
        .insert(Subtask)
        .values({
          ...input,
          sortOrder: nextOrder,
        })
        .returning();

      if (!subtask) {
        throw new Error("Failed to create subtask");
      }

      return subtask;
    }),

  // Update an existing subtask
  update: protectedProcedure
    .input(UpdateSubtaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      // Verify ownership via join: subtask → task → check userId
      const existing = await ctx.db.query.Subtask.findFirst({
        where: eq(Subtask.id, id),
        with: { task: true },
      });

      if (!existing || existing.task.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Subtask not found or access denied",
        });
      }

      const updateData: Record<string, unknown> = { ...updates };

      // Handle completedAt logic
      if (updates.completed !== undefined) {
        if (updates.completed && !existing.completed) {
          updateData.completedAt = new Date();
        } else if (!updates.completed) {
          updateData.completedAt = null;
        }
      }

      const [subtask] = await ctx.db
        .update(Subtask)
        .set(updateData)
        .where(eq(Subtask.id, id))
        .returning();

      if (!subtask) {
        throw new Error("Failed to update subtask");
      }

      return subtask;
    }),

  // Delete a subtask
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership via join
      const existing = await ctx.db.query.Subtask.findFirst({
        where: eq(Subtask.id, input.id),
        with: { task: true },
      });

      if (!existing || existing.task.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Subtask not found or access denied",
        });
      }

      await ctx.db.delete(Subtask).where(eq(Subtask.id, input.id));

      return { success: true };
    }),

  // Reorder subtasks within a task
  reorder: protectedProcedure
    .input(
      z.object({
        taskId: z.string().uuid(),
        subtaskIds: z.array(z.string().uuid()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify task ownership
      const task = await ctx.db.query.Task.findFirst({
        where: and(
          eq(Task.id, input.taskId),
          eq(Task.userId, ctx.session.user.id),
        ),
      });

      if (!task) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Task not found or access denied",
        });
      }

      // Update each subtask's sortOrder in a transaction
      await ctx.db.transaction(async (tx) => {
        await Promise.all(
          input.subtaskIds.map((subtaskId, index) =>
            tx
              .update(Subtask)
              .set({ sortOrder: index })
              .where(
                and(
                  eq(Subtask.id, subtaskId),
                  eq(Subtask.taskId, input.taskId),
                ),
              ),
          ),
        );
      });

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
