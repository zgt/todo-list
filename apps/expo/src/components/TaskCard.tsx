import { useEffect } from "react";
import {
  Dimensions,
  Pressable,
  Text as RNText,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Bell, Check, Save, Trash2 } from "lucide-react-native";

import type { PriorityLevel } from "./priority-config";
import type { LocalTask } from "~/db/client";
import { CategoryWheelPicker } from "./CategoryWheelPicker";
import { DatePickerPill } from "./DatePickerPill";
import { PriorityBadge } from "./PriorityBadge";
import { PrioritySelector } from "./PrioritySelector";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface TaskCardProps {
  task: LocalTask & {
    category?: { name: string; color: string } | null;
    list?: { id: string; name: string; color: string | null } | null;
  };
  isCompact: boolean;
  onToggle: () => void;
  onDelete: () => void;
  deletePending: boolean;
  isEditing: boolean;
  onSave: (
    updates: Partial<{
      title: string;
      description: string;
      categoryId: string | null;
      dueDate: Date | null;
      priority: PriorityLevel;
    }>,
  ) => void;
  title: string;
  description: string;
  onChangeTitle: (text: string) => void;
  onChangeDescription: (text: string) => void;
  categoryId: string | null;
  dueDate: Date | null;
  onChangeCategoryId: (categoryId: string | null) => void;
  onChangeDueDate: (date: Date | null) => void;
  priority: PriorityLevel;
  onChangePriority: (priority: PriorityLevel) => void;
}

const CARD_HEIGHT = SCREEN_HEIGHT * 0.65;
const COMPACT_HEIGHT = 80;

const SPRING_CONFIG = {
  damping: 400,
  stiffness: 800,
};

// Server tasks include reminderAt/reminderSentAt but LocalTask type doesn't
interface TaskWithReminder {
  reminderAt?: Date | null;
  reminderSentAt?: Date | null;
}

// Server tasks include subtasks but LocalTask type doesn't
interface TaskWithSubtasks {
  subtasks?: { id: string; completed: boolean }[];
}

function getReminderDisplay(reminderAt: Date, reminderSentAt: Date | null) {
  const now = new Date();
  const diff = reminderAt.getTime() - now.getTime();
  const isPast = diff < 0;
  const isSent = !!reminderSentAt;
  const isImminent = !isPast && diff <= 60 * 60 * 1000;

  let label: string;
  let color: string;

  if (isPast && isSent) {
    label = "Reminded";
    color = "#8FA8A8"; // muted gray
  } else if (isPast) {
    label = "Overdue";
    color = "#E5A04D"; // amber
  } else if (isImminent) {
    const minutes = Math.floor(diff / 60000);
    label = minutes < 60 ? `in ${minutes}m` : "in <1h";
    color = "#50C878"; // accent green
  } else {
    label = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(reminderAt);
    color = "#50C878";
  }

  return { label, color, isPast, isSent, isImminent };
}

