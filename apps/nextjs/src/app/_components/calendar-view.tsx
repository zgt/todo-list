"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import type { RouterOutputs } from "@acme/api";
import { cn } from "@acme/ui";

import { useCreateTask } from "./create-task-context";
import { InlineCreateTask, TaskCard } from "./tasks";

type Task = RouterOutputs["task"]["all"][number];

/** Extract local date string (YYYY-MM-DD) without UTC conversion */
function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parse a local date key (YYYY-MM-DD) back into a Date at local midnight */
function fromLocalDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

const PRIORITY_DOT_COLORS: Record<string, string> = {
  high: "var(--priority-high)",
  medium: "var(--priority-medium)",
  low: "var(--priority-low)",
  none: "var(--muted-foreground)",
};

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const GRID_COLS = 7;

/** Get all calendar dates for a month view grid (includes adjacent month padding) */
function getMonthGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay(); // 0=Sun

  // Start from the Sunday of the first week
  const gridStart = new Date(year, month, 1 - startDow);

  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);

  // Generate 6 weeks max, but stop at 5 if the month fits
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);

    // Stop after 5 weeks if we've covered the entire month
    if (w >= 4 && cursor.getMonth() !== month) break;
  }

  return weeks;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MAX_VISIBLE_TASKS = 3;

interface CalendarViewProps {
  tasks: Task[];
}

