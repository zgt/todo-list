import { Pressable, Text as RNText, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { Calendar, Check, Trash2 } from "lucide-react-native";

import type { RouterOutputs } from "~/utils/api";

interface TaskCardProps {
  task: RouterOutputs["task"]["all"][number];
  onToggle: () => void;
  onDelete: () => void;
  deletePending: boolean;
}

export function TaskCard({
  task,
  onToggle,
  onDelete,
  deletePending,
}: TaskCardProps) {
  return (
    <View
      style={[
        styles.cardContainer,
        task.completed ? styles.cardCompleted : styles.cardDefault,
        deletePending && styles.cardDeletePending,
      ]}
      className="mb-3 overflow-hidden rounded-2xl"
    >
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

      <View className="h-full flex-col justify-between p-6">
        {/* Top Row: Category and Checkbox */}
        {/* Top Row: Category and Due Date vs Checkbox */}
        <View className="w-full flex-row items-start justify-between">
          <View className="flex-col gap-2 min-h-14">
            {/* Category Pill */}
            {task.category && (
              <View
                style={[
                  styles.categoryPill,
                  task.category.color
                    ? {
                        backgroundColor: `${task.category.color}20`, // 10% opacity
                        borderColor: `${task.category.color}50`, // 30% opacity
                      }
                    : {},
                ]}
                className="self-start rounded-full border px-4 py-1.5"
              >
                <RNText
                  style={task.category.color ? { color: task.category.color } : {}}
                  className="text-xs font-medium text-emerald-300"
                >
                  {task.category.name}
                </RNText>
              </View>
            )}

            {/* Due Date - Always render to reserve space, hide with opacity if missing */}
            <View 
              className="flex-row items-center gap-1.5 px-1"
              style={{ opacity: task.dueDate ? 1 : 0 }}
            >
              <Calendar size={14} className="opacity-60" color="white" />
              <RNText className="text-xs font-medium text-white/60">
                {task.dueDate ? (
                  new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                  }).format(task.dueDate)
                ) : (
                  "placeholder"
                )}
              </RNText>
            </View>
          </View>

          <Pressable onPress={onToggle}>
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
  cardDefault: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
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
  categoryPill: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
});
