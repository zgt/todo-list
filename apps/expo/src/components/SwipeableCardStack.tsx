import * as React from "react";
import { Dimensions, View } from "react-native";
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  useSharedValue,
} from "react-native-reanimated";
import Carousel from "react-native-reanimated-carousel";

import type { RouterOutputs } from "~/utils/api";
import { TaskCard } from "./TaskCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SwipeableCardStackProps {
  tasks: RouterOutputs["task"]["all"];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export function SwipeableCardStack({
  tasks,
  onToggle,
  onDelete,
}: SwipeableCardStackProps) {
  const directionAnimVal = useSharedValue(0);

  // Card dimensions
  const cardWidth = SCREEN_WIDTH * 0.85;
  const cardHeight = Dimensions.get("window").height * 0.6; // Much bigger card

  const animationStyle = React.useCallback(
    (value: number) => {
      "worklet";
       console.log("animationStyle value:", value); // Uncomment for verbose logging
      const translateY = interpolate(value, [0, 1], [0, -18]);

      const translateX =
        interpolate(value, [-1, 0], [cardWidth, 0], Extrapolation.CLAMP) *
        directionAnimVal.value;

      const rotateZ =
        interpolate(value, [-1, 0], [15, 0], Extrapolation.CLAMP) *
        directionAnimVal.value;

      const zIndex = Math.round(interpolate(
        value,
        [0, 1, 2, 3, 4],
        [0, 1, 2, 3, 4].map((v) => (tasks.length - v) * 10),
        Extrapolation.CLAMP,
      ));

      const scale = interpolate(value, [0, 1], [1, 0.95]);

      const opacity = interpolate(
        value,
        [-1, -0.8, 0, 1],
        [0, 0.9, 1, 0.85],
        Extrapolation.EXTEND,
      );

      return {
        transform: [
          { translateY },
          { translateX },
          { rotateZ: `${rotateZ}deg` },
          { scale },
        ],
        zIndex,
        opacity,
      };
    },
    [cardWidth, tasks.length, directionAnimVal],
  );

  // If no tasks, we can just return null or let the parent handle the empty state
  if (tasks.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        minHeight: Dimensions.get("window").height * 0.7, // Ensure enough space for the stack
      }}
    >
      <Carousel
        loop={true}// tinder-like stack to avoid index issues
        style={{
          width: SCREEN_WIDTH,
          height: Dimensions.get("window").height * 0.7,
          justifyContent: "center",
          alignItems: "center",
        }}
        width={cardWidth}
        height={cardHeight}
        data={tasks}
        onConfigurePanGesture={(g) => {
          g.onChange((e) => {
            "worklet";
            directionAnimVal.value = Math.sign(e.translationX);
          });
        }}
        renderItem={({ index: _index, item }) => (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={{ flex: 1 }}
          >
            <TaskCard
              task={item}
              onToggle={() => onToggle(item.id, !item.completed)}
              onDelete={() => onDelete(item.id)}
            />
          </Animated.View>
        )}
        customAnimation={animationStyle}
        windowSize={5}
        // Vertical false means horizontal swipe
        vertical={false}
      />
    </View>
  );
}
