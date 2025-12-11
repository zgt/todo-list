import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { and, asc, desc, eq, isNull } from "@acme/db";
import { Category, CreateCategorySchema } from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

export const categoryRouter = {
  // Get all non-deleted categories for current user
  all: protectedProcedure.query(async ({ ctx }) => {
    const categories = await ctx.db.query.Category.findMany({
      where: and(
        eq(Category.userId, ctx.session.user.id),
        isNull(Category.deletedAt),
      ),
      orderBy: [asc(Category.sortOrder), desc(Category.createdAt)],
    });

    // Ensure dates are proper Date objects for SuperJSON serialization
    return categories.map((category) => ({
      ...category,
      createdAt: new Date(category.createdAt),
      updatedAt: category.updatedAt ? new Date(category.updatedAt) : null,
      deletedAt: category.deletedAt ? new Date(category.deletedAt) : null,
    }));
  }),

  // Get single category by ID
  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.db.query.Category.findFirst({
        where: and(
          eq(Category.id, input.id),
          eq(Category.userId, ctx.session.user.id),
          isNull(Category.deletedAt),
        ),
      });

      if (!category) return null;

      // Ensure dates are proper Date objects for SuperJSON serialization
      return {
        ...category,
        createdAt: new Date(category.createdAt),
        updatedAt: category.updatedAt ? new Date(category.updatedAt) : null,
        deletedAt: category.deletedAt ? new Date(category.deletedAt) : null,
      };
    }),

  // Create new category
  create: protectedProcedure
    .input(CreateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const [category] = await ctx.db
        .insert(Category)
        .values({
          ...input,
          userId: ctx.session.user.id,
        })
        .returning();

      if (!category) {
        throw new Error("Failed to create category");
      }

      // Ensure dates are proper Date objects for SuperJSON serialization
      return {
        ...category,
        createdAt: new Date(category.createdAt),
        updatedAt: category.updatedAt ? new Date(category.updatedAt) : null,
        deletedAt: category.deletedAt ? new Date(category.deletedAt) : null,
      };
    }),

  // Soft delete category
  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(Category)
        .set({
          deletedAt: new Date(),
        })
        .where(
          and(eq(Category.id, input), eq(Category.userId, ctx.session.user.id)),
        );

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
