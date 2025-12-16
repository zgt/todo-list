import { useEffect, useState } from "react";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";

import type { LocalTask } from "~/db/client";
import { db } from "~/db/client";
import { localTask } from "~/db/schema";
import { syncManager } from "~/sync/manager";
import { authClient } from "~/utils/auth";
import { generateUUID } from "~/utils/uuid";

export interface UseTasksResult {
  tasks: LocalTask[];
  loading: boolean;
  error: Error | null;
  createTask: (data: CreateTaskData) => Promise<LocalTask>;
  updateTask: (id: string, data: UpdateTaskData) => Promise<LocalTask>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<LocalTask>;
  refresh: () => Promise<void>;
}

export interface CreateTaskData {
  title: string;
  description?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  completed?: boolean;
}

export function useTasks(
  filter: "active" | "completed" | "archived" | "all" = "active",
): UseTasksResult {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load tasks from SQLite
  const loadTasks = async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      let queryBuilder = db
        .select()
        .from(localTask)
        .where(and(eq(localTask.userId, user.id), isNull(localTask.deletedAt)))
        .orderBy(desc(localTask.createdAt));

      // Apply filter
      if (filter === "active") {
        queryBuilder = db
          .select()
          .from(localTask)
          .where(
            and(
              eq(localTask.userId, user.id),
              isNull(localTask.deletedAt),
              eq(localTask.completed, false),
              isNull(localTask.archivedAt),
            ),
          )
          .orderBy(desc(localTask.createdAt));
      } else if (filter === "completed") {
        queryBuilder = db
          .select()
          .from(localTask)
          .where(
            and(
              eq(localTask.userId, user.id),
              isNull(localTask.deletedAt),
              eq(localTask.completed, true),
              isNull(localTask.archivedAt),
            ),
          )
          .orderBy(desc(localTask.createdAt));
      } else if (filter === "archived") {
        queryBuilder = db
          .select()
          .from(localTask)
          .where(
            and(
              eq(localTask.userId, user.id),
              isNull(localTask.deletedAt),
              isNotNull(localTask.archivedAt),
            ),
          )
          .orderBy(desc(localTask.createdAt));
      }

      const results = await queryBuilder;
      console.log(results);
      setTasks(results);
      setError(null);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setError(err instanceof Error ? err : new Error("Failed to load tasks"));
    } finally {
      setLoading(false);
    }
  };

  // Load tasks on mount and when filter changes
  useEffect(() => {
    loadTasks();
  }, [user?.id, filter]);

  // Create task
  const createTask = async (data: CreateTaskData): Promise<LocalTask> => {
    if (!user) throw new Error("User not authenticated");

    const now = new Date();
    const taskId = generateUUID();

    const newTask: LocalTask = {
      id: taskId,
      userId: user.id,
      title: data.title,
      description: data.description ?? null,
      completed: false,
      createdAt: now,
      completedAt: null,
      archivedAt: null,
      updatedAt: now,
      deletedAt: null,
      syncStatus: "pending",
      lastSyncedAt: null,
      localVersion: 1,
      serverVersion: 0,
      categoryId: null,
      dueDate: null,
      orderIndex: 0,
    };

    // Optimistic update
    setTasks((prev) => [newTask, ...prev]);

    try {
      // Write to SQLite
      await db.insert(localTask).values(newTask);

      // Queue for sync
      await syncManager.queueOperation("task", taskId, "create", newTask);

      return newTask;
    } catch (err) {
      // Rollback optimistic update
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      throw err;
    }
  };

  // Update task
  const updateTask = async (
    id: string,
    data: UpdateTaskData,
  ): Promise<LocalTask> => {
    const existing = tasks.find((t) => t.id === id);
    if (!existing) throw new Error("Task not found");

    const now = new Date();
    const updates: Partial<LocalTask> = {
      ...data,
      updatedAt: now,
      syncStatus: "pending",
      localVersion: existing.localVersion + 1,
    };

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );

    try {
      // Update SQLite
      await db.update(localTask).set(updates).where(eq(localTask.id, id));

      // Queue for sync
      await syncManager.queueOperation("task", id, "update", updates);

      const updatedTask = { ...existing, ...updates };
      return updatedTask;
    } catch (err) {
      // Rollback optimistic update
      setTasks((prev) => prev.map((t) => (t.id === id ? existing : t)));
      throw err;
    }
  };

  // Delete task
  const deleteTask = async (id: string): Promise<void> => {
    const existing = tasks.find((t) => t.id === id);
    if (!existing) throw new Error("Task not found");

    // Optimistic update
    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      // Soft delete in SQLite
      await db
        .update(localTask)
        .set({
          deletedAt: new Date(),
          syncStatus: "pending",
        })
        .where(eq(localTask.id, id));

      // Queue for sync
      await syncManager.queueOperation("task", id, "delete", {
        deletedAt: new Date(),
      });
    } catch (err) {
      // Rollback optimistic update
      setTasks((prev) => [...prev, existing]);
      throw err;
    }
  };

  // Toggle complete status
  const toggleComplete = async (id: string): Promise<LocalTask> => {
    const existing = tasks.find((t) => t.id === id);
    if (!existing) throw new Error("Task not found");

    const now = new Date();
    const completed = !existing.completed;
    const updates: Partial<LocalTask> = {
      completed,
      completedAt: completed ? now : null,
      updatedAt: now,
      syncStatus: "pending",
      localVersion: existing.localVersion + 1,
    };
    console.log(updates);

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );

    try {
      // Update SQLite
      await db.update(localTask).set(updates).where(eq(localTask.id, id));

      // Queue for sync
      await syncManager.queueOperation("task", id, "update", updates);

      const updatedTask = { ...existing, ...updates };
      return updatedTask;
    } catch (err) {
      // Rollback optimistic update
      setTasks((prev) => prev.map((t) => (t.id === id ? existing : t)));
      throw err;
    }
  };

  // Manual refresh (pull from server)
  const refresh = async () => {
    await syncManager.fullSync();
    await loadTasks();
  };

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    toggleComplete,
    refresh,
  };
}
