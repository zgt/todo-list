import { useState } from "react";
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
    updates: Partial<{ title: string; description: string }>,
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

  if (tasks.length === 0) {
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
    updates: Partial<{ title: string; description: string }>,
  ) => {
    onUpdate(taskId, updates);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleNext = () => {
    if (currentIndex < tasks.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Show previous card (if exists), current card, and next 2 cards for stacking effect
  const startIndex = Math.max(0, currentIndex - 1);
  const displayTasks = tasks.slice(startIndex, currentIndex + 3);
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
            canGoNext={currentIndex < tasks.length - 1}
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
            onSave={(updates: Partial<{ title: string; description: string }>) =>
              handleSave(task.id, updates)
            }
            onCancelEdit={handleCancelEdit}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        );
      })}
    </View>
  );
}
