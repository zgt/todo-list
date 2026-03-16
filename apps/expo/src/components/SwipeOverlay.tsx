import type { SharedValue } from "react-native-reanimated";
import React from "react";
import { Text as RNText } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Check, Trash2, Undo2, X } from "lucide-react-native";

export type SwipeDirection = "up" | "down" | "left" | "right" | null;

interface SwipeOverlayProps {
  direction: SharedValue<SwipeDirection>;
  translationX: SharedValue<number>;
  translationY: SharedValue<number>;
  isDeletePending: boolean;
  isCompact?: boolean;
  taskCompleted?: boolean;
}

export function SwipeOverlay({
  direction,
  translationX,
  translationY,
  isDeletePending,
  isCompact,
  taskCompleted,
}: SwipeOverlayProps) {
  const overlayStyle = useAnimatedStyle(() => {
    const currentDirection = direction.value;
    if (!currentDirection) {
      return { opacity: 0 };
    }

    let opacity = 0;

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

    // Action direction (left in compact, up in card): cancel delete-pending OR toggle complete
    if (
      (isCompact && currentDirection === "left") ||
      (!isCompact && currentDirection === "up")
    ) {
      if (isDeletePending) {
        // Unmark → gray
        return { backgroundColor: "rgba(107, 114, 128, 0.1)" };
      }
      if (taskCompleted) {
        // Undo → amber
        return { backgroundColor: "rgba(229, 160, 77, 0.1)" };
      }
      // Complete → green
      return { backgroundColor: "rgba(80, 200, 120, 0.1)" };
    }

    // Delete direction (right in compact, down in card): toggle delete-pending
    if (
      (isCompact && currentDirection === "right") ||
      (!isCompact && currentDirection === "down")
    ) {
      if (isDeletePending) {
        // Unmark → gray
        return { backgroundColor: "rgba(107, 114, 128, 0.1)" };
      }
      // Delete? → red
      return { backgroundColor: "rgba(239, 68, 68, 0.1)" };
    }

    // Card nav (left/right in card mode)
    return { backgroundColor: "rgba(143, 168, 168, 0.1)" };
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
            gap: 12,
            borderRadius: 24,
            paddingHorizontal: 48,
            paddingVertical: 32,
          },
        ]}
      >
        <OverlayContent
          direction={direction}
          isDeletePending={isDeletePending}
          isCompact={isCompact}
          taskCompleted={taskCompleted}
        />
      </Animated.View>
    </Animated.View>
  );
}

const OverlayContent = React.memo(function OverlayContent({
  direction,
  isDeletePending,
  isCompact,
  taskCompleted,
}: {
  direction: SharedValue<SwipeDirection>;
  isDeletePending: boolean;
  isCompact?: boolean;
  taskCompleted?: boolean;
}) {
  // Action direction: left (compact) / up (card) → toggle complete
  const actionStyle = useAnimatedStyle(() => ({
    opacity:
      (isCompact && direction.value === "left") ||
      (!isCompact && direction.value === "up")
        ? 1
        : 0,
  }));

  // Delete direction: right (compact) / down (card) → toggle delete-pending
  const deleteStyle = useAnimatedStyle(() => ({
    opacity:
      (isCompact && direction.value === "right") ||
      (!isCompact && direction.value === "down")
        ? 1
        : 0,
  }));

  // Card nav: left → next, right → previous
  const leftNavStyle = useAnimatedStyle(() => ({
    opacity: !isCompact && direction.value === "left" ? 1 : 0,
  }));
  const rightNavStyle = useAnimatedStyle(() => ({
    opacity: !isCompact && direction.value === "right" ? 1 : 0,
  }));

  const textStyle = {
    fontSize: 24,
    fontWeight: "bold" as const,
    letterSpacing: 0.5,
  };

  return (
    <>
      {/* Cancel delete-pending / Toggle complete/undo */}
      <Animated.View
        style={[
          actionStyle,
          { position: "absolute", alignItems: "center", gap: 12 },
        ]}
      >
        {isDeletePending ? (
          <>
            <X size={48} color="#9ca3af" strokeWidth={3} />
            <RNText style={[textStyle, { color: "#9ca3af" }]}>Unmark</RNText>
          </>
        ) : taskCompleted ? (
          <>
            <Undo2 size={48} color="#E5A04D" strokeWidth={2.5} />
            <RNText style={[textStyle, { color: "#E5A04D" }]}>Undo</RNText>
          </>
        ) : (
          <>
            <Check size={48} color="#50C878" strokeWidth={3} />
            <RNText style={[textStyle, { color: "#50C878" }]}>Complete</RNText>
          </>
        )}
      </Animated.View>

      {/* Toggle delete-pending */}
      <Animated.View
        style={[
          deleteStyle,
          { position: "absolute", alignItems: "center", gap: 12 },
        ]}
      >
        {isDeletePending ? (
          <>
            <X size={48} color="#9ca3af" strokeWidth={3} />
            <RNText style={[textStyle, { color: "#9ca3af" }]}>Unmark</RNText>
          </>
        ) : (
          <>
            <Trash2 size={48} color="#ef4444" strokeWidth={3} />
            <RNText style={[textStyle, { color: "#ef4444" }]}>Delete?</RNText>
          </>
        )}
      </Animated.View>

      {/* Card nav: Next */}
      <Animated.View
        style={[
          leftNavStyle,
          { position: "absolute", alignItems: "center", gap: 12 },
        ]}
      >
        <Check size={48} color="#8FA8A8" strokeWidth={3} />
        <RNText style={[textStyle, { color: "#8FA8A8" }]}>Next</RNText>
      </Animated.View>

      {/* Card nav: Previous */}
      <Animated.View
        style={[
          rightNavStyle,
          { position: "absolute", alignItems: "center", gap: 12 },
        ]}
      >
        <Check size={48} color="#8FA8A8" strokeWidth={3} />
        <RNText style={[textStyle, { color: "#8FA8A8" }]}>Previous</RNText>
      </Animated.View>
    </>
  );
});
