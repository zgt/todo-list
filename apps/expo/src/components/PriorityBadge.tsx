import { memo } from "react";
import { Text, View } from "react-native";

import { PRIORITY_CONFIG, type PriorityLevel } from "./priority-config";

interface PriorityBadgeProps {
  priority: PriorityLevel;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export const PriorityBadge = memo(
  ({ priority, size = "md", showLabel = true }: PriorityBadgeProps) => {
    // Map null to "none" for config lookup
    const config = PRIORITY_CONFIG[priority ?? "none"];
    const Icon = config.Icon;

    return (
      <View
        className={`flex-row items-center gap-1 rounded-full ${
          config.bgClass
        } ${size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1"}`}
        style={{ borderWidth: 1, borderColor: config.borderColor }}
      >
        <Icon size={size === "sm" ? 12 : 16} color={config.color} />
        {showLabel && (
          <Text className={`text-xs font-medium ${config.textClass}`}>
            {config.label}
          </Text>
        )}
      </View>
    );
  },
);
