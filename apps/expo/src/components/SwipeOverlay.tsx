import type { ReactNode } from "react";
import type { SharedValue } from "react-native-reanimated";
import React from "react";
import { Text as RNText } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Check, Edit3, Undo2, Trash2, X } from "lucide-react-native";

export type SwipeDirection = "up" | "down" | "left" | "right" | null;

interface SwipeOverlayProps {
  direction: SharedValue<SwipeDirection>;
  translationX: SharedValue<number>;
  translationY: SharedValue<number>;
  deletePending: boolean;
  isCompact?: boolean;
  taskCompleted?: boolean;
}

interface DirectionConfig {
  color: string;
  backgroundColor: string;
  icon: ReactNode;
  text: string;
}

const directionConfigs: Record<
  Exclude<SwipeDirection, null>,
  DirectionConfig
> = {
  up: {
    color: "#50C878", // Emerald green
    backgroundColor: "rgba(80, 200, 120, 0.1)",
    icon: <Check size={48} color="#50C878" strokeWidth={3} />,
    text: "Complete",
  },
  down: {
    color: "#3B82F6", // Blue
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    icon: <Edit3 size={48} color="#3B82F6" strokeWidth={2.5} />,
    text: "Edit",
  },
  left: {
    color: "#8FA8A8", // Muted gray
    backgroundColor: "rgba(143, 168, 168, 0.1)",
    icon: <Check size={48} color="#8FA8A8" strokeWidth={3} />,
    text: "Next",
  },
  right: {
    color: "#8FA8A8", // Muted gray
    backgroundColor: "rgba(143, 168, 168, 0.1)",
    icon: <Check size={48} color="#8FA8A8" strokeWidth={3} />,
    text: "Previous",
  },
};

export function SwipeOverlay({
  direction,
  translationX,
  translationY,
  deletePending,
  isCompact,
  taskCompleted,
}: SwipeOverlayProps) {
  const overlayStyle = useAnimatedStyle(() => {
    const currentDirection = direction.value;
    if (!currentDirection) {
      return { opacity: 0 };
    }

    let opacity = 0;

    // Calculate opacity based on translation distance
    if (currentDirection === "up" || currentDirection === "down") {
      const absY = Math.abs(translationY.value);
      opacity = interpolate(absY, [0, 150], [0, 0.8]);
    } else {
      const absX = Math.abs(translationX.value);
      opacity = interpolate(absX, [0, 150], [0, 0.8]);
    }

    return { opacity };
  });

  const configStyle = useAnimatedStyle(() => {
    const currentDirection = direction.value;
    if (!currentDirection) {
      return { opacity: 0 };
    }

    // Override for delete pending states
    if (deletePending) {
      if (currentDirection === "up" || (currentDirection === "left" && isCompact)) {
        return { backgroundColor: "rgba(239, 68, 68, 0.1)" };
      }
      if (currentDirection === "down") {
        return { backgroundColor: "rgba(107, 114, 128, 0.1)" };
      }
    }

    // Compact left swipe: use complete color when task not completed
    if (isCompact && currentDirection === "left" && !taskCompleted) {
      return { backgroundColor: "rgba(80, 200, 120, 0.1)" };
    }
    // Compact left swipe on completed task: use delete color
    if (isCompact && currentDirection === "left" && taskCompleted) {
      return { backgroundColor: "rgba(239, 68, 68, 0.1)" };
    }
    // Compact right swipe: uncomplete (completed task) or edit (uncompleted)
    if (isCompact && currentDirection === "right") {
      if (taskCompleted) {
        return { backgroundColor: "rgba(229, 160, 77, 0.1)" };
      }
      return { backgroundColor: "rgba(59, 130, 246, 0.1)" };
    }

    // Card down swipe: uncomplete (completed task) or edit (uncompleted)
    if (currentDirection === "down" && taskCompleted) {
      return { backgroundColor: "rgba(229, 160, 77, 0.1)" };
    }

    const config = directionConfigs[currentDirection];
    return {
      backgroundColor: config.backgroundColor,
    };
  });

  return (
    <Animated.View
      style={[
        overlayStyle,
        {
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
        },
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          configStyle,
          {
            alignItems: "center",
            justifyContent: "center",
            gap: 12, // gap-3
            borderRadius: 24, // rounded-3xl
            paddingHorizontal: 48, // px-12
            paddingVertical: 32, // py-8
          },
        ]}
      >
        <OverlayContent direction={direction} deletePending={deletePending} isCompact={isCompact} taskCompleted={taskCompleted} />
      </Animated.View>
    </Animated.View>
  );
}

