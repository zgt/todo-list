import { useCallback, useRef, useState } from "react";
import { Dimensions, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";

import type { LocalTask } from "~/db/client";
import { SwipeableCard } from "./SwipeableCard";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface SwipeableCardStackProps {
  tasks: LocalTask[];
  onToggle: (id: string, completed: boolean) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (
    id: string,
    updates: Partial<{
      title: string;
      description: string;
      categoryId: string | null;
      dueDate: Date | null;
    }>,
  ) => void;
}

export function SwipeableCardStack({
  tasks,
  onToggle,
  onComplete,
  onDelete,
  onUpdate,
}: SwipeableCardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const swipeProgress = useSharedValue(0); // Track right swipe progress for previous card animation

  // Deferred sort: only re-sort on navigation or task list changes (add/remove/refresh),
  // not on completion toggling, so the card doesn't jump away instantly.
  const sortTasks = useCallback(
    (t: LocalTask[]) =>
      [...t].sort((a, b) => Number(a.completed) - Number(b.completed)),
    [],
  );
  const prevTaskIdsRef = useRef<string>("");
  const sortedTasksRef = useRef<LocalTask[]>(sortTasks(tasks));

  // Re-sort when tasks are added/removed (ids change) but NOT when completed status changes
  const currentTaskIds = tasks
    .map((t) => t.id)
    .sort()
    .join(",");
  if (currentTaskIds !== prevTaskIdsRef.current) {
    prevTaskIdsRef.current = currentTaskIds;
    sortedTasksRef.current = sortTasks(tasks);
  } else {
    // Update task data (e.g. completed status) without re-sorting
    const idOrder = new Map(sortedTasksRef.current.map((t, i) => [t.id, i]));
    sortedTasksRef.current = [...tasks].sort((a, b) => {
      const ai = idOrder.get(a.id) ?? tasks.indexOf(a);
      const bi = idOrder.get(b.id) ?? tasks.indexOf(b);
      return ai - bi;
    });
  }

  const sortedTasks = sortedTasksRef.current;

  if (sortedTasks.length === 0) {
    return null;
  }

  const handleComplete = (taskId: string) => {
    // Just call the parent's complete handler - task stays in list
    onComplete(taskId);
  };

  const handleDelete = (taskId: string) => {
    onDelete(taskId);
    setDeletePendingId(null);
  };

  const handleEditStart = (taskId: string) => {
    setEditingId(taskId);
  };

  const handleSave = (
    taskId: string,
    updates: Partial<{
      title: string;
      description: string;
      categoryId: string | null;
      dueDate: Date | null;
    }>,
  ) => {
    onUpdate(taskId, updates);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleNext = () => {
    if (currentIndex < sortedTasks.length - 1) {
      // Re-sort on navigation so completed tasks settle to the bottom
      sortedTasksRef.current = sortTasks(tasks);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      // Re-sort on navigation
      sortedTasksRef.current = sortTasks(tasks);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Show previous card (if exists), current card, and next 2 cards for stacking effect
  const startIndex = Math.max(0, currentIndex - 1);
  const displayTasks = sortedTasks.slice(startIndex, currentIndex + 4);
  const baseIndexOffset = currentIndex - startIndex; // Offset to calculate relative index
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        minHeight: SCREEN_HEIGHT * 0.7,
      }}
    >
      {displayTasks.map((task, mapIndex) => {
        const relativeIndex = mapIndex - baseIndexOffset;
        return (
          <SwipeableCard
            key={task.id}
            task={task}
            index={relativeIndex}
            totalCards={displayTasks.length}
            isTopCard={relativeIndex === 0}
            canGoNext={currentIndex < sortedTasks.length - 1}
            canGoPrevious={currentIndex > 0}
            swipeProgress={swipeProgress}
            deletePending={deletePendingId === task.id}
            isEditing={editingId === task.id}
            onToggle={() => onToggle(task.id, !task.completed)}
            onComplete={() => handleComplete(task.id)}
            onDelete={() => handleDelete(task.id)}
            onDeletePending={() => setDeletePendingId(task.id)}
            onCancelDelete={() => setDeletePendingId(null)}
            onEditStart={() => handleEditStart(task.id)}
            onSave={(
              updates: Partial<{
                title: string;
                description: string;
                categoryId: string | null;
                dueDate: Date | null;
              }>,
            ) => handleSave(task.id, updates)}
            onCancelEdit={handleCancelEdit}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      })}
    </View>
  );
}
