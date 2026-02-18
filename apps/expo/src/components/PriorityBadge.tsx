import { memo } from "react";
import { Text, View } from "react-native";

import type { PriorityLevel } from "./priority-config";
import { PRIORITY_CONFIG } from "./priority-config";

interface PriorityBadgeProps {
  priority: PriorityLevel;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export const PriorityBadge = memo(
  ({ priority, size = "md", showLabel = true }: PriorityBadgeProps) => {
    // Map null to "none" for config lookup
    const config = PRIORITY_CONFIG[priority ?? "none"];
    if (!config) return null;
    const Icon = config.Icon;

    return (
      <View
        className={`flex-row items-center gap-1 rounded-full ${config.bgClass}`}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderWidth: 2,
          borderColor: `${config.color}60`,
          borderRadius: 9999,
        }}
      >
        <Icon size={size === "sm" ? 12 : 16} color={`${config.color}CC`} />
        {showLabel && (
          <Text className={`text-xs font-medium ${config.textClass}`}>
            {config.label}
          </Text>
        )}
      </View>
    );
  },
);
