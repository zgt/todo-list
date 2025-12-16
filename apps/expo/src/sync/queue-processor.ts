import { eq, inArray, lte } from "drizzle-orm";

import type { Database, SyncQueueItem } from "~/db/client";
import { localTask, syncQueue } from "~/db/schema";
import { vanillaTrpc } from "~/utils/api";

const MAX_RETRY_COUNT = 5;
const MAX_BATCH_SIZE = 50;
const BACKOFF_BASE_MS = 1000;

export class QueueProcessor {
  constructor(private db: Database) {}

  /**
   * Process a batch of queued operations
   */
  async processBatch(): Promise<void> {
    // Get pending items (not yet at max retry count)
    const queueItems = await this.db
      .select()
      .from(syncQueue)
      .where(lte(syncQueue.retryCount, MAX_RETRY_COUNT))
      .limit(MAX_BATCH_SIZE);

    if (queueItems.length === 0) {
      console.log("No items in sync queue");
      return;
    }

    console.log(`Processing ${queueItems.length} items from sync queue`);

    // Group by entity type for batch operations
    const taskOperations = queueItems.filter(
      (item) => item.entityType === "task",
    );

    // Process tasks
    if (taskOperations.length > 0) {
      await this.processTaskBatch(taskOperations);
    }

    // TODO: Process lists and tags (Phase 2)
  }

  /**
   * Process a batch of task operations
   */
  private async processTaskBatch(operations: SyncQueueItem[]): Promise<void> {
    // 1. Get all task IDs (including deletes - they might be soft deleted in local DB)
    const allTaskIds = operations.map((op) => op.entityId);

    // 2. Fetch current task data from local DB
    let localTasks: (typeof localTask.$inferSelect)[] = [];
    if (allTaskIds.length > 0) {
      localTasks = await this.db
        .select()
        .from(localTask)
        .where(inArray(localTask.id, allTaskIds));
    }

    // 3. Construct payload with local data
    const tasks = operations.map((op) => {
      const localData = localTasks.find((t) => t.id === op.entityId);

      if (!localData) {
        // This shouldn't happen - local task should exist
        throw new Error(
          `Local task ${op.entityId} not found for ${op.operation} operation`,
        );
      }

      if (op.operation === "delete") {
        // Delete needs version fields for conflict detection
        return {
          id: op.entityId,
          operation: op.operation as "delete",
          data: {
            updatedAt: localData.updatedAt,
            localVersion: localData.localVersion,
            serverVersion: localData.serverVersion,
          },
        };
      }

      // For create/update, send full local data
      // Ensure dates are Date objects (SQLite might return them as strings)
      const data = {
        ...localData,
        createdAt: new Date(localData.createdAt),
        updatedAt: new Date(localData.updatedAt),
        completedAt: localData.completedAt ? new Date(localData.completedAt) : null,
        archivedAt: localData.archivedAt ? new Date(localData.archivedAt) : null,
        deletedAt: localData.deletedAt ? new Date(localData.deletedAt) : null,
        dueDate: localData.dueDate ? new Date(localData.dueDate) : null,
        lastSyncedAt: localData.lastSyncedAt ? new Date(localData.lastSyncedAt) : null,
      };

      return {
        id: op.entityId,
        operation: op.operation as "create" | "update",
        data,
      };
    });

    try {
      // Call tRPC sync.push endpoint
      // Cast to any to bypass strict client-side type checks that might expect full data even for deletes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await vanillaTrpc.sync.push.mutate({ tasks } as any);

      // Handle successful operations
      for (const success of result.successful) {
        const queueItem = operations.find((op) => op.entityId === success.id);
        if (queueItem) {
          await this.removeFromQueue(queueItem.id);
          console.log(`Successfully synced task ${success.id}`);
        }
      }

      // Handle conflicts
      for (const conflict of result.conflicts) {
        const queueItem = operations.find((op) => op.entityId === conflict.id);
        if (queueItem) {
          await this.handleConflict(queueItem, conflict);
        }
      }

      // Handle failures
      for (const failure of result.failures) {
        const queueItem = operations.find((op) => op.entityId === failure.id);
        if (queueItem) {
          await this.handleFailure(queueItem, failure.error);
        }
      }
    } catch (error) {
      console.error("Batch sync failed:", error);

      // Increment retry count for all items
      for (const operation of operations) {
        await this.incrementRetryCount(
          operation.id,
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }
  }

  /**
   * Remove successfully synced item from queue
   */
  private async removeFromQueue(queueId: number): Promise<void> {
    await this.db.delete(syncQueue).where(eq(syncQueue.id, queueId));
  }

  /**
   * Handle sync conflict
   */
  private async handleConflict(
    queueItem: SyncQueueItem,
    conflict: { id: string; serverVersion: number; serverData: any },
  ): Promise<void> {
    console.warn(`Conflict detected for task ${queueItem.entityId}`);

    // Mark as conflict in local database
    await this.db
      .update(localTask)
      .set({
        syncStatus: "conflict",
        serverVersion: conflict.serverVersion,
      })
      .where(eq(localTask.id, queueItem.entityId));

    // Remove from queue (conflict needs manual resolution)
    await this.removeFromQueue(queueItem.id);
  }

  /**
   * Handle sync failure with exponential backoff
   */
  private async handleFailure(
    queueItem: SyncQueueItem,
    error: string,
  ): Promise<void> {
    await this.incrementRetryCount(queueItem.id, error);
  }

  /**
   * Increment retry count with exponential backoff
   */
  private async incrementRetryCount(
    queueId: number,
    error: string,
  ): Promise<void> {
    const item = await this.db
      .select()
      .from(syncQueue)
      .where(eq(syncQueue.id, queueId))
      .limit(1);

    if (item.length === 0) return;

    const retryCount = item[0]!.retryCount + 1;

    if (retryCount > MAX_RETRY_COUNT) {
      console.error(`Max retries exceeded for queue item ${queueId}`);
      // TODO: Notify user of permanent failure
    }

    await this.db
      .update(syncQueue)
      .set({
        retryCount,
        lastAttemptAt: new Date(),
        error,
      })
      .where(eq(syncQueue.id, queueId));

    // Calculate backoff delay
    const backoffMs = BACKOFF_BASE_MS * Math.pow(2, retryCount - 1);
    console.log(
      `Will retry in ${backoffMs}ms (attempt ${retryCount}/${MAX_RETRY_COUNT})`,
    );
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    failed: number;
    total: number;
  }> {
    const items = await this.db.select().from(syncQueue);

    return {
      total: items.length,
      pending: items.filter((i) => i.retryCount < MAX_RETRY_COUNT).length,
      failed: items.filter((i) => i.retryCount >= MAX_RETRY_COUNT).length,
    };
  }
}
