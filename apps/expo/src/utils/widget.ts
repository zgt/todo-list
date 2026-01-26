import { Platform } from "react-native";

// Types matching the Swift widget expectations
interface WidgetTaskItem {
  id: string;
  title: string;
  completed: boolean;
  categoryName: string | null;
  categoryColor: string | null;
  dueDate: string | null; // ISO 8601 string
}

interface WidgetData {
  tasks: WidgetTaskItem[];
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
    name: string;
    color: string;
  } | null;
}

/**
 * Updates the iOS widget with the latest task data.
 * Uses the react-native-widget-extension library to write to shared UserDefaults.
 *
 * @param tasks - Array of tasks to display in the widget (supports both server and local tasks)
 */
export async function updateWidget(tasks: WidgetTask[]): Promise<void> {
  if (Platform.OS !== "ios") {
    return; // Widget is iOS only
  }

  try {
    // Dynamically import to avoid issues on Android
    const { setSharedData } = await import("react-native-widget-extension");

    // Filter to show only incomplete tasks, limited to 10
    const incompleteTasks = tasks.filter((task) => !task.completed).slice(0, 10);

    const widgetTasks: WidgetTaskItem[] = incompleteTasks.map((task) => ({
      id: task.id,
      title: task.title,
      completed: task.completed,
      categoryName: task.category?.name ?? null,
      categoryColor: task.category?.color ?? null,
      dueDate: task.dueDate?.toISOString() ?? null,
    }));

    const completedCount = tasks.filter((t) => t.completed).length;

    const widgetData: WidgetData = {
      tasks: widgetTasks,
      totalCount: tasks.length,
      completedCount,
      updatedAt: new Date().toISOString(),
    };

    // Write to shared UserDefaults via App Group
    await setSharedData("widgetData", JSON.stringify(widgetData), APP_GROUP_ID);

    console.log("[Widget] Updated with", widgetTasks.length, "pending tasks");
  } catch (error) {
    // Silently fail - widget updates are not critical
    console.warn("[Widget] Failed to update:", error);
  }
}

/**
 * Triggers a widget refresh to reload the timeline.
 * Call this after updating widget data.
 */
export async function reloadWidget(): Promise<void> {
  if (Platform.OS !== "ios") {
    return;
  }

  try {
    const { reloadAllTimelines } = await import("react-native-widget-extension");
    await reloadAllTimelines();
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
export async function syncWidget(tasks: WidgetTask[]): Promise<void> {
  await updateWidget(tasks);
  await reloadWidget();
}
