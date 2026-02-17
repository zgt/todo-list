import { Text, View } from "react-native";

import { PRIORITY_CONFIG, type PriorityLevel } from "./priority-config";

interface PriorityStatsProps {
  tasks: { priority: PriorityLevel }[];
}

export function PriorityStats({ tasks }: PriorityStatsProps) {
  const stats = {
    high: tasks.filter((t) => t.priority === "high").length,
    medium: tasks.filter((t) => t.priority === "medium").length,
    low: tasks.filter((t) => t.priority === "low").length,
  };

  if (tasks.length === 0) return null;

  return (
    <View className="flex-row justify-around px-4 pb-2">
      {(["high", "medium", "low"] as const).map((p) => {
        const config = PRIORITY_CONFIG[p];
        const count = stats[p];
        const Icon = config.Icon;

        return (
          <View key={p} className="flex-row items-center gap-2">
            <View
              className={`h-8 w-8 items-center justify-center rounded-full ${config.bgClass}`}
              style={{ borderWidth: 1, borderColor: config.borderColor }}
            >
              <Icon size={16} color={config.color} />
            </View>
            <View>
              <Text className="text-xs font-medium text-[#8FA8A8]">
                {config.label}
              </Text>
              <Text className="text-sm font-bold text-[#DCE4E4]">{count}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
