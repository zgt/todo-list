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

    // 3. Filter out stale operations and construct payload with local data
    const validOperations: SyncQueueItem[] = [];
    const tasks = operations
      .map((op) => {
        const localData = localTasks.find((t) => t.id === op.entityId);

        if (!localData) {
          // Task not found in local DB
          if (op.operation === "delete") {
            // For delete operations, try to use queue payload if it has version info
            const payload: unknown =
              typeof op.payload === "string"
                ? JSON.parse(op.payload)
                : op.payload;

            // Type guard for delete payload
            const isValidDeletePayload = (
              p: unknown,
            ): p is {
              updatedAt: string | number | Date;
              localVersion: number;
              serverVersion: number;
            } => {
              return (
                p !== null &&
                typeof p === "object" &&
                "updatedAt" in p &&
                "localVersion" in p &&
                "serverVersion" in p &&
                typeof (p as { localVersion: unknown }).localVersion ===
                  "number" &&
                typeof (p as { serverVersion: unknown }).serverVersion ===
                  "number"
              );
            };

            if (isValidDeletePayload(payload)) {
              // We have version info in payload - can still send delete
              console.log(
                `Task ${op.entityId} not in local DB, using queue payload for delete`,
              );
              validOperations.push(op);
              return {
                id: op.entityId,
                operation: op.operation as "delete",
                data: {
                  updatedAt: new Date(payload.updatedAt),
                  localVersion: payload.localVersion,
                  serverVersion: payload.serverVersion,
                },
              };
            } else {
              // No version info - task might be already deleted on server
              console.log(
                `Task ${op.entityId} not found and no version info in payload, removing from queue`,
              );
              void this.removeFromQueue(op.id);
              return null;
            }
          } else {
            // For create/update without local data, operation is stale
            console.warn(
              `Stale ${op.operation} operation for task ${op.entityId}, removing from queue`,
            );
            void this.removeFromQueue(op.id);
            return null;
          }
        }

        // Track valid operations for later error handling
        validOperations.push(op);

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
          completedAt: localData.completedAt
            ? new Date(localData.completedAt)
            : null,
          archivedAt: localData.archivedAt
            ? new Date(localData.archivedAt)
            : null,
          deletedAt: localData.deletedAt ? new Date(localData.deletedAt) : null,
          dueDate: localData.dueDate ? new Date(localData.dueDate) : null,
          lastSyncedAt: localData.lastSyncedAt
            ? new Date(localData.lastSyncedAt)
            : null,
        };

        return {
          id: op.entityId,
          operation: op.operation,
          data,
        };
      })
      .filter((task) => task !== null);

    // Skip API call if no valid tasks to sync
    if (tasks.length === 0) {
      console.log("No valid tasks to sync after filtering");
      return;
    }

    try {
      // Call tRPC sync.push endpoint
      const result = await vanillaTrpc.sync.push.mutate({ tasks });

      // Handle successful operations
      for (const success of result.successful) {
        const queueItem = validOperations.find(
          (op) => op.entityId === success.id,
        );
        if (queueItem) {
          await this.removeFromQueue(queueItem.id);
          console.log(`Successfully synced task ${success.id}`);
        }
      }

      // Handle conflicts
      for (const conflict of result.conflicts) {
        const queueItem = validOperations.find(
          (op) => op.entityId === conflict.id,
        );
        if (queueItem) {
          await this.handleConflict(queueItem, conflict);
        }
      }

      // Handle failures
      for (const failure of result.failures) {
        const queueItem = validOperations.find(
          (op) => op.entityId === failure.id,
        );
        if (queueItem) {
          await this.handleFailure(queueItem, failure.error);
        }
      }
    } catch (error) {
      console.error("Batch sync failed:", error);

      // Increment retry count for all valid items
      for (const operation of validOperations) {
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
    conflict: {
      id: string;
      serverVersion: number;
      serverData: { version: number; [key: string]: unknown };
    },
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

    const firstItem = item[0];
    if (!firstItem) return;

    const retryCount = firstItem.retryCount + 1;

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
