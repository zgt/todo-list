import { useCallback, useRef, useState } from "react";
import { Dimensions, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";

import type { LocalTask } from "~/db/client";
import { SwipeableCard } from "./SwipeableCard";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get("window");

const BASE_TASK_FIELDS = {
  userId: "demo-user",
  categoryId: null,
  dueDate: null,
  orderIndex: 0,
  completed: false,
  createdAt: new Date(),
  completedAt: null,
  archivedAt: null,
  updatedAt: new Date(),
  deletedAt: null,
  syncStatus: "synced" as const,
  lastSyncedAt: new Date(),
  localVersion: 1,
  serverVersion: 1,
};

// List view mock tasks with various states
const COMPACT_CARD_HEIGHT = 92;
const COMPACT_CARD_GAP = 4;

const makeListTasks = () => [
  {
    ...BASE_TASK_FIELDS,
    id: "demo-list-1",
    title: "Plan weekend trip",
    description: "Research destinations and book accommodation",
    priority: "medium" as const,
    subtasks: [
      { id: "sub-1", title: "Check flight prices", completed: true, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: "sub-2", title: "Book hotel", completed: false, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: "sub-3", title: "Pack bags", completed: false, sortOrder: 2, createdAt: new Date(), updatedAt: new Date() },
    ],
  } as unknown as LocalTask,
  {
    ...BASE_TASK_FIELDS,
    id: "demo-list-2",
    title: "Buy groceries",
    description: null,
    priority: "high" as const,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    category: { name: "Personal", color: "#3B82F6" },
  } as unknown as LocalTask,
  {
    ...BASE_TASK_FIELDS,
    id: "demo-list-3",
    title: "Review pull request",
    description: null,
    priority: "low" as const,
    completed: true,
    completedAt: new Date(),
    category: { name: "Work", color: "#F59E0B" },
  } as unknown as LocalTask,
];

// Card stack mock tasks — use a function so we get fresh objects on reset
const makeStackTasks = (): LocalTask[] => [
  {
    ...BASE_TASK_FIELDS,
    id: "demo-stack-1",
    title: "Buy groceries",
    description: "Milk, bread, eggs, and vegetables",
    priority: "high" as const,
  } as LocalTask,
  {
    ...BASE_TASK_FIELDS,
    id: "demo-stack-2",
    title: "Schedule meeting",
    description: "Team sync for Q2 planning",
    priority: "medium" as const,
  } as LocalTask,
  {
    ...BASE_TASK_FIELDS,
    id: "demo-stack-3",
    title: "Read article",
    description: "New React Native features",
    priority: "low" as const,
  } as LocalTask,
];

const noop = () => {};

// ── List Demo Stack (3 interactive cards) ───────────────────────────

/** Height of a single compact card including expansion */
function getCardHeight(task: LocalTask, isExpanded: boolean): number {
  const subtaskCount =
    (task as unknown as { subtasks?: unknown[] }).subtasks?.length ?? 0;
  const expandedExtra =
    isExpanded && subtaskCount > 0 ? subtaskCount * 32 + 4 : 0;
  return COMPACT_CARD_HEIGHT + expandedExtra;
}

export function DemoListStack() {
  const [tasks, setTasks] = useState<LocalTask[]>(makeListTasks);
  const [expandedId, setExpandedId] = useState<string | null>("demo-list-1");
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
  const swipeProgress = useSharedValue(0);
  // Guard: when a swipe action fires, suppress the next tap (expand/collapse)
  const swipeActionFiredRef = useRef(false);

  const handleSubtaskToggle = useCallback(
    (taskId: string, subtaskId: string, completed: boolean) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const withSubs = t as unknown as {
            subtasks: { id: string; title: string; completed: boolean; sortOrder: number }[];
          };
          return {
            ...t,
            subtasks: withSubs.subtasks.map((s) =>
              s.id === subtaskId ? { ...s, completed } : s,
            ),
          } as unknown as LocalTask;
        }),
      );
    },
    [],
  );

  // Compute yOffsets based on card heights
  const yOffsets: number[] = [];
  let y = 0;
  for (const task of tasks) {
    yOffsets.push(y);
    y += getCardHeight(task, expandedId === task.id) + COMPACT_CARD_GAP;
  }
  const totalHeight = y - COMPACT_CARD_GAP;

  return (
    <View
      style={{
        width: SCREEN_WIDTH - 32,
        height: totalHeight,
        alignSelf: "center",
      }}
    >
      {tasks.map((task, idx) => (
        <SwipeableCard
          key={task.id}
          task={task}
          index={idx}
          totalCards={tasks.length}
          isCompact={true}
          isTopCard={true}
          canGoNext={false}
          canGoPrevious={false}
          swipeProgress={swipeProgress}
          yOffset={yOffsets[idx]}
          deletePending={deletePendingId === task.id}
          onToggle={() => {
            swipeActionFiredRef.current = true;
            setTasks((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? { ...t, completed: !t.completed, completedAt: t.completed ? null : new Date() }
                  : t,
              ),
            );
            setDeletePendingId((cur) => (cur === task.id ? null : cur));
          }}
          onComplete={() => {
            swipeActionFiredRef.current = true;
            setTasks((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? { ...t, completed: true, completedAt: new Date() }
                  : t,
              ),
            );
          }}
          onDelete={() => {
            swipeActionFiredRef.current = true;
            // Reset to original since we can't remove cards from the demo
            const original = makeListTasks().find((o) => o.id === task.id);
            if (original) {
              setTasks((prev) =>
                prev.map((t) => (t.id === task.id ? original : t)),
              );
            }
            setDeletePendingId((cur) => (cur === task.id ? null : cur));
          }}
          onDeletePending={() => {
            swipeActionFiredRef.current = true;
            setDeletePendingId(task.id);
          }}
          onCancelDelete={() => {
            swipeActionFiredRef.current = true;
            setDeletePendingId((cur) => (cur === task.id ? null : cur));
          }}
          onSave={noop}
          skipStackAnimation={true}
          onNext={noop}
          onPrevious={noop}
          onSubtaskToggle={(subtaskId, completed) =>
            handleSubtaskToggle(task.id, subtaskId, completed)
          }
          isExpanded={expandedId === task.id}
          onToggleExpand={() => {
            if (swipeActionFiredRef.current) {
              swipeActionFiredRef.current = false;
              return;
            }
            setExpandedId((cur) => (cur === task.id ? null : task.id));
          }}
        />
      ))}
    </View>
  );
}

