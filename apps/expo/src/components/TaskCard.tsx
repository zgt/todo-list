import {
  Pressable,
  Text as RNText,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Check, Save, Trash2 } from "lucide-react-native";

import type { LocalTask } from "~/db/client";
import { CategoryWheelPicker } from "./CategoryWheelPicker";
import { DatePickerPill } from "./DatePickerPill";

interface TaskCardProps {
  task: LocalTask & { category?: { name: string; color: string } | null };
  variant?: "card" | "compact";
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
}

export function TaskCard({
  task,
  variant = "card",
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
}: TaskCardProps) {
  // Local state removed in favor of controlled props from SwipeableCard

  const handleSave = () => {
    if (title.trim()) {
      onSave({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        dueDate,
      });
    }
  };

  // Compact variant - horizontal row layout (80px height)
  if (variant === "compact") {
    return (
      <View
        style={[
          styles.compactContainer,
          task.completed ? styles.cardCompleted : styles.cardDefault,
          deletePending && styles.cardDeletePending,
          isEditing && styles.cardEditing,
        ]}
      >
        <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />

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
                <RNText
                  className={`text-base font-semibold ${
                    task.completed ? "text-white/70 line-through" : "text-white"
                  }`}
                  numberOfLines={1}
                >
                  {task.title}
                </RNText>
                {task.description && (
                  <RNText
                    className="text-sm text-white/50"
                    numberOfLines={1}
                  >
                    {task.description}
                  </RNText>
                )}
              </>
            )}
          </View>

          {/* Right: Category and Due Date Pills */}
          {isEditing ? (
            <View className="flex-row items-center gap-1">
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
      </View>
    );
  }

  // Card variant - full card layout (original)
  return (
    <View
      style={[
        styles.cardContainer,
        task.completed ? styles.cardCompleted : styles.cardDefault,
        deletePending && styles.cardDeletePending,
        isEditing && styles.cardEditing,
      ]}
      className="mb-3 overflow-hidden rounded-2xl"
    >
      <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />

      <View className="h-full flex-col justify-between p-6">
        {/* Top Row: Category and Checkbox */}
        {/* Top Row: Category and Due Date vs Checkbox */}
        <View className="w-full flex-row items-start justify-between">
          {isEditing ? (
            /* Interactive Pickers in Edit Mode */
            <View className="flex-row items-center gap-2">
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
            /* Read-only Pills in View Mode */
            <View className="flex-row items-center gap-2">
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
                  <RNText
                    className="text-xs font-medium"
                    style={styles.dateText}
                  >
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                    }).format(task.dueDate)}
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
            </>
          )}
        </View>

        {/* Bottom Spacer or Date if available and Delete Prompt */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  compactContainer: {
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
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
    borderColor: "rgba(239, 68, 68, 0.6)", // Red-500
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    shadowColor: "#ef4444",
    shadowOpacity: 0.2,
  },
  cardEditing: {
    borderWidth: 2,
    borderColor: "rgba(249, 115, 22, 0.6)", // Orange-500
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
