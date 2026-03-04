import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

import type { WidgetTask } from "~/utils/widget";
import {
  clearPendingWidgetActions,
  getPendingWidgetActions,
  syncWidget,
} from "~/utils/widget";

/**
 * Hook to sync task data to the iOS widget.
 * Automatically syncs when tasks change, with debouncing to prevent excessive updates.
 *
 * @param tasks - Array of tasks to sync to the widget
 * @param enabled - Whether syncing is enabled (default: true)
 */
export function useWidgetSync(tasks: WidgetTask[], enabled = true): void {
  const lastSyncRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || tasks.length === 0) {
      return;
    }

    // Clear any pending sync
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce: wait 500ms after last change before syncing
    timeoutRef.current = setTimeout(() => {
      const now = Date.now();

      // Rate limit: don't sync more than once per second
      if (now - lastSyncRef.current < 1000) {
        return;
      }

      lastSyncRef.current = now;
      void syncWidget(tasks);
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [tasks, enabled]);
}

/**
 * Hook to process pending widget actions (e.g., task toggles from interactive widget).
 * Reads the pending actions queue from UserDefaults on app foreground and syncs to server.
 */
export function useWidgetActions(
  updateTaskMutation: (args: {
    id: string;
    completed: boolean;
  }) => Promise<unknown>,
  invalidateQueries: () => Promise<void>,
) {
  const processingRef = useRef(false);

  useEffect(() => {
    const handleAppState = async (state: AppStateStatus) => {
      if (state !== "active" || processingRef.current) return;
      processingRef.current = true;

      try {
        const actions = getPendingWidgetActions();
        if (actions.length === 0) return;

        // Process each pending action
        for (const action of actions) {
          await updateTaskMutation({
            id: action.taskId,
            completed: action.completed,
          });
        }

        clearPendingWidgetActions();
        await invalidateQueries();
      } catch (error) {
        console.warn("[Widget] Failed to process pending actions:", error);
      } finally {
        processingRef.current = false;
      }
    };

    // Process on mount (app just opened)
    void handleAppState("active");

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [updateTaskMutation, invalidateQueries]);
}

// Re-export for manual sync needs
export { syncWidget } from "~/utils/widget";
