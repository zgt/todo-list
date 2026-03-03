import { memo, useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { CalendarList } from "react-native-calendars";
import { Check } from "lucide-react-native";

import type { PriorityLevel } from "./priority-config";
import type { LocalTask } from "~/db/client";
import { PRIORITY_CONFIG } from "./priority-config";
import { PriorityBadge } from "./PriorityBadge";

type CalendarTask = LocalTask & {
  category?: { name: string; color: string } | null;
  subtasks?: { id: string; title: string; completed: boolean }[];
};

interface CalendarViewProps {
  tasks: CalendarTask[];
  onToggle: (id: string, completed: boolean) => void;
  onTaskPress?: (id: string) => void;
  onSubtaskToggle?: (subtaskId: string, completed: boolean) => void;
}

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
  const date = new Date(year!, month! - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Priority to dot color mapping
const PRIORITY_DOT_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#50C878",
  low: "#3B82F6",
  none: "#8FA8A8",
};

const AgendaTaskRow = memo(
  ({
    task,
    onToggle,
    onPress,
  }: {
    task: CalendarTask;
    onToggle: (id: string, completed: boolean) => void;
    onPress?: (id: string) => void;
  }) => {
    return (
      <Pressable
        onPress={() => onPress?.(task.id)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: "#102A2A",
          borderRadius: 12,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: "#164B49",
        }}
        accessibilityRole="button"
        accessibilityLabel={`Task: ${task.title}`}
      >
        {/* Checkbox */}
        <Pressable
          onPress={() => onToggle(task.id, !task.completed)}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.completed }}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: task.completed ? "#50C878" : "#164B49",
            backgroundColor: task.completed
              ? "#50C878"
              : "transparent",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          {task.completed && <Check size={14} color="#0A1A1A" />}
        </Pressable>

        {/* Task info */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: task.completed ? "#4A6A6A" : "#DCE4E4",
              fontSize: 15,
              textDecorationLine: task.completed ? "line-through" : "none",
            }}
            numberOfLines={1}
          >
            {task.title}
          </Text>
        </View>

        {/* Priority badge */}
        <PriorityBadge
          priority={task.priority as PriorityLevel}
          size="sm"
          showLabel={false}
        />

        {/* Category dot */}
        {task.category && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: task.category.color,
              marginLeft: 8,
            }}
          />
        )}
      </Pressable>
    );
  },
);

const calendarTheme = {
  calendarBackground: "transparent",
  dayTextColor: "#DCE4E4",
  textDisabledColor: "#4A6A6A",
  monthTextColor: "#DCE4E4",
  textSectionTitleColor: "#8FA8A8",
  todayTextColor: "#50C878",
  selectedDayBackgroundColor: "#50C878",
  selectedDayTextColor: "#0A1A1A",
  arrowColor: "#50C878",
  textDayFontSize: 14,
  textMonthFontSize: 16,
  textDayHeaderFontSize: 12,
  textDayFontWeight: "400" as const,
  textMonthFontWeight: "700" as const,
  textDayHeaderFontWeight: "500" as const,
  "stylesheet.calendar.header": {
    week: {
      flexDirection: "row" as const,
      justifyContent: "space-around" as const,
      marginTop: 4,
      marginBottom: 4,
    },
  },
};

export function CalendarView({
  tasks,
  onToggle,
  onTaskPress,
}: CalendarViewProps) {
  const todayKey = toLocalDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);

  // Group tasks by local date key
  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
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

  // Build marked dates for the calendar with colored dots
  const markedDates = useMemo(() => {
    const marks: Record<
      string,
      {
        dots: { key: string; color: string }[];
        selected?: boolean;
        selectedColor?: string;
      }
    > = {};

    for (const [dateKey, dateTasks] of tasksByDate) {
      // Collect unique priority colors for dots (max 3)
      const seenColors = new Set<string>();
      const dots: { key: string; color: string }[] = [];

      for (const task of dateTasks) {
        const priorityKey = task.priority ?? "none";
        const color = PRIORITY_DOT_COLORS[priorityKey] ?? "#8FA8A8";
        if (!seenColors.has(color) && dots.length < 3) {
          seenColors.add(color);
          dots.push({ key: priorityKey, color });
        }
      }

      marks[dateKey] = { dots };
    }

    // Ensure selected date is always in marks
    if (marks[selectedDate]) {
      marks[selectedDate].selected = true;
      marks[selectedDate].selectedColor = "#50C878";
    } else {
      marks[selectedDate] = {
        dots: [],
        selected: true,
        selectedColor: "#50C878",
      };
    }

    return marks;
  }, [tasksByDate, selectedDate]);

  // Tasks for the selected day
  const selectedTasks = useMemo(
    () => tasksByDate.get(selectedDate) ?? [],
    [tasksByDate, selectedDate],
  );

  const handleDayPress = useCallback(
    (day: { dateString: string }) => {
      setSelectedDate(day.dateString);
    },
    [],
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Calendar section */}
      <View style={{ height: 340 }}>
        <CalendarList
          markingType="multi-dot"
          markedDates={markedDates}
          onDayPress={handleDayPress}
          current={todayKey}
          pastScrollRange={24}
          futureScrollRange={24}
          calendarHeight={340}
          theme={calendarTheme}
          showScrollIndicator={false}
        />
      </View>

      {/* Day agenda section */}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={{ flex: 1, paddingHorizontal: 4, paddingTop: 12 }}
      >
        {/* Date header */}
        <Text
          style={{
            color: "#DCE4E4",
            fontSize: 18,
            fontWeight: "600",
            marginBottom: 12,
            paddingHorizontal: 4,
          }}
        >
          {formatDateHeader(selectedDate)}
        </Text>

        {selectedTasks.length > 0 ? (
          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 80 }}
          >
            {selectedTasks.map((task) => (
              <AgendaTaskRow
                key={task.id}
                task={task}
                onToggle={onToggle}
                onPress={onTaskPress}
              />
            ))}
          </Animated.ScrollView>
        ) : (
          <View
            style={{
              alignItems: "center",
              paddingTop: 24,
            }}
          >
            <Text
              style={{
                color: "#8FA8A8",
                fontSize: 14,
                fontStyle: "italic",
              }}
            >
              No tasks for this day
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}
