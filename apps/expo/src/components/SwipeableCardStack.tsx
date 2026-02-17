/* eslint-disable react-hooks/refs -- This component intentionally reads/writes refs during render
   to implement a deferred sort pattern: task order only updates on navigation or add/remove,
   not on completion toggling, preventing cards from jumping away mid-interaction. */
import type { ComponentRef } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions } from "react-native";
import Animated, { useSharedValue } from "react-native-reanimated";

import type { LocalTask } from "~/db/client";
import type { PriorityLevel } from "./priority-config";
import { SwipeableCard } from "./SwipeableCard";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const PRIORITY_WEIGHTS: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

interface SwipeableCardStackProps {
  tasks: LocalTask[];
  onToggle: (id: string, completed: boolean) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  isCompact: boolean;
  onUpdate: (
    id: string,
    updates: Partial<{
      title: string;
      description: string;
      categoryId: string | null;
      dueDate: Date | null;
      priority: PriorityLevel;
    }>,
  ) => void;
  autoEditId?: string | null;
  onCancelEdit?: (id: string) => void;
}

export function SwipeableCardStack({
  tasks,
  onToggle,
  onComplete,
  onDelete,
  onUpdate,
  isCompact,
  autoEditId,
  onCancelEdit,
}: SwipeableCardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const swipeProgress = useSharedValue(0); // Track right swipe progress for previous card animation
  const skipAnimationIds = useRef<Set<string>>(new Set());
  const scrollViewRef = useRef<ComponentRef<typeof Animated.ScrollView>>(null);

  // Auto-enter edit mode if requested
  useEffect(() => {
    if (autoEditId) {
      setEditingId(autoEditId);
      // If we're not compact, we might want to ensure the card is visible/focused,
      // but if it's prepended, it should be at index 0 which is default.
      if (!isCompact) {
        setCurrentIndex(0);
      }
    }
  }, [autoEditId, isCompact]);

  // Scroll to current card when switching to compact mode
  useEffect(() => {
    if (isCompact && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: currentIndex * 92,
        animated: true,
      });
    }
  }, [isCompact, currentIndex]);

  // Deferred sort: only re-sort on navigation or task list changes (add/remove/refresh),
  // not on completion toggling, so the card doesn't jump away instantly.
  const sortTasks = useCallback(
    (t: LocalTask[]) =>
      [...t].sort((a, b) => {
        // First sort by completion status
        const completedDiff = Number(a.completed) - Number(b.completed);
        if (completedDiff !== 0) return completedDiff;

        // Then by priority (descending)
        const priorityA =
          PRIORITY_WEIGHTS[(a.priority as string) ?? "none"] ?? 0;
        const priorityB =
          PRIORITY_WEIGHTS[(b.priority as string) ?? "none"] ?? 0;
        return priorityB - priorityA;
      }),
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
      priority: PriorityLevel;
    }>,
  ) => {
    onUpdate(taskId, updates);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    if (editingId && onCancelEdit) {
      onCancelEdit(editingId);
    }
    setEditingId(null);
  };

  const resortWithTarget = (targetDirection: "next" | "prev") => {
    const prev = sortedTasksRef.current;
    // The task we want to land on after navigation
    const targetIdx =
      targetDirection === "next" ? currentIndex + 1 : currentIndex - 1;
    const targetTaskId = prev[targetIdx]?.id;
    const next = sortTasks(tasks);
    sortedTasksRef.current = next;
    // Track which tasks changed position
    const prevIndexMap = new Map(prev.map((t, i) => [t.id, i]));
    const changed = new Set<string>();
    for (let i = 0; i < next.length; i++) {
      const nextTask = next[i];
      if (nextTask && prevIndexMap.get(nextTask.id) !== i) {
        changed.add(nextTask.id);
      }
    }
    // Don't skip animation for the card we're navigating to
    if (targetTaskId) changed.delete(targetTaskId);
    skipAnimationIds.current = changed;
    // Find where the target task is in the new sorted order
    if (targetTaskId) {
      const newIdx = next.findIndex((t) => t.id === targetTaskId);
      if (newIdx !== -1) return newIdx;
    }
    return targetIdx;
  };

  const handleNext = () => {
    if (currentIndex < sortedTasks.length - 1) {
      const newIndex = resortWithTarget("next");
      setCurrentIndex(newIndex);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = resortWithTarget("prev");
      setCurrentIndex(newIndex);
    }
  };

  // Show previous card (if exists), current card, and next 2 cards for stacking effect
  const startIndex = Math.max(0, currentIndex - 1);
  const displayTasks = isCompact
    ? sortedTasks
    : sortedTasks.slice(startIndex, currentIndex + 4);
  const baseIndexOffset = isCompact ? 0 : currentIndex - startIndex; // Offset to calculate relative index
  const currentSkipIds = skipAnimationIds.current;
  // Reset after capturing
  skipAnimationIds.current = new Set();
  return (
    <Animated.ScrollView
      ref={scrollViewRef}
      scrollEnabled={isCompact}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        alignItems: "center",
        justifyContent: isCompact ? "flex-start" : "center",
        minHeight: isCompact
          ? displayTasks.length * 92 + 200
          : SCREEN_HEIGHT * 0.75,
        paddingTop: isCompact ? 60 : 0, // Add top padding for list
      }}
      style={{
        flex: 1,
        width: "100%",
      }}
    >
      {displayTasks.map((task, mapIndex) => {
        const relativeIndex = mapIndex - baseIndexOffset;
        return (
          <SwipeableCard
            key={task.id}
            task={task}
            isCompact={isCompact}
            index={relativeIndex}
            totalCards={displayTasks.length}
            isTopCard={relativeIndex === 0}
            skipStackAnimation={currentSkipIds.has(task.id)}
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
    </Animated.ScrollView>
  );
}
