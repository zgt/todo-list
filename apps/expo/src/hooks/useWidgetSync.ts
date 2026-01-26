import { useEffect, useRef } from "react";

import type { WidgetTask } from "~/utils/widget";
import { syncWidget } from "~/utils/widget";

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

// Re-export for manual sync needs
export { syncWidget } from "~/utils/widget";
