import { memo } from "react";
import { Text, View } from "react-native";

import type { PriorityLevel } from "./priority-config";
import { PRIORITY_CONFIG } from "./priority-config";

interface PriorityBadgeProps {
  priority: PriorityLevel;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}

export const PriorityBadge = memo(
  ({ priority, size = "md", showLabel = true }: PriorityBadgeProps) => {
    // Map null to "none" for config lookup
    const config = PRIORITY_CONFIG[priority ?? "none"];
    if (!config) return null;
    const Icon = config.Icon;

    const sizeStyles = {
      xs: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderWidth: 1,
        icon: 10,
      },
      sm: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 2,
        icon: 14,
      },
      md: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 2,
        icon: 16,
      },
    }[size];

    return (
      <View
        className={`flex-row items-center gap-1 rounded-full ${config.bgClass}`}
        style={{
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
          borderWidth: sizeStyles.borderWidth,
          borderColor: `${config.color}60`,
          borderRadius: 9999,
        }}
      >
        <Icon size={sizeStyles.icon} color={`${config.color}CC`} />
        {showLabel && (
          <Text className={`text-xs font-medium ${config.textClass}`}>
            {config.label}
          </Text>
        )}
      </View>
    );
  },
);
