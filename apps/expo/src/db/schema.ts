import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Local Task table (mirrors Supabase + sync metadata)
export const localTask = sqliteTable("local_task", {
  // Core fields (from Supabase schema)
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  categoryId: text("category_id"), // FK to category
  dueDate: integer("due_date", { mode: "timestamp" }),
  orderIndex: integer("order_index"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),

  // Sync metadata (local only)
  syncStatus: text("sync_status", {
    enum: ["synced", "pending", "conflict"],
  })
    .notNull()
    .default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  localVersion: integer("local_version").notNull().default(1),
  serverVersion: integer("server_version").notNull().default(1),
});

// Local Category table
export const localCategory = sqliteTable("local_category", {
  // Core fields
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),

  // Sync metadata
  syncStatus: text("sync_status", {
    enum: ["synced", "pending", "conflict"],
  })
    .notNull()
    .default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  localVersion: integer("local_version").notNull().default(1),
  serverVersion: integer("server_version").notNull().default(1),
});

// Sync Queue table
export const syncQueue = sqliteTable("sync_queue", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type", {
    enum: ["task", "category", "list", "tag"],
  }).notNull(),
  entityId: text("entity_id").notNull(),
  operation: text("operation", {
    enum: ["create", "update", "delete"],
  }).notNull(),
  payload: text("payload").notNull(), // JSON string of the entity data
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  lastAttemptAt: integer("last_attempt_at", { mode: "timestamp" }),
  error: text("error"),
});

// Sync metadata table
export const syncMeta = sqliteTable("sync_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
