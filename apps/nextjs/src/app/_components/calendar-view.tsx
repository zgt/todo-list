"use client";

import { useMemo, useState } from "react";

import type { RouterOutputs } from "@acme/api";
import { Calendar } from "@acme/ui/calendar";

import { TaskCard } from "./tasks";

type Task = RouterOutputs["task"]["all"][number];

/** Extract local date string (YYYY-MM-DD) without UTC conversion */
function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Format a date key for display */
function formatDateHeader(dateKey: string): string {
  const today = toLocalDateKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toLocalDateKey(tomorrow);

  if (dateKey === today) return "Today";
  if (dateKey === tomorrowKey) return "Tomorrow";

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year ?? 0, (month ?? 0) - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const PRIORITY_DOT_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#3B82F6",
  none: "#8FA8A8",
};

interface CalendarViewProps {
  tasks: Task[];
}

export function CalendarView({ tasks }: CalendarViewProps) {
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const selectedKey = toLocalDateKey(selectedDate);

  // Group tasks by local date key
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = toLocalDateKey(task.dueDate);
      const existing = map.get(key);
      if (existing) {
        existing.push(task);
      } else {
        map.set(key, [task]);
      }
    }
    return map;
  }, [tasks]);

  // Tasks for the selected day
  const selectedTasks = useMemo(
    () => tasksByDate.get(selectedKey) ?? [],
    [tasksByDate, selectedKey],
  );

  // Dates that have tasks (for modifiers)
  const datesWithTasks = useMemo(() => {
    const dates: Date[] = [];
    for (const key of tasksByDate.keys()) {
      const [y, m, d] = key.split("-").map(Number);
      dates.push(new Date(y ?? 0, (m ?? 0) - 1, d));
    }
    return dates;
  }, [tasksByDate]);

  // Build priority dot data per date for the custom DayButton
  const dotsByDateKey = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [dateKey, dateTasks] of tasksByDate) {
      const seenColors = new Set<string>();
      const dots: string[] = [];
      for (const task of dateTasks) {
        const color = PRIORITY_DOT_COLORS[task.priority ?? "none"] ?? "#8FA8A8";
        if (!seenColors.has(color) && dots.length < 3) {
          seenColors.add(color);
          dots.push(color);
        }
      }
      map.set(dateKey, dots);
    }
    return map;
  }, [tasksByDate]);

  return (
    <div className="flex flex-col gap-6">
      {/* Calendar grid */}
      <div className="mx-auto w-full max-w-sm rounded-xl border border-[#164B49] bg-[#102A2A]/80 p-2 backdrop-blur-sm">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          modifiers={{ hasTasks: datesWithTasks }}
          components={{
            DayButton: ({
              day,
              modifiers: _modifiers,
              className,
              ...buttonProps
            }) => {
              const dateKey = toLocalDateKey(day.date);
              const dots = dotsByDateKey.get(dateKey);
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedKey;

              return (
                <button
                  {...buttonProps}
                  className={className}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "2px",
                    ...(isSelected
                      ? {
                          backgroundColor: "#50C878",
                          color: "#0A1A1A",
                          borderRadius: "6px",
                        }
                      : isToday
                        ? {
                            backgroundColor: "rgba(80,200,120,0.2)",
                            color: "#50C878",
                            borderRadius: "6px",
                          }
                        : {}),
                  }}
                >
                  <span>{day.date.getDate()}</span>
                  {dots && dots.length > 0 && (
                    <span
                      style={{ display: "flex", gap: "2px", height: "4px" }}
                    >
                      {dots.map((color, i) => (
                        <span
                          key={i}
                          style={{
                            width: "4px",
                            height: "4px",
                            borderRadius: "50%",
                            backgroundColor: color,
                          }}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            },
          }}
        />
      </div>

      {/* Day agenda */}
      <div>
        <h3 className="mb-3 px-1 text-lg font-semibold text-[#DCE4E4]">
          {formatDateHeader(selectedKey)}
        </h3>

        {selectedTasks.length > 0 ? (
          <div className="flex flex-col gap-4">
            {selectedTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-[#8FA8A8] italic">
              No tasks for this day
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