const OverlayContent = React.memo(function OverlayContent({
  direction,
  deletePending,
  isCompact,
  taskCompleted,
}: {
  direction: SharedValue<SwipeDirection>;
  deletePending: boolean;
  isCompact?: boolean;
  taskCompleted?: boolean;
}) {
  const upStyle = useAnimatedStyle(() => ({
    opacity: direction.value === "up" ? 1 : 0,
  }));
  const downStyle = useAnimatedStyle(() => ({
    opacity: direction.value === "down" ? 1 : 0,
  }));
  const leftStyle = useAnimatedStyle(() => ({
    opacity: direction.value === "left" ? 1 : 0,
  }));
  const rightStyle = useAnimatedStyle(() => ({
    opacity: direction.value === "right" ? 1 : 0,
  }));

  const textStyle = {
    fontSize: 24, // text-2xl
    fontWeight: "bold" as const, // font-bold
    letterSpacing: 0.5, // tracking-wide
  };

  return (
    <>
      <Animated.View
        style={[
          upStyle,
          { position: "absolute", alignItems: "center", gap: 12 },
        ]}
      >
        {deletePending ? (
          <>
            <Trash2 size={48} color="#ef4444" strokeWidth={3} />
            <RNText style={[textStyle, { color: "#ef4444" }]}>Delete</RNText>
          </>
        ) : (
          <>
            <Check size={48} color="#50C878" strokeWidth={3} />
            <RNText style={[textStyle, { color: "#50C878" }]}>Complete</RNText>
          </>
        )}
      </Animated.View>

      <Animated.View
        style={[
          downStyle,
          { position: "absolute", alignItems: "center", gap: 12 },
        ]}
      >
        {deletePending ? (
          <>
            <X size={48} color="#9ca3af" strokeWidth={3} />
            <RNText style={[textStyle, { color: "#9ca3af" }]}>Cancel</RNText>
          </>
        ) : taskCompleted ? (
          <>
            <Undo2 size={48} color="#E5A04D" strokeWidth={2.5} />
            <RNText style={[textStyle, { color: "#E5A04D" }]}>Undo</RNText>
          </>
        ) : (
          <>
            <Edit3 size={48} color="#3B82F6" strokeWidth={2.5} />
            <RNText style={[textStyle, { color: "#3B82F6" }]}>Edit</RNText>
          </>
        )}
      </Animated.View>

      <Animated.View
        style={[
          leftStyle,
          { position: "absolute", alignItems: "center", gap: 12 },
        ]}
      >
        {isCompact ? (
          deletePending ? (
            <>
              <Trash2 size={48} color="#ef4444" strokeWidth={3} />
              <RNText style={[textStyle, { color: "#ef4444" }]}>Delete</RNText>
            </>
          ) : taskCompleted ? (
            <>
              <Trash2 size={48} color="#ef4444" strokeWidth={3} />
              <RNText style={[textStyle, { color: "#ef4444" }]}>Delete?</RNText>
            </>
          ) : (
            <>
              <Check size={48} color="#50C878" strokeWidth={3} />
              <RNText style={[textStyle, { color: "#50C878" }]}>Complete</RNText>
            </>
          )
        ) : (
          <>
            <Check size={48} color="#8FA8A8" strokeWidth={3} />
            <RNText style={[textStyle, { color: "#8FA8A8" }]}>Next</RNText>
          </>
        )}
      </Animated.View>

      <Animated.View
        style={[
          rightStyle,
          { position: "absolute", alignItems: "center", gap: 12 },
        ]}
      >
        {isCompact ? (
          taskCompleted ? (
            <>
              <Undo2 size={48} color="#E5A04D" strokeWidth={2.5} />
              <RNText style={[textStyle, { color: "#E5A04D" }]}>Undo</RNText>
            </>
          ) : (
            <>
              <Edit3 size={48} color="#3B82F6" strokeWidth={2.5} />
              <RNText style={[textStyle, { color: "#3B82F6" }]}>Edit</RNText>
            </>
          )
        ) : (
          <>
            <Check size={48} color="#8FA8A8" strokeWidth={3} />
            <RNText style={[textStyle, { color: "#8FA8A8" }]}>Previous</RNText>
          </>
        )}
      </Animated.View>
    </>
  );
});
