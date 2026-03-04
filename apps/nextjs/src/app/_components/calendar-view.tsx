"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { RouterOutputs } from "@acme/api";

import { TaskCard } from "./tasks";

type Task = RouterOutputs["task"]["all"][number];

/** Extract local date string (YYYY-MM-DD) without UTC conversion */
function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const PRIORITY_DOT_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#3B82F6",
  none: "#8FA8A8",
};

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

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

  const weeks = useMemo(
    () => getMonthGrid(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

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
    setSelectedKey(todayKey);
  }

  function handleDayClick(dateKey: string) {
    setSelectedKey((prev) => (prev === dateKey ? null : dateKey));
  }

  return (
    <div className="flex h-full flex-col">
      {/* Month navigation header */}
      <div className="mb-3 flex items-center justify-end gap-3 px-1">
        <button
          onClick={goToToday}
          className="rounded-full border border-[#164B49] px-3 py-0.5 text-xs font-medium text-[#8FA8A8] transition-colors hover:border-[#21716C] hover:text-[#DCE4E4]"
        >
          Today
        </button>

        <h2 className="text-xl font-semibold text-[#DCE4E4]">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </h2>

        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevMonth}
            className="rounded-md p-1.5 text-[#8FA8A8] transition-colors hover:bg-[#164B49]/40 hover:text-[#DCE4E4]"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToNextMonth}
            className="rounded-md p-1.5 text-[#8FA8A8] transition-colors hover:bg-[#164B49]/40 hover:text-[#DCE4E4]"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 pb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium uppercase tracking-wider text-[#8FA8A8]"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div
        className="grid flex-1 grid-cols-7 rounded-xl border border-[#164B49] bg-[#102A2A]/60 backdrop-blur-sm"
        style={{
          gridTemplateRows: `repeat(${weeks.length}, 1fr)`,
        }}
      >
        {weeks.map((week, wi) =>
          week.map((date, di) => {
            const dateKey = toLocalDateKey(date);
            const isCurrentMonth = date.getMonth() === currentMonth;
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedKey;
            const dayTasks = tasksByDate.get(dateKey) ?? [];
            const visibleTasks = dayTasks.slice(0, MAX_VISIBLE_TASKS);
            const overflowCount = dayTasks.length - MAX_VISIBLE_TASKS;

            // Border classes: right border except last col, bottom border except last row
            const borderClasses = [
              di < 6 ? "border-r border-[#164B49]" : "",
              wi < weeks.length - 1 ? "border-b border-[#164B49]" : "",
            ].join(" ");

            return (
              <div
                key={dateKey}
                onClick={() => handleDayClick(dateKey)}
                className={`cursor-pointer overflow-hidden p-1.5 transition-colors ${borderClasses} ${
                  isSelected
                    ? "bg-[#164B49]/30"
                    : "hover:bg-[#164B49]/20"
                } ${!isCurrentMonth ? "opacity-40" : ""}`}
              >
                {/* Date number - centered */}
                <div className="flex justify-center">
                  {isToday ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#50C878] text-xs font-semibold text-[#0A1A1A]">
                      {date.getDate()}
                    </span>
                  ) : (
                    <span
                      className={`flex h-6 w-6 items-center justify-center text-sm ${
                        isCurrentMonth
                          ? "text-[#8FA8A8]"
                          : "text-[#4A6A6A]"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  )}
                </div>

                {/* Task items */}
                <div className="mt-0.5 flex flex-col gap-px">
                  {visibleTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-1 rounded-sm px-1 py-px ${
                        task.completed
                          ? "line-through opacity-40"
                          : ""
                      }`}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            PRIORITY_DOT_COLORS[
                              task.priority ?? "none"
                            ] ?? "#8FA8A8",
                        }}
                      />
                      <span className="truncate text-xs text-[#DCE4E4]">
                        {task.title}
                      </span>
                    </div>
                  ))}

                  {overflowCount > 0 && (
                    <span className="px-1 text-xs text-[#8FA8A8]">
                      +{overflowCount} more
                    </span>
                  )}
                </div>
              </div>
            );
          }),
        )}
      </div>

      {/* Selected day task list */}
      {selectedKey && (tasksByDate.get(selectedKey)?.length ?? 0) > 0 && (
        <div className="mt-3 border-t border-[#164B49]/50 pt-3">
          <h3 className="mb-2 text-sm font-medium text-[#8FA8A8]">
            {(() => {
              const [y, m, d] = selectedKey.split("-").map(Number);
              const date = new Date(y ?? 0, (m ?? 0) - 1, d);
              return date.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              });
            })()}
          </h3>
          <div className="flex flex-col gap-2">
            {(tasksByDate.get(selectedKey) ?? []).map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
