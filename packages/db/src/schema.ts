import { relations, sql } from "drizzle-orm";
import { check, index, pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { user } from "./auth-schema";

export const TaskPriority = z.enum(["high", "medium", "low"]);
export type TaskPriority = z.infer<typeof TaskPriority>;

export const Post = pgTable("post", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  title: t.varchar({ length: 256 }).notNull(),
  content: t.text().notNull(),
  createdAt: t
    .timestamp({ withTimezone: true, mode: "date" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
}));

export const CreatePostSchema = createInsertSchema(Post, {
  title: z.string().max(256),
  content: z.string().max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const Category = pgTable(
  "category",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    parentId: t
      .uuid("parent_id")
      // Self-reference requires explicit type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .references((): any => Category.id, { onDelete: "cascade" }),
    name: t.varchar({ length: 100 }).notNull(),
    color: t.varchar({ length: 7 }).notNull(), // Hex color code
    icon: t.varchar({ length: 50 }),
    sortOrder: t.integer("sort_order").notNull().default(0),
    path: t
      .uuid("path")
      .array()
      .notNull()
      .default(sql`ARRAY[]::uuid[]`),
    depth: t.integer().notNull().default(0),
    isLeaf: t.boolean("is_leaf").notNull().default(true),
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    deletedAt: t.timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  }),
  (table) => [
    index("category_user_id_idx").on(table.userId),
    index("category_user_id_sort_order_idx").on(table.userId, table.sortOrder),
    index("category_parent_id_idx").on(table.parentId),
    index("category_user_id_path_idx").on(table.userId, table.path),
    index("category_user_id_depth_idx").on(table.userId, table.depth),
    check(
      "category_no_self_reference",
      sql`${table.parentId} IS NULL OR ${table.parentId} != ${table.id}`,
    ),
  ],
);

export const Task = pgTable(
  "task",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    categoryId: t
      .uuid("category_id")
      .references(() => Category.id, { onDelete: "set null" }),
    title: t.varchar({ length: 500 }).notNull(),
    description: t.text(),
    completed: t.boolean().notNull().default(false),
    dueDate: t.timestamp("due_date", { withTimezone: true, mode: "date" }),
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    completedAt: t.timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
    archivedAt: t.timestamp("archived_at", {
      withTimezone: true,
      mode: "date",
    }),
    priority: t.varchar({ length: 10 }).default("medium"),
    orderIndex: t.integer("order_index"),
    version: t.integer().notNull().default(1),
    deletedAt: t.timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    lastSyncedAt: t.timestamp("last_synced_at", {
      withTimezone: true,
      mode: "date",
    }),
  }),
  (table) => [
    index("task_user_id_deleted_at_order_idx").on(
      table.userId,
      table.deletedAt,
      table.orderIndex,
    ),
    index("task_user_id_completed_created_idx").on(
      table.userId,
      table.completed,
      table.createdAt,
    ),
    index("task_user_id_archived_at_idx").on(table.userId, table.archivedAt),
    index("task_category_id_idx").on(table.categoryId),
    index("task_user_id_priority_completed_idx").on(
      table.userId,
      table.priority,
      table.completed,
    ),
    check(
      "task_priority_valid",
      sql`${table.priority} IS NULL OR ${table.priority} IN ('high', 'medium', 'low')`,
    ),
  ],
);

export const CreateTaskSchema = createInsertSchema(Task, {
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
  categoryId: z.string().uuid().optional(),
  dueDate: z.date().optional(),
  priority: TaskPriority.optional().default("medium"),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  archivedAt: true,
  orderIndex: true,
  version: true,
  deletedAt: true,
  lastSyncedAt: true,
});

export const UpdateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  completed: z.boolean().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  dueDate: z.date().nullable().optional(),
  priority: TaskPriority.nullable().optional(),
  orderIndex: z.number().int().optional(),
  createdAt: z.date().optional(),
  completedAt: z.date().nullable().optional(),
  archivedAt: z.date().nullable().optional(),
  deletedAt: z.date().nullable().optional(),
});

export const CreateCategorySchema = createInsertSchema(Category, {
  name: z.string().min(1, "Name is required").max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().optional(),
  parentId: z.string().uuid().optional(),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  path: true,
  depth: true,
  isLeaf: true,
});

export const UpdateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .optional(),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const categoryRelations = relations(Category, ({ one, many }) => ({
  parent: one(Category, {
    fields: [Category.parentId],
    references: [Category.id],
    relationName: "categoryParentChild",
  }),
  children: many(Category, {
    relationName: "categoryParentChild",
  }),
  tasks: many(Task),
}));

export const taskRelations = relations(Task, ({ one }) => ({
  category: one(Category, {
    fields: [Task.categoryId],
    references: [Category.id],
  }),
}));

export * from "./auth-schema";
