import { useEffect, useRef } from "react";
import {
  Dimensions,
  LayoutAnimation,
  Platform,
  Pressable,
  Text as RNText,
  StyleSheet,
  UIManager,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Bell, Check, Trash2 } from "lucide-react-native";

import type { PriorityLevel } from "./priority-config";
import type { LocalTask } from "~/db/client";
import { PriorityBadge } from "./PriorityBadge";
import { PrioritySelector } from "./PrioritySelector";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  onSave: (
    updates: Partial<{
      title: string;
      description: string;
      categoryId: string | null;
      dueDate: Date | null;
      priority: PriorityLevel;
    }>,
  ) => void;
  priority: PriorityLevel;
  onChangePriority: (priority: PriorityLevel) => void;
  onSubtaskToggle?: (subtaskId: string, completed: boolean) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onTaskPress?: () => void;
}

const CARD_HEIGHT = SCREEN_HEIGHT * 0.65;
const COMPACT_HEIGHT = 92;

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
  subtasks?: {
    id: string;
    title: string;
    completed: boolean;
    sortOrder: number;
  }[];
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
      weekday: "short",
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
  onSave,
  priority,
  onChangePriority,
  onSubtaskToggle,
  isExpanded,
  onToggleExpand,
  onTaskPress,
}: TaskCardProps) {
  const reminderAt = (task as unknown as TaskWithReminder).reminderAt ?? null;
  const reminderSentAt =
    (task as unknown as TaskWithReminder).reminderSentAt ?? null;
  const reminderInfo =
    reminderAt && !task.completed
      ? getReminderDisplay(reminderAt, reminderSentAt)
      : null;
  const rawSubtasks = (task as unknown as TaskWithSubtasks).subtasks ?? [];
  // Sort: incomplete first (preserve sortOrder), completed sink to bottom
  const subtasks = [...rawSubtasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.sortOrder - b.sortOrder;
  });
  const subtaskTotal = subtasks.length;
  const subtaskDone = subtasks.filter((s) => s.completed).length;
  const progress = useSharedValue(isCompact ? 1 : 0);

  // Double-tap detection for compact mode
  const lastTapRef = useRef(0);
  const singleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCardPress = () => {
    if (!isCompact) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap → open edit form
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      if (onTaskPress) {
        onTaskPress();
      }
    } else {
      // Single tap - wait to see if it's a double tap
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
      }
      singleTapTimeoutRef.current = setTimeout(() => {
        if (isExpanded) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onToggleExpand();
        } else if (subtaskTotal > 0 || task.description) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onToggleExpand();
        } else if (onTaskPress) {
          onTaskPress();
        }
      }, 250);
    }

    lastTapRef.current = now;
  };

  useEffect(() => {
    progress.value = withSpring(isCompact ? 1 : 0, SPRING_CONFIG);
  }, [isCompact, progress]);

  // Animated container style
  const containerStyle = useAnimatedStyle(() => {
    // When expanded in compact mode, use auto height
    // Otherwise use the interpolated height
    const baseHeight = interpolate(
      progress.value,
      [0, 1],
      [CARD_HEIGHT, COMPACT_HEIGHT],
    );
    const borderRadius = interpolate(progress.value, [0, 1], [16, 12]);

    return {
      height: isCompact ? undefined : baseHeight,
      minHeight: isCompact ? COMPACT_HEIGHT : undefined,
      flex: isCompact && isExpanded ? 1 : undefined,
      borderRadius,
    };
  });

  // Get background style based on state
  const getBackgroundStyle = () => {
    if (deletePending) return styles.cardDeletePending;
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
    <View
      style={
        isExpanded
          ? { flex: 1, justifyContent: "center" }
          : { flex: 1, justifyContent: "center" }
      }
    >
      <Pressable onPress={handleCardPress}>
        <View className="flex-row items-center gap-3 px-4 py-3">
          {/* Left: Checkbox */}
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggle();
            }}
          >
            <View
              className={`h-7 w-7 items-center justify-center rounded-full border-2 ${
                task.completed ? "bg-primary border-primary" : "border-white/30"
              }`}
            >
              {task.completed && (
                <Check size={16} color="#0A1A1A" strokeWidth={3} />
              )}
            </View>
          </Pressable>

          {/* Middle: Title and metadata */}
          <View className="flex-1 justify-center">
            <RNText
              className={`text-xl font-extrabold ${
                task.completed ? "line-through" : ""
              }`}
              numberOfLines={1}
              style={{
                color: task.completed ? "#8FA8A8" : "#DCE4E4",
              }}
            >
              {task.title}
            </RNText>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 3,
                flexWrap: "wrap",
                rowGap: 4,
              }}
            >
              {reminderInfo && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Bell size={10} color={reminderInfo.color} />
                  <RNText style={{ fontSize: 11, color: reminderInfo.color }}>
                    {reminderInfo.label}
                  </RNText>
                </View>
              )}
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
                      width: 5,
                      height: 5,
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
              {priority !== "medium" && (
                <PrioritySelector
                  value={priority}
                  onChange={(p) => {
                    onChangePriority(p);
                    onSave({ priority: p });
                  }}
                  trigger={
                    <PriorityBadge
                      priority={priority}
                      size="xs"
                      showLabel={false}
                    />
                  }
                />
              )}
              {task.dueDate && (
                <View style={styles.compactPillDate}>
                  <RNText style={{ fontSize: 11, color: "#8FA8A8" }}>
                    {new Intl.DateTimeFormat("en-US", {
                      weekday: "short",
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
                    style={{ color: "#8FA8A8", fontSize: 11 }}
                    numberOfLines={1}
                  >
                    {task.category.name}
                  </RNText>
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>

      {/* Expanded description and subtasks section */}
      {isExpanded && (!!task.description || subtaskTotal > 0) && (
        <View style={styles.expandedSubtasksContainer}>
          {task.description && (
            <RNText style={styles.expandedDescription}>
              {task.description}
            </RNText>
          )}
          {subtaskTotal > 0 && onSubtaskToggle && (
            <View style={task.description ? { marginTop: 8 } : undefined}>
              {subtasks.map((subtask, index) => (
                <Animated.View
                  key={subtask.id}
                  layout={LinearTransition.springify()
                    .damping(18)
                    .stiffness(120)}
                >
                  {index > 0 && <View style={styles.subtaskSeparator} />}
                  <Pressable
                    onPress={() => {
                      void Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light,
                      );
                      onSubtaskToggle(subtask.id, !subtask.completed);
                    }}
                    style={styles.subtaskRowCompact}
                  >
                    <View
                      style={[
                        styles.subtaskCheckboxCompact,
                        subtask.completed
                          ? styles.subtaskCheckboxChecked
                          : styles.subtaskCheckboxUnchecked,
                      ]}
                    >
                      {subtask.completed && (
                        <RNText style={styles.subtaskCheckmark}>✓</RNText>
                      )}
                    </View>
                    <RNText
                      style={[
                        styles.subtaskTitleCompact,
                        subtask.completed && styles.subtaskTitleCompleted,
                      ]}
                      numberOfLines={1}
                    >
                      {subtask.title}
                    </RNText>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );

  const maxVisibleSubtasks = Math.max(4, Math.floor((CARD_HEIGHT - 260) / 28));

  // Card layout (column)
  const renderCardLayout = () => (
    <View className="h-full flex-col justify-between p-6">
      {/* Top Row: Category and Due Date vs Checkbox */}
      <View className="w-full flex-row items-start justify-between">
        <View className="flex-row items-center gap-2">
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
                  weekday: "short",
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

        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle();
          }}
        >
          <View
            className={`h-8 w-8 items-center justify-center rounded-full border-2 ${
              task.completed ? "bg-primary border-primary" : "border-white/30"
            }`}
          >
            {task.completed && (
              <Check size={20} color="#0A1A1A" strokeWidth={3} />
            )}
          </View>
        </Pressable>
      </View>

      {/* Middle: Title and Description */}
      <View className="flex-1 justify-center gap-2">
        <RNText
          style={{
            fontSize: 36,
            lineHeight: 40,
            fontWeight: "800",
            color: task.completed ? "#8FA8A8" : "#DCE4E4",
          }}
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

        {/* Subtasks in card view */}
        {subtaskTotal > 0 && onSubtaskToggle && (
          <View style={styles.subtasksContainer}>
            {subtasks.slice(0, maxVisibleSubtasks).map((subtask) => (
              <Pressable
                key={subtask.id}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSubtaskToggle(subtask.id, !subtask.completed);
                }}
                style={styles.subtaskRowCard}
              >
                <View
                  style={[
                    styles.subtaskCheckbox,
                    subtask.completed
                      ? styles.subtaskCheckboxChecked
                      : styles.subtaskCheckboxUnchecked,
                  ]}
                >
                  {subtask.completed && (
                    <RNText style={styles.subtaskCheckmark}>✓</RNText>
                  )}
                </View>
                <RNText
                  style={[
                    styles.subtaskTitle,
                    subtask.completed && styles.subtaskTitleCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {subtask.title}
                </RNText>
              </Pressable>
            ))}
            {subtaskTotal > maxVisibleSubtasks && (
              <RNText style={styles.moreSubtasks}>
                +{subtaskTotal - maxVisibleSubtasks} more
              </RNText>
            )}
          </View>
        )}
      </View>

      {/* Bottom: Delete Prompt */}
      <View className="items-center">
        {deletePending && (
          <Pressable
            onPress={() => {
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning,
              );
              onDelete();
            }}
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
          { backgroundColor: "rgba(10, 26, 26, 0.7)", borderRadius: 12 },
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
    shadowOpacity: 9,
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
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9999,
    borderWidth: 1,
  },
  compactPillDate: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9999,
    borderWidth: 1,
    backgroundColor: "rgba(143, 168, 168, 0.1)",
    borderColor: "rgba(143, 168, 168, 0.3)",
  },
  dateText: {
    color: "#8FA8A8",
  },
  subtasksContainer: {
    marginTop: 12,
    gap: 6,
  },
  subtaskRowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  subtaskCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  subtaskCheckboxChecked: {
    borderColor: "#50C878",
    backgroundColor: "#50C878",
  },
  subtaskCheckboxUnchecked: {
    borderColor: "#8FA8A8",
    backgroundColor: "transparent",
  },
  subtaskCheckmark: {
    fontSize: 10,
    color: "#0A1A1A",
    fontWeight: "700",
    lineHeight: 12,
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 14,
    color: "#DCE4E4",
  },
  subtaskTitleCompleted: {
    color: "#8FA8A8",
    textDecorationLine: "line-through",
  },
  moreSubtasks: {
    fontSize: 12,
    color: "#8FA8A8",
    fontStyle: "italic",
    marginLeft: 24,
  },
  expandedSubtasksContainer: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 32,
    paddingRight: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(22, 75, 73, 0.5)",
  },
  expandedDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
    lineHeight: 18,
  },
  subtaskRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  subtaskCheckboxCompact: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  subtaskTitleCompact: {
    flex: 1,
    fontSize: 13,
    color: "#DCE4E4",
  },
  subtaskSeparator: {
    height: 1,
    backgroundColor: "rgba(22, 75, 73, 0.3)",
    marginVertical: 2,
  },
});
