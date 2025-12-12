import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { Check, Edit3, X, Clock } from "lucide-react-native";

export type SwipeDirection = "up" | "down" | "left" | "right" | null;

interface SwipeOverlayProps {
  direction: SharedValue<SwipeDirection>;
  translationX: SharedValue<number>;
  translationY: SharedValue<number>;
}

interface DirectionConfig {
  color: string;
  backgroundColor: string;
  icon: ReactNode;
  text: string;
}

const directionConfigs: Record<Exclude<SwipeDirection, null>, DirectionConfig> =
  {
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
    const config = directionConfigs[currentDirection];
    return {
      backgroundColor: config.backgroundColor,
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const currentDirection = direction.value;
    if (!currentDirection) {
      return { color: "transparent" };
    }
    const config = directionConfigs[currentDirection];
    return {
      color: config.color,
    };
  });

  return (
    <Animated.View
      style={[overlayStyle]}
      className="absolute inset-0 items-center justify-center rounded-2xl"
      pointerEvents="none"
    >
      <Animated.View
        style={[configStyle]}
        className="items-center justify-center gap-3 rounded-3xl px-12 py-8"
      >
        <Check size={48} color="#50C878" strokeWidth={3} />
        <Animated.Text
          style={[textStyle]}
          className="text-2xl font-bold tracking-wide"
        >
          Swipe
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}
