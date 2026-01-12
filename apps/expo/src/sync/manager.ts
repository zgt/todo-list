import NetInfo from "@react-native-community/netinfo";
import { eq } from "drizzle-orm";

import { db } from "~/db/client";
import { localTask, syncMeta, syncQueue } from "~/db/schema";
import { vanillaTrpc } from "~/utils/api";
import { ConflictResolver } from "./conflict-resolver";
import { QueueProcessor } from "./queue-processor";

export class SyncManager {
  private queueProcessor: QueueProcessor;
  private conflictResolver: ConflictResolver;
  private syncInProgress = false;
  private syncCompletionCallbacks: (() => void)[] = [];

  constructor() {
    this.queueProcessor = new QueueProcessor(db);
    this.conflictResolver = new ConflictResolver();
  }

  /**
   * Register a callback to be called when sync completes
   */
  onSyncComplete(callback: () => void): () => void {
    this.syncCompletionCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      this.syncCompletionCallbacks = this.syncCompletionCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  /**
   * Notify all registered callbacks that sync has completed
   */
  private notifySyncComplete(): void {
    this.syncCompletionCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("Sync completion callback error:", error);
      }
    });
  }

  /**
   * Queue a local operation for sync
   */
  async queueOperation(
    entityType: "task" | "list" | "tag",
    entityId: string,
    operation: "create" | "update" | "delete",
    payload: Record<string, unknown>,
  ): Promise<void> {
    await db.insert(syncQueue).values({
      entityType,
      entityId,
      operation,
      payload: JSON.stringify(payload),
      retryCount: 0,
      createdAt: new Date(),
      lastAttemptAt: null,
      error: null,
    });

    console.log(`Queued ${operation} for ${entityType}:${entityId}`);

    // Trigger sync if online
    await this.processSyncQueue();
  }

  /**
   * Process the sync queue (push local changes to server)
   */
  async processSyncQueue(): Promise<void> {
    if (this.syncInProgress) {
      console.log("Sync already in progress, skipping...");
      return;
    }

    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log("No network connection, sync deferred");
      return;
    }

    this.syncInProgress = true;

    try {
      await this.queueProcessor.processBatch();
      console.log("Sync queue processed successfully");
    } catch (error) {
      console.error("Sync queue processing failed:", error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Ensure sync_meta table has last_sync_timestamp initialized
   */
  private async ensureSyncMetaInitialized(): Promise<void> {
    const existing = await db
      .select()
      .from(syncMeta)
      .where(eq(syncMeta.key, "last_sync_timestamp"))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(syncMeta).values({
        key: "last_sync_timestamp",
        value: "0",
        updatedAt: new Date(),
      });
      console.log("Initialized last_sync_timestamp to 0");
    }
  }

  /**
   * Pull changes from server and update local cache
   */
  async pullFromServer(): Promise<void> {
    // Ensure sync_meta is initialized
    await this.ensureSyncMetaInitialized();

    // Get last sync timestamp
    const lastSyncResult = await db
      .select({ value: syncMeta.value })
      .from(syncMeta)
      .where(eq(syncMeta.key, "last_sync_timestamp"))
      .limit(1);

    const lastSyncTimestamp = lastSyncResult[0]
      ? parseInt(lastSyncResult[0].value, 10)
      : 0;

    console.log(
      `Pulling changes since ${new Date(lastSyncTimestamp).toISOString()}`,
    );

    try {
      // Fetch changes from server
      const serverChanges = await vanillaTrpc.sync.pull.query({
        lastSyncTimestamp,
        entityTypes: ["task"], // MVP: only tasks
      });

      console.log(
        `📥 Received ${serverChanges.tasks.length} tasks from server`,
      );

      // Apply server changes to local database
      for (const task of serverChanges.tasks) {
        await this.applyServerTask(
          task as {
            id: string;
            deletedAt?: Date | null;
            version: number;
            updatedAt: Date | string | number;
            [key: string]: unknown;
          },
        );
      }

      // Update last sync timestamp
      await db
        .update(syncMeta)
        .set({
          value: Date.now().toString(),
          updatedAt: new Date(),
        })
        .where(eq(syncMeta.key, "last_sync_timestamp"));

      console.log(
        `✅ Pull from server completed: ${serverChanges.tasks.length} tasks synced`,
      );
    } catch (error) {
      console.error("❌ Pull from server failed:", error);
      throw error;
    }
  }

  /**
   * Apply a server task to local database
   */
  private async applyServerTask(serverTask: {
    id: string;
    deletedAt?: Date | null;
    version: number;
    updatedAt: Date | string | number;
    [key: string]: unknown;
  }): Promise<void> {
    const existingTask = await db
      .select()
      .from(localTask)
      .where(eq(localTask.id, serverTask.id))
      .limit(1);

    if (serverTask.deletedAt) {
      // Server deleted this task
      if (existingTask.length > 0) {
        await db.delete(localTask).where(eq(localTask.id, serverTask.id));
      }
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const localData = {
      ...serverTask,
      syncStatus: "synced" as const,
      lastSyncedAt: new Date(),
      serverVersion: serverTask.version,
      localVersion: serverTask.version,
      // Type assertion needed because serverTask contains all required fields from API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    if (existingTask.length === 0) {
      // New task from server
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await db.insert(localTask).values(localData);
      console.log(`✅ Inserted new task from server: ${serverTask.id}`);
    } else {
      // Check for conflicts
      const existing = existingTask[0];
      if (!existing) return;

      if (existing.syncStatus === "pending") {
        // Conflict: local has pending changes
        const resolved = this.conflictResolver.resolve(existing, serverTask);
        await db
          .update(localTask)
          .set(resolved)
          .where(eq(localTask.id, serverTask.id));
        console.log(`🔄 Resolved conflict for task: ${serverTask.id}`);
      } else {
        // No conflict, apply server changes
        await db
          .update(localTask)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          .set(localData)
          .where(eq(localTask.id, serverTask.id));
        console.log(`📝 Updated task from server: ${serverTask.id}`);
      }
    }
  }

  /**
   * Full sync: push queue + pull changes
   */
  async fullSync(): Promise<void> {
    console.log("Starting full sync...");

    try {
      // Step 1: Push local changes to server FIRST
      // This ensures pending deletes/updates reach the server before pull overwrites them
      await this.processSyncQueue();
    } catch (error) {
      console.error("Process sync queue failed:", error);
      // Don't throw - allow pull to still happen
    }

    try {
      // Step 2: Pull server changes (gets latest state after our push)
      await this.pullFromServer();
    } catch (error) {
      console.error("Pull from server failed:", error);
      // Don't throw - sync will retry on next trigger
    }

    console.log("Full sync complete");

    // Notify all listeners that sync has completed
    this.notifySyncComplete();
  }

  /**
   * Get queue processor for statistics
   */
  get queueStats() {
    return this.queueProcessor;
  }
}

// Export singleton instance
export const syncManager = new SyncManager();
