import { openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";

import * as schema from "./schema";

export const DB_NAME = "todo-app-v4.db";

// Open SQLite database
const expoDb = openDatabaseSync(DB_NAME);

// Create Drizzle instance
export const db = drizzle(expoDb, { schema });

// Export types
export type Database = typeof db;
export type LocalTask = typeof schema.localTask.$inferSelect;
export type NewLocalTask = typeof schema.localTask.$inferInsert;
export type LocalCategory = typeof schema.localCategory.$inferSelect;
export type NewLocalCategory = typeof schema.localCategory.$inferInsert;
export type SyncQueueItem = typeof schema.syncQueue.$inferSelect;
export type NewSyncQueueItem = typeof schema.syncQueue.$inferInsert;
export type SyncMeta = typeof schema.syncMeta.$inferSelect;
