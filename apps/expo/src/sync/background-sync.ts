import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";

import { syncManager } from "./manager";

// Define the task name export
export const BACKGROUND_SYNC_TASK = "background-sync";

// Define the background sync task
// This must be called in the global scope or very early in startup
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log("Background sync started");
    await syncManager.fullSync();
    console.log("Background sync completed");
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error("Background sync failed:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
console.log("Background sync task defined");

/**
 * Register background sync task
 */
export async function registerBackgroundSync(): Promise<void> {
  try {
    // Task is already defined at top level

    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
      console.log(
        "Background sync skipped: Not available in this environment (e.g. Expo Go)",
      );
      return;
    }

    return BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes (minimum allowed by iOS)
    });
    console.log("Background sync registered");
  } catch (error) {
    console.error("Failed to register background sync:", error);
  }
}

/**
 * Unregister background sync task
 */
export async function unregisterBackgroundSync(): Promise<void> {
  try {
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log("Background sync unregistered");
  } catch (error) {
    console.error("Failed to unregister background sync:", error);
  }
}

/**
 * Check if background sync is registered
 */
export async function isBackgroundSyncRegistered(): Promise<boolean> {
  const status = await BackgroundTask.getStatusAsync();
  const isRegistered =
    await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);

  console.log(`Background fetch status: ${status}`);
  console.log(`Background sync registered: ${isRegistered}`);

  return (
    isRegistered && status === BackgroundTask.BackgroundTaskStatus.Available
  );
}
