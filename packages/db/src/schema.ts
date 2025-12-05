import { sql } from "drizzle-orm";
import { index, pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { user } from "./auth-schema";

export const Post = pgTable("post", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  title: t.varchar({ length: 256 }).notNull(),
  content: t.text().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const CreatePostSchema = createInsertSchema(Post, {
  title: z.string().max(256),
  content: z.string().max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const Task = pgTable(
  "task",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: t.varchar({ length: 500 }).notNull(),
    description: t.text(),
    completed: t.boolean().notNull().default(false),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true, mode: "date" })
      .$onUpdateFn(() => sql`now()`),
    completedAt: t.timestamp("completed_at", { withTimezone: true }),
    orderIndex: t.integer("order_index"),
    deletedAt: t.timestamp("deleted_at", { withTimezone: true }),
    lastSyncedAt: t.timestamp("last_synced_at", { withTimezone: true }),
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
  ],
);

export const CreateTaskSchema = createInsertSchema(Task, {
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  orderIndex: true,
  deletedAt: true,
  lastSyncedAt: true,
});

export const UpdateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  completed: z.boolean().optional(),
  orderIndex: z.number().int().optional(),
});

export * from "./auth-schema";
