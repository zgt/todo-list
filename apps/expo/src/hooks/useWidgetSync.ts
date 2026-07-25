import type { AppStateStatus } from "react-native";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { TRPCClientError } from "@trpc/client";

import type { AppRouter } from "@acme/api";

import type { PendingWidgetAction, WidgetTask } from "~/utils/widget";
import {
  getPendingWidgetActions,
  removePendingWidgetAction,
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
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trailingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Clear any pending debounced sync
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce: wait 500ms after last change before syncing
    debounceTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      const elapsed = now - lastSyncRef.current;

      // Rate limit: don't sync more than once per second
      if (elapsed >= 1000) {
        lastSyncRef.current = now;
        void syncWidget(tasks);
        return;
      }

      // Rate limited: schedule a trailing sync for when the window elapses
      // instead of dropping the update outright — otherwise the widget
      // stays stale until some unrelated change happens to re-trigger a sync.
      if (trailingTimeoutRef.current) {
        clearTimeout(trailingTimeoutRef.current);
      }
      trailingTimeoutRef.current = setTimeout(() => {
        lastSyncRef.current = Date.now();
        void syncWidget(tasks);
        trailingTimeoutRef.current = null;
      }, 1000 - elapsed);
    }, 500);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (trailingTimeoutRef.current) {
        clearTimeout(trailingTimeoutRef.current);
        trailingTimeoutRef.current = null;
      }
    };
  }, [tasks, enabled]);
}

/**
 * Returns true if a tRPC error means the underlying task is permanently
 * unreachable (deleted, or no longer accessible to this user) rather than a
 * transient/network failure. Non-retryable errors should cause the pending
 * widget action to be dropped instead of jamming the queue forever.
 */
function isNonRetryableTaskError(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) return false;
  const code = (error as TRPCClientError<AppRouter>).data?.code;
  return code === "NOT_FOUND" || code === "FORBIDDEN";
}

/**
 * Hook to process pending widget actions (e.g., task toggles from interactive widget).
 * Reads the pending actions queue from UserDefaults on app foreground and syncs to server.
 *
 * Each action is acknowledged (removed from the queue) individually as soon as it
 * succeeds or is determined to be permanently unrecoverable, so a single poison
 * action (e.g. a deleted or forbidden task) can never jam the whole queue, and a
 * mid-loop failure never causes already-applied actions to be replayed.
 */
export function useWidgetActions(
  updateTaskMutation: (args: {
    id: string;
    completed: boolean;
  }) => Promise<unknown>,
  invalidateQueries: () => Promise<void>,
) {
  const processingRef = useRef(false);

  // Keep the latest callbacks available to the (stable) AppState subscription
  // below without needing to re-subscribe on every render just because the
  // caller passed new closure identities. Updated in an effect (not during
  // render) to satisfy the rules-of-hooks ref-mutation lint rule.
  const updateTaskMutationRef = useRef(updateTaskMutation);
  const invalidateQueriesRef = useRef(invalidateQueries);
  useEffect(() => {
    updateTaskMutationRef.current = updateTaskMutation;
    invalidateQueriesRef.current = invalidateQueries;
  });

  useEffect(() => {
    const handleAppState = async (state: AppStateStatus) => {
      if (state !== "active" || processingRef.current) return;
      processingRef.current = true;

      try {
        const actions: PendingWidgetAction[] = getPendingWidgetActions();
        if (actions.length === 0) return;

        let anySucceeded = false;

        for (const action of actions) {
          try {
            await updateTaskMutationRef.current({
              id: action.taskId,
              completed: action.completed,
            });
            removePendingWidgetAction(action);
            anySucceeded = true;
          } catch (error) {
            if (isNonRetryableTaskError(error)) {
              // Poison action (task deleted or no longer accessible) — drop it
              // rather than let it block every subsequent foreground retry.
              console.warn(
                "[Widget] Dropping unrecoverable pending action:",
                action.taskId,
                error,
              );
              removePendingWidgetAction(action);
            } else {
              // Likely a transient/network error — leave it queued for retry
              // on the next foreground.
              console.warn(
                "[Widget] Pending action failed, will retry on next foreground:",
                action.taskId,
                error,
              );
            }
          }
        }

        if (anySucceeded) {
          await invalidateQueriesRef.current();
        }
      } catch (error) {
        console.warn("[Widget] Failed to process pending actions:", error);
      } finally {
        processingRef.current = false;
      }
    };

    // Process on mount (app just opened)
    void handleAppState("active");

    const sub = AppState.addEventListener("change", (state) => {
      void handleAppState(state);
    });
    return () => sub.remove();
    // Intentionally stable: callbacks are read via refs above so this effect
    // only needs to (re)run on actual foreground transitions, not on every
    // render of the caller.
  }, []);
}

// Re-export for manual sync needs
export { syncWidget } from "~/utils/widget";