export function CalendarView({ tasks }: CalendarViewProps) {
  const today = new Date();
  const todayKey = toLocalDateKey(today);

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showUndated, setShowUndated] = useState(false);
  // Roving-tabindex focus target for the day grid.
  const [focusedKey, setFocusedKey] = useState(todayKey);

  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  const { isCreating, setIsCreating, startCreating } = useCreateTask();

  // Group tasks by local date key (due date and/or reminder date)
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    function addTask(key: string, task: Task) {
      const existing = map.get(key);
      if (existing) {
        if (!existing.includes(task)) existing.push(task);
      } else {
        map.set(key, [task]);
      }
    }
    for (const task of tasks) {
      if (task.dueDate) addTask(toLocalDateKey(task.dueDate), task);
      if (task.reminderAt) addTask(toLocalDateKey(task.reminderAt), task);
    }
    return map;
  }, [tasks]);

  // Tasks with neither a due date nor a reminder never land on the grid.
  const undatedTasks = useMemo(
    () => tasks.filter((t) => !t.dueDate && !t.reminderAt),
    [tasks],
  );

  // Incomplete tasks whose due date is before today.
  const overdueCount = useMemo(() => {
    const start = fromLocalDateKey(todayKey);
    return tasks.filter(
      (t) => !t.completed && t.dueDate && new Date(t.dueDate) < start,
    ).length;
  }, [tasks, todayKey]);

  const selectedTasks = useMemo(
    () => (selectedKey ? (tasksByDate.get(selectedKey) ?? []) : []),
    [selectedKey, tasksByDate],
  );

  const hasSelectedTasks = selectedTasks.length > 0;
  const isPanelOpen = showUndated || hasSelectedTasks || isCreating;

  const weeks = useMemo(
    () => getMonthGrid(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  const flatKeys = useMemo(
    () => weeks.flatMap((week) => week.map(toLocalDateKey)),
    [weeks],
  );

  // Resolve the roving-tabindex target against the visible grid so month
  // changes always leave exactly one cell tabbable (no effect / setState churn).
  const resolvedFocusedKey = flatKeys.includes(focusedKey)
    ? focusedKey
    : flatKeys.includes(todayKey)
      ? todayKey
      : (flatKeys[0] ?? todayKey);

  const focusDay = useCallback((key: string) => {
    setFocusedKey(key);
    cellRefs.current.get(key)?.focus();
  }, []);

  function goToPrevMonth() {
    setCurrentMonth((m) => {
      if (m === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }

  function goToNextMonth() {
    setCurrentMonth((m) => {
      if (m === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }

  function goToToday() {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setShowUndated(false);
    setSelectedKey(todayKey);
    setFocusedKey(todayKey);
  }

  function handleActivateDay(dateKey: string) {
    setFocusedKey(dateKey);
    const dayTasks = tasksByDate.get(dateKey) ?? [];
    const alreadyOpen = selectedKey === dateKey && !showUndated;

    // Re-activating the open day (when not mid-create) collapses the panel.
    // hasSelectedTasks guards against a stale selectedKey pointing at a day
    // whose panel isn't actually open (e.g. after goToToday on an empty day).
    if (alreadyOpen && !isCreating && hasSelectedTasks) {
      setSelectedKey(null);
      return;
    }

    setShowUndated(false);
    setSelectedKey(dateKey);
    if (dayTasks.length === 0) {
      startCreating(fromLocalDateKey(dateKey));
    } else {
      setIsCreating(false);
    }
  }

  function handleCellKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let next = index;
    switch (e.key) {
      case "ArrowRight":
        next = index + 1;
        break;
      case "ArrowLeft":
        next = index - 1;
        break;
      case "ArrowDown":
        next = index + GRID_COLS;
        break;
      case "ArrowUp":
        next = index - GRID_COLS;
        break;
      case "Home":
        next = index - (index % GRID_COLS);
        break;
      case "End":
        next = index - (index % GRID_COLS) + (GRID_COLS - 1);
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next < 0 || next >= flatKeys.length) return;
    const nextKey = flatKeys[next];
    if (nextKey) focusDay(nextKey);
  }

  function toggleUndated() {
    setShowUndated((v) => !v);
    setIsCreating(false);
  }

  // Add-task on the currently selected day (or today if none selected).
  function addTaskOnSelectedDay() {
    startCreating(fromLocalDateKey(selectedKey ?? todayKey));
  }

  const panelHeading = showUndated
    ? "Undated tasks"
    : fromLocalDateKey(selectedKey ?? todayKey).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

  return (
    <div className="flex h-full flex-col">
      {/* Month navigation header */}
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          {undatedTasks.length > 0 && (
            <button
              onClick={toggleUndated}
              aria-pressed={showUndated}
              className={cn(
                "rounded-full border px-3 py-0.5 text-xs font-medium transition-colors",
                showUndated
                  ? "border-border-focus bg-surface-hover text-foreground"
                  : "border-border-strong text-muted-foreground hover:border-border-focus hover:text-foreground",
              )}
            >
              {undatedTasks.length} undated
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={goToToday}
            className="border-border-strong text-muted-foreground hover:border-border-focus hover:text-foreground rounded-full border px-3 py-0.5 text-xs font-medium transition-colors"
          >
            Today
          </button>

          <h2 className="text-foreground text-xl font-semibold">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>

          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevMonth}
              className="text-muted-foreground hover:bg-border-strong/40 hover:text-foreground rounded-md p-1.5 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextMonth}
              className="text-muted-foreground hover:bg-border-strong/40 hover:text-foreground rounded-md p-1.5 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 pb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-muted-foreground text-center text-xs font-medium tracking-wider uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Month grid - shrinks when task panel opens.
          Uniform gridlines come from gap-px over a bg-border-strong container;
          each opaque cell covers the container except the 1px gaps. */}
      <div
        role="grid"
        aria-label={`${MONTH_NAMES[currentMonth]} ${currentYear}`}
        className="border-border-strong bg-border-strong grid grid-cols-7 gap-px overflow-hidden rounded-xl border transition-[flex] duration-300 ease-in-out"
        style={{
          flex: isPanelOpen ? "0 0 auto" : "1 1 0%",
          gridTemplateRows: `repeat(${weeks.length}, 1fr)`,
          minHeight: isPanelOpen ? "45%" : undefined,
        }}
      >
        {weeks.map((week, wi) => (
          <div key={wi} role="row" className="contents">
            {week.map((date, di) => {
              const index = wi * GRID_COLS + di;
              const dateKey = toLocalDateKey(date);
              const isCurrentMonth = date.getMonth() === currentMonth;
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedKey && !showUndated;
              const dayTasks = tasksByDate.get(dateKey) ?? [];
              const visibleTasks = dayTasks.slice(0, MAX_VISIBLE_TASKS);
              const overflowCount = dayTasks.length - MAX_VISIBLE_TASKS;
              const showOverdue = isToday && overdueCount > 0;

              const countLabel =
                dayTasks.length === 0
                  ? "no tasks"
                  : `${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"}`;
              const ariaLabel = [
                date.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                }),
                isToday ? "today" : null,
                countLabel,
                showOverdue ? `${overdueCount} overdue` : null,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <button
                  key={dateKey}
                  ref={(el) => {
                    if (el) cellRefs.current.set(dateKey, el);
                    else cellRefs.current.delete(dateKey);
                  }}
                  type="button"
                  role="gridcell"
                  tabIndex={dateKey === resolvedFocusedKey ? 0 : -1}
                  aria-label={ariaLabel}
                  aria-selected={isSelected}
                  onClick={() => handleActivateDay(dateKey)}
                  onKeyDown={(e) => handleCellKeyDown(e, index)}
                  className={cn(
                    "relative flex flex-col overflow-hidden p-1.5 text-left transition-colors",
                    "focus-visible:z-10 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
                    "focus-visible:ring-border-focus",
                    isCurrentMonth ? "bg-surface-2" : "bg-surface",
                    "hover:bg-surface-hover",
                    isSelected && "ring-primary/60 ring-1 ring-inset",
                  )}
                >
                  <div className={cn(!isCurrentMonth && "opacity-50")}>
                    {/* Date number - centered, with overdue indicator on today */}
                    <div className="flex items-center justify-center gap-1">
                      {isToday ? (
                        <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold">
                          {date.getDate()}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center text-sm",
                            isCurrentMonth
                              ? "text-muted-foreground"
                              : "text-muted-foreground/50",
                          )}
                        >
                          {date.getDate()}
                        </span>
                      )}
                      {showOverdue && (
                        <span
                          className="text-priority-high text-[10px] font-bold"
                          aria-hidden="true"
                        >
                          {overdueCount}!
                        </span>
                      )}
                    </div>

                    {/* Task items */}
                    <div className="mt-0.5 flex flex-col gap-px">
                      {visibleTasks.map((task) => (
                        <div
                          key={task.id}
                          className={cn(
                            "flex items-center gap-1 rounded-sm px-1 py-px",
                            task.completed && "line-through opacity-40",
                          )}
                        >
                          <span
                            className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                PRIORITY_DOT_COLORS[task.priority ?? "none"] ??
                                "var(--muted-foreground)",
                            }}
                          />
                          <span className="text-foreground truncate text-xs">
                            {task.title}
                          </span>
                        </div>
                      ))}

                      {overflowCount > 0 && (
                        <span className="text-muted-foreground px-1 text-xs">
                          +{overflowCount} more
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Animated task panel container using grid row trick */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{
          gridTemplateRows: isPanelOpen ? "1fr" : "0fr",
        }}
      >
        <div className="overflow-hidden">
          {isPanelOpen && (
            <div className="border-border-strong/50 mt-3 border-t pt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-muted-foreground text-sm font-medium">
                  {panelHeading}
                </h3>
                {!showUndated && hasSelectedTasks && !isCreating && (
                  <button
                    onClick={addTaskOnSelectedDay}
                    className="border-border-strong text-muted-foreground hover:border-border-focus hover:text-foreground flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add task
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {showUndated ? (
                  undatedTasks.map((task, i) => (
                    <div
                      key={task.id}
                      className="animate-[slideDown_250ms_ease-out_both]"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <TaskCard task={task} />
                    </div>
                  ))
                ) : (
                  <>
                    {isCreating && (
                      <div
                        key={`create-${selectedKey ?? "today"}`}
                        className="animate-[slideDown_250ms_ease-out_both]"
                      >
                        <InlineCreateTask
                          initialDueDate={fromLocalDateKey(
                            selectedKey ?? todayKey,
                          )}
                        />
                      </div>
                    )}
                    {selectedTasks.map((task, i) => (
                      <div
                        key={task.id}
                        className="animate-[slideDown_250ms_ease-out_both]"
                        style={{
                          animationDelay: `${(isCreating ? i + 1 : i) * 60}ms`,
                        }}
                      >
                        <TaskCard task={task} />
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
