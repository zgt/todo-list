import { Platform } from "react-native";
import {
  getSharedData,
  reloadAllTimelines,
  setSharedData,
} from "widget-data-sharing";

// Types matching the Swift widget expectations
interface WidgetTaskItem {
  id: string;
  title: string;
  completed: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  dueDate: string | null; // ISO 8601 string
}

interface WidgetCategoryItem {
  id: string;
  name: string;
  color: string;
}

interface WidgetData {
  tasks: WidgetTaskItem[];
  categories: WidgetCategoryItem[];
  totalCount: number;
  completedCount: number;
  updatedAt: string; // ISO 8601 string
}

// App Group identifier - must match the one in app.config.ts and Swift code
const APP_GROUP_ID = "group.com.zgtf.todolist";

/**
 * Task type expected by widget sync functions.
 * Compatible with both server tasks (tRPC) and local tasks (SQLite).
 */
export interface WidgetTask {
  id: string;
  title: string;
  completed: boolean;
  categoryId?: string | null;
  dueDate?: Date | null;
  category?: {
    id?: string; // Add id to category object if available, otherwise fallback to top-level categoryId
    name: string;
    color: string;
  } | null;
}

/**
 * Updates the iOS widget with the latest task data.
 * Uses the WidgetDataSharing Expo module to write to shared UserDefaults.
 *
 * @param tasks - Array of tasks to display in the widget (supports both server and local tasks)
 */
export function updateWidget(tasks: WidgetTask[]): void {
  if (Platform.OS !== "ios") {
    return; // Widget is iOS only
  }

  try {
    // Sort tasks: incomplete first, then completed (for large widget display)
    // Limit to 10 tasks total
    const sortedTasks = [...tasks]
      .sort((a, b) => Number(a.completed) - Number(b.completed));
    
    // We keep all tasks for statistics, but the widget view might only show a subset.
    // However, to keep JSON size small, we might want to limit. 
    // But for filtering to work on the widget side, we need ALL tasks (or at least more of them).
    // Let's bump the limit or send all (within reason). 
    // If the user has 1000 tasks, that's bad. 
    // Let's send top 50 relevant tasks? Or maybe just keep the previous logic but ensure we capture enough.
    // Actually, if we want to filter by category on the widget, we need the tasks for those categories.
    // If we only send top 10 mixed tasks, filtering by "Work" might show 0 results if the top 10 are "Personal".
    // So we should probably send more tasks, but maybe strip some data if needed. 
    // For now, let's send up to 50 tasks.
    const limitedTasks = sortedTasks.slice(0, 50);

    const widgetTasks: WidgetTaskItem[] = limitedTasks.map((task) => ({
      id: task.id,
      title: task.title,
      completed: task.completed,
      categoryId: task.categoryId ?? task.category?.id ?? null,
      categoryName: task.category?.name ?? null,
      categoryColor: task.category?.color ?? null,
      dueDate: task.dueDate?.toISOString() ?? null,
    }));

    // Extract unique categories from the tasks
    const categoriesMap = new Map<string, WidgetCategoryItem>();
    
    // We iterate over ALL tasks (not just limited ones) to find available categories? 
    // Or just the ones we are sending? 
    // If we filter on widget, we can only show tasks we sent. So strictly speaking, only categories present in the sent tasks are "available" to be shown.
    // However, it might be nice to know other categories exist. 
    // But for now, let's stick to categories present in `widgetTasks`.
    widgetTasks.forEach(task => {
      if (task.categoryId && task.categoryName && task.categoryColor) {
        if (!categoriesMap.has(task.categoryId)) {
          categoriesMap.set(task.categoryId, {
            id: task.categoryId,
            name: task.categoryName,
            color: task.categoryColor
          });
        }
      }
    });

    const widgetCategories = Array.from(categoriesMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    const completedCount = tasks.filter((t) => t.completed).length;

    const widgetData: WidgetData = {
      tasks: widgetTasks,
      categories: widgetCategories,
      totalCount: tasks.length,
      completedCount,
      updatedAt: new Date().toISOString(),
    };

    // Write to shared UserDefaults via App Group
    const jsonData = JSON.stringify(widgetData);
    console.log("[Widget] Writing data:", {
      taskCount: widgetTasks.length,
      totalCount: tasks.length,
      completedCount,
      dataLength: jsonData.length,
    });

    const success = setSharedData("widgetData", jsonData, APP_GROUP_ID);

    if (success) {
      console.log("[Widget] Updated with", widgetTasks.length, "tasks");
    } else {
      console.warn(
        "[Widget] setSharedData returned false - data may not have been written",
      );
    }
  } catch (error) {
    // Log error but don't crash - widget updates are not critical
    console.warn("[Widget] Failed to update:", error);
  }
}

/**
 * Triggers a widget refresh to reload the timeline.
 * Call this after updating widget data.
 */
export function reloadWidget(): void {
  if (Platform.OS !== "ios") {
    return;
  }

  try {
    reloadAllTimelines();
    console.log("[Widget] Triggered timeline reload");
  } catch (error) {
    console.warn("[Widget] Failed to reload timelines:", error);
  }
}

/**
 * Convenience function to update widget data and trigger a refresh.
 * Call this whenever tasks change to keep the widget in sync.
 *
 * @param tasks - Array of tasks (from tRPC or local database)
 */
export function syncWidget(tasks: WidgetTask[]): void {
  updateWidget(tasks);
  reloadWidget();
}

// MARK: - Pending Widget Actions

interface PendingWidgetAction {
  taskId: string;
  action: "toggle";
  completed: boolean;
  timestamp: string; // ISO 8601
}

export function getPendingWidgetActions(): PendingWidgetAction[] {
  if (Platform.OS !== "ios") return [];
  try {
    const json = getSharedData("pendingWidgetActions", APP_GROUP_ID);
    if (!json) return [];
    return JSON.parse(json) as PendingWidgetAction[];
  } catch {
    return [];
  }
}

export function clearPendingWidgetActions(): void {
  if (Platform.OS !== "ios") return;
  try {
    setSharedData("pendingWidgetActions", "[]", APP_GROUP_ID);
  } catch {
    /* non-critical */
  }
}
