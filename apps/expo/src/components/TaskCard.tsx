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

      <View className="flex-col h-full p-6 justify-between">
        {/* Top Row: Category and Checkbox */}
        <View className="flex-row justify-between items-start w-full">
          <View
            style={styles.categoryPill}
            className="rounded-full border px-4 py-1.5"
          >
            <RNText className="text-xs font-medium text-emerald-300">
              Work
            </RNText>
          </View>

          <Pressable onPress={onToggle}>
            <View
              className={`h-8 w-8 items-center justify-center rounded-full border-2 ${
                task.completed
                  ? "bg-primary border-primary"
                  : "border-white/30"
              }`}
            >
              {task.completed && <Check size={20} color="#0A1A1A" strokeWidth={3} />}
            </View>
          </Pressable>
        </View>

        {/* Middle: Title and Description */}
        <View className="flex-1 justify-center gap-2">
          <RNText
            className={`text-4xl font-bold leading-tight ${
              task.completed ? "text-white/70" : "text-white"
            }`}
          >
            {task.title}
          </RNText>
          {task.description && (
            <RNText className="text-white/60 text-lg leading-relaxed">
              {task.description}
            </RNText>
          )}
        </View>
        
        {/* Bottom Spacer or Date if available (keeping empty for now to push content up/center) */}
        <View />
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