export function TaskCard({
  task,
  isCompact,
  onToggle,
  onDelete,
  deletePending,
  isEditing,
  onSave,
  title,
  description,
  onChangeTitle,
  onChangeDescription,
  categoryId,
  dueDate,
  onChangeCategoryId,
  onChangeDueDate,
  priority,
  onChangePriority,
}: TaskCardProps) {
  const reminderAt = (task as unknown as TaskWithReminder).reminderAt ?? null;
  const reminderSentAt =
    (task as unknown as TaskWithReminder).reminderSentAt ?? null;
  const reminderInfo = reminderAt
    ? getReminderDisplay(reminderAt, reminderSentAt)
    : null;
  const subtasks = (task as unknown as TaskWithSubtasks).subtasks ?? [];
  const subtaskTotal = subtasks.length;
  const subtaskDone = subtasks.filter((s) => s.completed).length;
  const progress = useSharedValue(isCompact ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isCompact ? 1 : 0, SPRING_CONFIG);
  }, [isCompact, progress]);

  const handleSave = () => {
    if (title.trim()) {
      onSave({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        dueDate,
        priority,
      });
    }
  };

  // Animated container style
  const containerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      progress.value,
      [0, 1],
      [CARD_HEIGHT, COMPACT_HEIGHT],
    );
    const borderRadius = interpolate(progress.value, [0, 1], [16, 12]);

    return {
      height,
      borderRadius,
    };
  });

  // Get background style based on state
  const getBackgroundStyle = () => {
    if (deletePending) return styles.cardDeletePending;
    if (isEditing) return styles.cardEditing;
    if (task.completed) return styles.cardCompleted;

    // High priority accent
    if (priority === "high") {
      return {
        ...styles.cardDefault,
        borderWidth: 1,
        borderColor: "rgba(239, 68, 68, 0.4)",
        backgroundColor: "rgba(239, 68, 68, 0.05)",
      };
    }

    // Medium priority accent
    if (priority === "medium") {
      return {
        ...styles.cardDefault,
        borderWidth: 1,
        borderColor: "rgba(80, 200, 120, 0.3)",
      };
    }

    return styles.cardDefault;
  };

  // Compact layout (row)
  const renderCompactLayout = () => (
    <View className="flex-1 flex-row items-center gap-3 px-4">
      {/* Left: Checkbox */}
      <Pressable onPress={isEditing ? handleSave : onToggle}>
        <View
          className={`h-7 w-7 items-center justify-center rounded-full border-2 ${
            isEditing
              ? "bg-primary border-primary"
              : task.completed
                ? "bg-primary border-primary"
                : "border-white/30"
          }`}
        >
          {isEditing ? (
            <Save size={14} color="#0A1A1A" strokeWidth={3} />
          ) : (
            task.completed && (
              <Check size={16} color="#0A1A1A" strokeWidth={3} />
            )
          )}
        </View>
      </Pressable>

      {/* Middle: Title and Description */}
      <View className="flex-1 justify-center">
        {isEditing ? (
          <View className="gap-1">
            <TextInput
              value={title}
              onChangeText={onChangeTitle}
              className="border-b border-white/30 bg-transparent py-1 text-base font-semibold text-white"
              placeholder="Task Title"
              autoFocus
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
            />
            <TextInput
              value={description}
              onChangeText={onChangeDescription}
              className="bg-transparent py-1 text-sm text-white/70"
              placeholder="Description"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
            />
          </View>
        ) : (
          <>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <RNText
                className={`text-base font-semibold ${
                  task.completed ? "text-white/70 line-through" : "text-white"
                }`}
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {task.title}
              </RNText>
              {reminderInfo && <Bell size={12} color={reminderInfo.color} />}
              {subtaskTotal > 0 && (
                <RNText style={{ fontSize: 11, color: "#8FA8A8" }}>
                  {subtaskDone}/{subtaskTotal} ✓
                </RNText>
              )}
              {task.list && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: task.list.color ?? "#50C878",
                    }}
                  />
                  <RNText
                    style={{ fontSize: 11, color: "#8FA8A8" }}
                    numberOfLines={1}
                  >
                    {task.list.name}
                  </RNText>
                </View>
              )}
            </View>
            {task.description ? (
              <RNText className="text-sm text-white/50" numberOfLines={1}>
                {task.description}
              </RNText>
            ) : reminderInfo ? (
              <RNText
                style={{ fontSize: 11, color: reminderInfo.color }}
                numberOfLines={1}
              >
                {reminderInfo.label}
              </RNText>
            ) : null}
          </>
        )}
      </View>

      {/* Right: Category and Due Date Pills */}
      {isEditing ? (
        <View className="flex-row items-center gap-1">
          <PrioritySelector
            value={priority}
            onChange={onChangePriority}
            trigger={
              <PriorityBadge priority={priority} size="sm" showLabel={false} />
            }
          />
          <CategoryWheelPicker
            selectedCategoryId={categoryId}
            onCategoryChange={onChangeCategoryId}
          />
          <DatePickerPill
            selectedDate={dueDate}
            onDateChange={onChangeDueDate}
          />
        </View>
      ) : (
        <View className="flex-row items-center gap-1">
          <PrioritySelector
            value={priority}
            onChange={(p) => {
              onChangePriority(p);
              onSave({ priority: p });
            }}
            trigger={
              <PriorityBadge priority={priority} size="sm" showLabel={false} />
            }
          />
          {task.dueDate && (
            <View style={styles.compactPillDate}>
              <RNText className="text-xs" style={styles.dateText}>
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                }).format(task.dueDate)}
              </RNText>
            </View>
          )}
          {task.category && (
            <View
              style={[
                styles.compactPill,
                {
                  backgroundColor: `${task.category.color}20`,
                  borderColor: task.category.color,
                },
              ]}
            >
              <RNText
                style={{ color: "#8FA8A8" }}
                className="text-xs"
                numberOfLines={1}
              >
                {task.category.name}
              </RNText>
            </View>
          )}
        </View>
      )}
    </View>
  );

  // Card layout (column)
  const renderCardLayout = () => (
    <View className="h-full flex-col justify-between p-6">
      {/* Top Row: Category and Due Date vs Checkbox */}
      <View className="w-full flex-row items-start justify-between">
        {isEditing ? (
          <View className="flex-row items-center gap-2">
            <PrioritySelector
              value={priority}
              onChange={onChangePriority}
              trigger={
                <PriorityBadge
                  priority={priority}
                  size="sm"
                  showLabel={false}
                />
              }
            />
            <CategoryWheelPicker
              selectedCategoryId={categoryId}
              onCategoryChange={onChangeCategoryId}
            />
            <DatePickerPill
              selectedDate={dueDate}
              onDateChange={onChangeDueDate}
            />
          </View>
        ) : (
          <View className="flex-row items-center gap-2">
            <PrioritySelector
              value={priority}
              onChange={(p) => {
                onChangePriority(p);
                onSave({ priority: p });
              }}
              trigger={
                <PriorityBadge
                  priority={priority}
                  size="sm"
                  showLabel={false}
                />
              }
            />
            {task.category && (
              <View
                style={[
                  styles.miniPill,
                  {
                    backgroundColor: `${task.category.color}20`,
                    borderColor: task.category.color,
                  },
                ]}
              >
                <RNText
                  style={{ color: "#8FA8A8" }}
                  className="text-xs font-medium"
                  numberOfLines={1}
                >
                  {task.category.name}
                </RNText>
              </View>
            )}
            {task.dueDate && (
              <View style={styles.miniPillDate}>
                <RNText className="text-xs font-medium" style={styles.dateText}>
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                  }).format(task.dueDate)}
                </RNText>
              </View>
            )}
            {task.list && (
              <View
                style={[
                  styles.miniPill,
                  {
                    backgroundColor: `${task.list.color ?? "#50C878"}20`,
                    borderColor: task.list.color ?? "#50C878",
                  },
                ]}
              >
                <RNText
                  style={{ color: "#8FA8A8" }}
                  className="text-xs font-medium"
                  numberOfLines={1}
                >
                  {task.list.name}
                </RNText>
              </View>
            )}
          </View>
        )}

        <Pressable onPress={isEditing ? handleSave : onToggle}>
          <View
            className={`h-8 w-8 items-center justify-center rounded-full border-2 ${
              isEditing
                ? "bg-primary border-primary"
                : task.completed
                  ? "bg-primary border-primary"
                  : "border-white/30"
            }`}
          >
            {isEditing ? (
              <Save size={18} color="#0A1A1A" strokeWidth={3} />
            ) : (
              task.completed && (
                <Check size={20} color="#0A1A1A" strokeWidth={3} />
              )
            )}
          </View>
        </Pressable>
      </View>

      {/* Middle: Title and Description */}
      <View className="flex-1 justify-center gap-2">
        {isEditing ? (
          <>
            <TextInput
              value={title}
              onChangeText={onChangeTitle}
              className="mb-2 border-b-2 border-white/50 bg-black/20 p-2 text-4xl leading-tight font-bold text-white"
              placeholder="Task Title"
              autoFocus
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
            />
            <TextInput
              value={description}
              onChangeText={onChangeDescription}
              className="border-b-2 border-white/50 bg-black/20 p-2 text-lg leading-relaxed text-white/90"
              placeholder="Description (optional)"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              multiline
              textAlignVertical="top"
            />
          </>
        ) : (
          <>
            <RNText
              className={`text-4xl leading-tight font-bold ${
                task.completed ? "text-white/70" : "text-white"
              }`}
            >
              {task.title}
            </RNText>
            {task.description && (
              <RNText className="text-lg leading-relaxed text-white/60">
                {task.description}
              </RNText>
            )}
            {reminderInfo && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <Bell size={14} color={reminderInfo.color} />
                <RNText style={{ fontSize: 13, color: reminderInfo.color }}>
                  {reminderInfo.label}
                </RNText>
              </View>
            )}
            {subtaskTotal > 0 && (
              <RNText style={{ fontSize: 13, color: "#8FA8A8", marginTop: 4 }}>
                {subtaskDone}/{subtaskTotal} ✓
              </RNText>
            )}
          </>
        )}
      </View>

      {/* Bottom: Delete Prompt */}
      <View className="items-center">
        {deletePending && (
          <Pressable
            onPress={onDelete}
            className="flex-row items-center gap-2 rounded-full bg-red-500/20 px-4 py-2 active:opacity-80"
          >
            <Trash2 size={16} color="#ef4444" />
            <RNText className="font-bold text-red-500">
              Swipe up again to delete
            </RNText>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <Animated.View
      style={[styles.container, containerStyle, getBackgroundStyle()]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(10, 26, 26, 0.7)" },
        ]}
      />
      {isCompact ? renderCompactLayout() : renderCardLayout()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  cardDefault: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  cardCompleted: {
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.5)",
    backgroundColor: "rgba(74, 222, 128, 0.05)",
    shadowColor: "#4ade80",
    shadowOpacity: 0.1,
  },
  cardDeletePending: {
    borderWidth: 2,
    borderColor: "rgba(239, 68, 68, 0.6)",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    shadowColor: "#ef4444",
    shadowOpacity: 0.2,
  },
  cardEditing: {
    borderWidth: 2,
    borderColor: "rgba(249, 115, 22, 0.6)",
    backgroundColor: "rgba(249, 115, 22, 0.1)",
    shadowColor: "#f97316",
    shadowOpacity: 0.2,
  },
  miniPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 2,
  },
  miniPillDate: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 2,
    backgroundColor: "rgba(143, 168, 168, 0.15)",
    borderColor: "rgba(143, 168, 168, 0.4)",
  },
  compactPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1.5,
    maxWidth: 80,
  },
  compactPillDate: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1.5,
    backgroundColor: "rgba(143, 168, 168, 0.15)",
    borderColor: "rgba(143, 168, 168, 0.4)",
  },
  dateText: {
    color: "#8FA8A8",
  },
});