// ── Card Stack Demo ─────────────────────────────────────────────────

const CARD_SCALE = 0.75;
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.65;
export const SCALED_STACK_WIDTH = CARD_WIDTH * CARD_SCALE;
export const SCALED_STACK_HEIGHT = CARD_HEIGHT * CARD_SCALE;

export function DemoCardStack() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tasks, setTasks] = useState<LocalTask[]>(makeStackTasks);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
  const swipeProgress = useSharedValue(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleReset = useCallback((taskId: string) => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      // Reset the specific task back to its original state
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const original = makeStackTasks().find((o) => o.id === taskId);
          return original ?? t;
        }),
      );
      setDeletePendingId(null);
    }, 60_000);
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, tasks.length - 1));
  }, [tasks.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Display window: prev card + current + next 2
  const startIdx = Math.max(0, currentIndex - 1);
  const endIdx = Math.min(tasks.length, currentIndex + 3);
  const displayTasks = tasks.slice(startIdx, endIdx);
  const baseOffset = currentIndex - startIdx;

  return (
    <View
      style={{
        width: SCALED_STACK_WIDTH + 16,
        height: SCALED_STACK_HEIGHT + 40,
        alignSelf: "center",
      }}
    >
      <View
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT + 50,
          transform: [{ scale: CARD_SCALE }],
          transformOrigin: "top left",
        }}
      >
        {displayTasks.map((task, mapIndex) => {
          const relativeIndex = mapIndex - baseOffset;
          return (
            <SwipeableCard
              key={task.id}
              task={task}
              isCompact={false}
              index={relativeIndex}
              totalCards={displayTasks.length}
              isTopCard={relativeIndex === 0}
              skipStackAnimation={false}
              canGoNext={currentIndex < tasks.length - 1}
              canGoPrevious={currentIndex > 0}
              swipeProgress={swipeProgress}
              deletePending={deletePendingId === task.id}
              onToggle={() => {
                setTasks((prev) =>
                  prev.map((t) =>
                    t.id === task.id
                      ? { ...t, completed: !t.completed, completedAt: t.completed ? null : new Date() }
                      : t,
                  ),
                );
                setDeletePendingId(null);
                scheduleReset(task.id);
              }}
              onComplete={() => {
                setTasks((prev) =>
                  prev.map((t) =>
                    t.id === task.id
                      ? { ...t, completed: true, completedAt: new Date() }
                      : t,
                  ),
                );
                scheduleReset(task.id);
              }}
              onDelete={() => {
                // Reset instead of deleting
                const original = makeStackTasks().find((o) => o.id === task.id);
                if (original) {
                  setTasks((prev) =>
                    prev.map((t) => (t.id === task.id ? original : t)),
                  );
                }
                setDeletePendingId(null);
              }}
              onDeletePending={() => {
                setDeletePendingId(task.id);
                scheduleReset(task.id);
              }}
              onCancelDelete={() => setDeletePendingId(null)}
              onSave={noop}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isExpanded={false}
              onToggleExpand={noop}
            />
          );
        })}
      </View>
    </View>
  );
}
