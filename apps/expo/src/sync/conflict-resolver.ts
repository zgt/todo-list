import type { LocalTask } from "~/db/client";

export class ConflictResolver {
  /**
   * Resolve conflict between local and server versions
   * Strategy: Last-write-wins based on updatedAt timestamp
   */
  resolve(localTask: LocalTask, serverTask: any): Partial<LocalTask> {
    const localTimestamp = localTask.updatedAt.getTime();
    const serverTimestamp = new Date(serverTask.updatedAt).getTime();

    console.log(`Resolving conflict for task ${localTask.id}`);
    console.log(
      `Local: ${new Date(localTimestamp)}, Server: ${new Date(serverTimestamp)}`,
    );

    // Server wins only if timestamp is newer (local wins on equal to prevent infinite conflicts)
    if (serverTimestamp > localTimestamp) {
      console.log("Server wins (newer timestamp)");
      return {
        ...serverTask,
        syncStatus: "synced" as const,
        lastSyncedAt: new Date(),
        serverVersion: serverTask.version,
        localVersion: serverTask.version,
      };
    } else {
      console.log("Local wins (newer timestamp)");
      // Keep local changes, mark as pending for next sync
      return {
        syncStatus: "pending" as const,
        serverVersion: serverTask.version,
      };
    }
  }

  /**
   * Detect if a conflict exists
   */
  hasConflict(localTask: LocalTask, serverTask: any): boolean {
    // Conflict exists if:
    // 1. Local has pending changes (syncStatus === "pending")
    // 2. Server version is different from local server version
    return (
      localTask.syncStatus === "pending" &&
      localTask.serverVersion !== serverTask.version
    );
  }
}
