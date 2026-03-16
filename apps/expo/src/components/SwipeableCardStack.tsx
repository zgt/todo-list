/* eslint-disable react-hooks/refs -- This component intentionally reads/writes refs during render
   to implement a deferred sort pattern: task order only updates on navigation, completion delay,
   or add/remove, preventing cards from jumping away mid-interaction. */
import type { ScrollView } from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, RefreshControl } from "react-native";
import Animated, {
  LinearTransition,
  useSharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import type { PriorityLevel } from "./priority-config";
import type { LocalTask } from "~/db/client";
import { SwipeableCard } from "./SwipeableCard";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const PRIORITY_WEIGHTS: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

/** Delay before completed tasks re-sort into their new position (ms) */
const COMPLETION_RESORT_DELAY = 500;

interface SwipeableCardStackProps {
  tasks: LocalTask[];
  onToggle: (id: string, completed: boolean) => void;
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
  onTaskPress?: (id: string) => void;
  onSubtaskToggle?: (subtaskId: string, completed: boolean) => void;
  onRefresh?: () => void;
  deletePendingIds: Set<string>;
  onToggleDeletePending: (id: string) => void;
}

export function SwipeableCardStack({
  tasks,
  onToggle,
  onUpdate,
  isCompact,
  onTaskPress,
  onSubtaskToggle,
  onRefresh,
  deletePendingIds,
  onToggleDeletePending,
}: SwipeableCardStackProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const swipeProgress = useSharedValue(0); // Track right swipe progress for previous card animation
  const skipAnimationIds = useRef<Set<string>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);

  // Delayed resort mechanism: after completing a task, wait briefly then re-sort
  const resortTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingResortRef = useRef(false);
  const [, setResortTrigger] = useState(0);

  // Clean up resort timer on unmount
  useEffect(() => {
    return () => {
      if (resortTimerRef.current) clearTimeout(resortTimerRef.current);
    };
  }, []);

  // Scroll to current card when switching to compact mode
  useEffect(() => {
    if (isCompact && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: currentIndex * 98,
        animated: true,
      });
    }
  }, [isCompact, currentIndex]);

  // Deferred sort: only re-sort on navigation, delayed completion, or task list changes (add/remove).
  const sortTasks = useCallback(
    (t: LocalTask[]) =>
      [...t].sort((a, b) => {
        const completedDiff = Number(a.completed) - Number(b.completed);
        if (completedDiff !== 0) return completedDiff;

        const priorityA =
          PRIORITY_WEIGHTS[(a.priority ?? "none") as string] ?? 0;
        const priorityB =
          PRIORITY_WEIGHTS[(b.priority ?? "none") as string] ?? 0;
        if (priorityB !== priorityA) return priorityB - priorityA;

        return b.createdAt.getTime() - a.createdAt.getTime();
      }),
    [],
  );
  const prevTaskIdsRef = useRef<string>("");
  const sortedTasksRef = useRef<LocalTask[]>(sortTasks(tasks));

  const shouldForceResort = pendingResortRef.current;
  if (shouldForceResort) pendingResortRef.current = false;

  const currentTaskIds = tasks
    .map((t) => t.id)
    .sort()
    .join(",");
  if (currentTaskIds !== prevTaskIdsRef.current || shouldForceResort) {
    prevTaskIdsRef.current = currentTaskIds;
    sortedTasksRef.current = sortTasks(tasks);
  } else {
    const idOrder = new Map(sortedTasksRef.current.map((t, i) => [t.id, i]));
    sortedTasksRef.current = [...tasks].sort((a, b) => {
      const ai = idOrder.get(a.id) ?? tasks.indexOf(a);
      const bi = idOrder.get(b.id) ?? tasks.indexOf(b);
      return ai - bi;
    });
  }

  const sortedTasks = sortedTasksRef.current;

  // Clamp currentIndex if it's out of bounds after a resort
  useEffect(() => {
    if (sortedTasks.length === 0) return;
    const maxIdx = sortedTasks.length - 1;
    if (currentIndex > maxIdx) {
      setCurrentIndex(maxIdx);
    }
  }, [currentIndex, sortedTasks.length]);

  // Show previous card (if exists), current card, and next 2 cards for stacking effect
  const startIndex = Math.max(0, currentIndex - 1);
  const displayTasks = isCompact
    ? sortedTasks
    : sortedTasks.slice(startIndex, currentIndex + 4);
  const baseIndexOffset = isCompact ? 0 : currentIndex - startIndex;
  const currentSkipIds = skipAnimationIds.current;
  skipAnimationIds.current = new Set();

  // Calculate Y positions accounting for expansion in compact mode
  const yOffsets = React.useMemo(() => {
    if (!isCompact) return [];
    const offsets: number[] = [];
    let y = 0;
    for (const task of displayTasks) {
      offsets.push(y);
      const subtaskCount =
        (task as unknown as { subtasks?: unknown[] }).subtasks?.length ?? 0;
      const isExp = expandedTaskId === task.id && subtaskCount > 0;
      const cardHeight = isExp ? 92 + subtaskCount * 32 + 4 : 92;
      y += cardHeight + 4;
    }
    return offsets;
  }, [displayTasks, expandedTaskId, isCompact]);

  // Calculate total height for scroll content
  const totalContentHeight = React.useMemo(() => {
    if (!isCompact) return SCREEN_HEIGHT * 0.75;
    const lastOffset = yOffsets[yOffsets.length - 1] ?? 0;
    const lastTask = displayTasks[displayTasks.length - 1];
    if (!lastTask) return 200;
    const lastSubtaskCount =
      (lastTask as unknown as { subtasks?: unknown[] }).subtasks?.length ?? 0;
    const lastIsExp = expandedTaskId === lastTask.id && lastSubtaskCount > 0;
    const lastCardHeight = lastIsExp ? 80 + lastSubtaskCount * 36 + 12 : 80;
    return lastOffset + lastCardHeight + 200;
  }, [yOffsets, displayTasks, expandedTaskId, isCompact]);

  if (sortedTasks.length === 0) {
    return null;
  }

  const scheduleResort = () => {
    if (resortTimerRef.current) clearTimeout(resortTimerRef.current);
    resortTimerRef.current = setTimeout(() => {
      pendingResortRef.current = true;
      setResortTrigger((n) => n + 1);
    }, COMPLETION_RESORT_DELAY);
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
  };

  const handleToggleExpand = (taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const resortWithTarget = (targetDirection: "next" | "prev") => {
    if (resortTimerRef.current) clearTimeout(resortTimerRef.current);

    const prev = sortedTasksRef.current;
    const targetIdx =
      targetDirection === "next" ? currentIndex + 1 : currentIndex - 1;
    const targetTaskId = prev[targetIdx]?.id;
    const next = sortTasks(tasks);
    sortedTasksRef.current = next;
    const prevIndexMap = new Map(prev.map((t, i) => [t.id, i]));
    const changed = new Set<string>();
    for (let i = 0; i < next.length; i++) {
      const nextTask = next[i];
      if (nextTask && prevIndexMap.get(nextTask.id) !== i) {
        changed.add(nextTask.id);
      }
    }
    if (targetTaskId) changed.delete(targetTaskId);
    skipAnimationIds.current = changed;
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
      if (newIndex === currentIndex) {
        setResortTrigger((n) => n + 1);
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = resortWithTarget("prev");
      setCurrentIndex(newIndex);
      if (newIndex === currentIndex) {
        setResortTrigger((n) => n + 1);
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <Animated.ScrollView
      ref={scrollViewRef}
      scrollEnabled={isCompact}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        isCompact && onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onRefresh();
              setTimeout(() => setRefreshing(false), 1000);
            }}
            tintColor="#50C878"
          />
        ) : undefined
      }
      contentContainerStyle={{
        alignItems: "center",
        justifyContent: isCompact ? "flex-start" : "center",
        marginTop: isCompact ? 0 : -10,
        minHeight: totalContentHeight,
        paddingTop: isCompact ? 0 : 0,
        paddingBottom: isCompact ? 80 : 0,
      }}
      style={{
        flex: 1,
        width: "100%",
        overflow: "visible",
      }}
    >
      {displayTasks.map((task, mapIndex) => {
        const relativeIndex = mapIndex - baseIndexOffset;

        const card = (
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
            deletePending={deletePendingIds.has(task.id)}
            isExpanded={expandedTaskId === task.id}
            yOffset={isCompact ? yOffsets[mapIndex] : undefined}
            onToggle={() => {
              onToggle(task.id, !task.completed);
              scheduleResort();
            }}
            onToggleDeletePending={() => onToggleDeletePending(task.id)}
            onSave={(
              updates: Partial<{
                title: string;
                description: string;
                categoryId: string | null;
                dueDate: Date | null;
              }>,
            ) => handleSave(task.id, updates)}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onTaskPress={onTaskPress ? () => onTaskPress(task.id) : undefined}
            onSubtaskToggle={onSubtaskToggle}
            onToggleExpand={() => handleToggleExpand(task.id)}
          />
        );

        if (isCompact) {
          return (
            <Animated.View
              key={task.id}
              layout={LinearTransition.springify().damping(18).stiffness(120)}
              style={{ width: "100%" }}
            >
              {card}
            </Animated.View>
          );
        }

        return card;
      })}
    </Animated.ScrollView>
  );
}
