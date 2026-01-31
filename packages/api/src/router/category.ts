import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, arrayContains, asc, desc, eq, inArray, isNull, ne, sql } from "@acme/db";
import {
  Category,
  CreateCategorySchema,
  Task,
  UpdateCategorySchema,
} from "@acme/db/schema";

import { protectedProcedure } from "../trpc";

/** Ensure dates are proper Date objects for SuperJSON serialization */
function serializeCategory<T extends { createdAt: Date; updatedAt: Date | null; deletedAt: Date | null }>(category: T) {
  return {
    ...category,
    createdAt: new Date(category.createdAt),
    updatedAt: category.updatedAt ? new Date(category.updatedAt) : null,
    deletedAt: category.deletedAt ? new Date(category.deletedAt) : null,
  };
}

export const categoryRouter = {
  // Get all non-deleted categories for current user
  all: protectedProcedure.query(async ({ ctx }) => {
    const categories = await ctx.db.query.Category.findMany({
      where: and(
        eq(Category.userId, ctx.session.user.id),
        isNull(Category.deletedAt),
      ),
      orderBy: [asc(Category.depth), asc(Category.sortOrder), desc(Category.createdAt)],
    });

    const nameMap = new Map(categories.map((c) => [c.id, c.name]));

    return categories.map((c) => ({
      ...serializeCategory(c),
      path: [...new Set(c.path)].map((id) => nameMap.get(id) ?? id),
    }));
  }),

  // Get category tree (roots with nested children)
  tree: protectedProcedure.query(async ({ ctx }) => {
    const categories = await ctx.db.query.Category.findMany({
      where: and(
        eq(Category.userId, ctx.session.user.id),
        isNull(Category.deletedAt),
      ),
      orderBy: [asc(Category.sortOrder), desc(Category.createdAt)],
    });

    const nameMap = new Map(categories.map((c) => [c.id, c.name]));

    // Build tree in memory
    const map = new Map<string, CatNode>();
    type CatNode = Omit<(typeof categories)[number], "path"> & {
      path: string[];
      children: CatNode[];
    };
    const roots: CatNode[] = [];

    for (const cat of categories) {
      map.set(cat.id, {
        ...cat,
        path: [...new Set(cat.path)].map((id) => nameMap.get(id) ?? id),
        children: [],
      });
    }

    for (const cat of categories) {
      const node = map.get(cat.id)!;
      if (cat.parentId) {
        const parent = map.get(cat.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          // Parent not found (deleted?), treat as root
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    return roots;
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

      // To get names in path, we need to fetch all ancestors
      if (category.path.length > 0) {
        const ancestors = await ctx.db.query.Category.findMany({
          where: and(
            inArray(Category.id, category.path),
            eq(Category.userId, ctx.session.user.id),
          ),
          columns: { id: true, name: true },
        });
        const nameMap = new Map(ancestors.map((a) => [a.id, a.name]));
        return {
          ...serializeCategory(category),
          path: [...new Set(category.path)].map((id) => nameMap.get(id) ?? id),
        };
      }

      return serializeCategory(category);
    }),

  // Get breadcrumb trail for a category
  breadcrumbs: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        taskId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      let categoryId = input.id;

      if (!categoryId && input.taskId) {
        const task = await ctx.db.query.Task.findFirst({
          where: and(
            eq(Task.id, input.taskId),
            eq(Task.userId, ctx.session.user.id),
          ),
          columns: { categoryId: true },
        });
        categoryId = task?.categoryId ?? undefined;
      }

      if (!categoryId) return [];

      const category = await ctx.db.query.Category.findFirst({
        where: and(
          eq(Category.id, categoryId),
          eq(Category.userId, ctx.session.user.id),
          isNull(Category.deletedAt),
        ),
      });

      if (!category) return [];

      // path contains ancestor IDs in order; fetch them all
      const ancestorIds = category.path;
      if (ancestorIds.length === 0) {
        return [
          {
            id: category.id,
            name: category.name,
            color: category.color,
            icon: category.icon,
          },
        ];
      }

      const ancestors = await ctx.db.query.Category.findMany({
        where: and(
          inArray(Category.id, ancestorIds),
          eq(Category.userId, ctx.session.user.id),
        ),
        columns: { id: true, name: true, color: true, icon: true },
      });

      // Sort by their position in the path array
      const orderMap = new Map(category.path.map((id, i) => [id, i]));
      const sorted = [...ancestors].sort(
        (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
      );

      // Append current category at the end
      sorted.push({
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
      });

      return sorted;
    }),

  // Create new category
  create: protectedProcedure
    .input(CreateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      let path: string[] = [];
      let depth = 0;

      if (input.parentId) {
        // Validate parent exists and belongs to user
        const parent = await ctx.db.query.Category.findFirst({
          where: and(
            eq(Category.id, input.parentId),
            eq(Category.userId, ctx.session.user.id),
            isNull(Category.deletedAt),
          ),
        });

        if (!parent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent category not found",
          });
        }

        path = [...parent.path, parent.id];
        depth = parent.depth + 1;

        // Mark parent as non-leaf
        if (parent.isLeaf) {
          await ctx.db
            .update(Category)
            .set({ isLeaf: false })
            .where(eq(Category.id, parent.id));
        }
      }

      const [category] = await ctx.db
        .insert(Category)
        .values({
          ...input,
          userId: ctx.session.user.id,
          path,
          depth,
          isLeaf: true,
        })
        .returning();

      if (!category) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create category",
        });
      }

      return serializeCategory(category);
    }),

  // Update category (including reparenting)
  update: protectedProcedure
    .input(UpdateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const { id, parentId, ...rest } = input;

      // Fetch current category
      const current = await ctx.db.query.Category.findFirst({
        where: and(
          eq(Category.id, id),
          eq(Category.userId, ctx.session.user.id),
          isNull(Category.deletedAt),
        ),
      });

      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
      }

      // Handle reparenting if parentId is being changed
      if (parentId !== undefined && parentId !== current.parentId) {
        let newPath: string[] = [];
        let newDepth = 0;

        if (parentId !== null) {
          // Prevent setting self as parent
          if (parentId === id) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Category cannot be its own parent",
            });
          }

          const newParent = await ctx.db.query.Category.findFirst({
            where: and(
              eq(Category.id, parentId),
              eq(Category.userId, ctx.session.user.id),
              isNull(Category.deletedAt),
            ),
          });

          if (!newParent) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Parent category not found" });
          }

          // Prevent circular reference: new parent must not be a descendant of this category
          if (newParent.path.includes(id)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot move category under its own descendant",
            });
          }

          newPath = [...newParent.path, newParent.id];
          newDepth = newParent.depth + 1;

          // Mark new parent as non-leaf
          if (newParent.isLeaf) {
            await ctx.db
              .update(Category)
              .set({ isLeaf: false })
              .where(eq(Category.id, newParent.id));
          }
        }

        const depthDiff = newDepth - current.depth;

        // Update this category
        await ctx.db
          .update(Category)
          .set({ ...rest, parentId, path: newPath, depth: newDepth })
          .where(eq(Category.id, id));

        // Update all descendants: replace old path prefix with new path prefix
        const descendants = await ctx.db.query.Category.findMany({
          where: and(
            eq(Category.userId, ctx.session.user.id),
            arrayContains(Category.path, [id]),
          ),
        });

        for (const child of descendants) {
          // Replace the portion of path up to and including `id` with new path + id
          const idxInPath = child.path.indexOf(id);
          const descendantSuffix = child.path.slice(idxInPath + 1);
          const updatedPath = [...newPath, id, ...descendantSuffix];

          await ctx.db
            .update(Category)
            .set({ path: updatedPath, depth: child.depth + depthDiff })
            .where(eq(Category.id, child.id));
        }

        // Check if old parent still has children
        if (current.parentId) {
          const oldParentChildCount = await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(Category)
            .where(
              and(
                eq(Category.parentId, current.parentId),
                eq(Category.userId, ctx.session.user.id),
                isNull(Category.deletedAt),
                ne(Category.id, id),
              ),
            );

          if (oldParentChildCount[0] && Number(oldParentChildCount[0].count) === 0) {
            await ctx.db
              .update(Category)
              .set({ isLeaf: true })
              .where(eq(Category.id, current.parentId));
          }
        }
      } else {
        // Simple update without reparenting
        const updateData: Record<string, unknown> = { ...rest };
        if (Object.keys(updateData).length > 0) {
          await ctx.db
            .update(Category)
            .set(updateData)
            .where(
              and(eq(Category.id, id), eq(Category.userId, ctx.session.user.id)),
            );
        }
      }

      const updated = await ctx.db.query.Category.findFirst({
        where: eq(Category.id, id),
      });

      if (!updated) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch updated category" });
      }

      return serializeCategory(updated);
    }),

  // Soft delete category (and all descendants)
  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.db.query.Category.findFirst({
        where: and(
          eq(Category.id, input),
          eq(Category.userId, ctx.session.user.id),
          isNull(Category.deletedAt),
        ),
      });

      if (!category) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
      }

      const now = new Date();

      // Soft-delete this category and all descendants
      // Descendants have this category's id in their path
      await ctx.db
        .update(Category)
        .set({ deletedAt: now })
        .where(
          and(
            eq(Category.userId, ctx.session.user.id),
            isNull(Category.deletedAt),
            arrayContains(Category.path, [input]),
          ),
        );

      // Also soft-delete the category itself
      await ctx.db
        .update(Category)
        .set({ deletedAt: now })
        .where(eq(Category.id, input));

      // Update parent's isLeaf if needed
      if (category.parentId) {
        const siblingCount = await ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(Category)
          .where(
            and(
              eq(Category.parentId, category.parentId),
              eq(Category.userId, ctx.session.user.id),
              isNull(Category.deletedAt),
              ne(Category.id, input),
            ),
          );

        if (siblingCount[0] && Number(siblingCount[0].count) === 0) {
          await ctx.db
            .update(Category)
            .set({ isLeaf: true })
            .where(eq(Category.id, category.parentId));
        }
      }

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
