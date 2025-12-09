import { StyleSheet, Pressable, View, Text as RNText } from "react-native";
import { BlurView } from "expo-blur";
import { Check } from "lucide-react-native";

import type { RouterOutputs } from "~/utils/api";

interface TaskCardProps {
  task: RouterOutputs["task"]["all"][number];
  onToggle: () => void;
  onDelete: () => void;
}

export function TaskCard({ task, onToggle, onDelete: _onDelete }: TaskCardProps) {
  return (
    <View
      style={[
        styles.cardContainer,
        task.completed ? styles.cardCompleted : styles.cardDefault,
      ]}
      className="mb-3 overflow-hidden rounded-2xl"
    >
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

      <View className="flex-row items-center gap-4 p-6">
        <Pressable onPress={onToggle}>
          <View
            className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
              task.completed
                ? "bg-primary border-primary"
                : "border-white/30"
            }`}
          >
            {task.completed && <Check size={16} color="#0A1A1A" strokeWidth={3} />}
          </View>
        </Pressable>

        <View className="flex-1">
          <RNText
            className={`text-lg font-medium ${
              task.completed ? "text-white/70" : "text-white"
            }`}
          >
            {task.title}
          </RNText>
          {task.description && (
            <RNText className="text-muted-foreground mt-1 text-sm">
              {task.description}
            </RNText>
          )}
        </View>

        {/* Category pill */}
        <View
          style={styles.categoryPill}
          className="rounded-full border px-4 py-1.5"
        >
          <RNText className="text-xs font-medium text-emerald-300">
            Work
          </RNText>
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
  categoryPill: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
});
