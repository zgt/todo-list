import type { SharedValue } from "react-native-reanimated";
import { useEffect, useLayoutEffect, useState } from "react";
import { Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import type { PriorityLevel } from "./priority-config";
import type { LocalTask } from "~/db/client";
import { SwipeOverlay } from "./SwipeOverlay";
import { TaskCard } from "./TaskCard";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const hapticLight = () =>
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
const hapticSuccess = () =>
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
const hapticWarning = () =>
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

// Swipe configuration constants
const SWIPE_THRESHOLD = 100; // Distance to trigger action
const SWIPE_VELOCITY = 500; // Velocity threshold
const ROTATION_FACTOR = 15; // Max rotation in degrees

type SwipeDirection = "left" | "right" | "up" | "down" | null;

interface SwipeableCardProps {
  task: LocalTask;
  index: number;
  totalCards: number;
  isCompact: boolean;
  isTopCard: boolean;
  canGoNext: boolean;
  canGoPrevious: boolean;
  swipeProgress: SharedValue<number>;
  deletePending: boolean;
  yOffset?: number;
  onToggle: () => void;
  onToggleDeletePending: () => void;
  onSave: (
    updates: Partial<{
      title: string;
      description: string;
      categoryId: string | null;
      dueDate: Date | null;
      priority: PriorityLevel;
    }>,
  ) => void;
  skipStackAnimation: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onTaskPress?: () => void;
  onSubtaskToggle?: (subtaskId: string, completed: boolean) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function SwipeableCard({
  task,
  index,
  totalCards,
  isCompact,
  isTopCard,
  canGoNext,
  canGoPrevious,
  swipeProgress,
  deletePending,
  yOffset,
  onToggle,
  onToggleDeletePending,
  onSave,
  skipStackAnimation,
  onNext,
  onPrevious,
  onTaskPress,
  onSubtaskToggle,
  isExpanded,
  onToggleExpand,
}: SwipeableCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const direction = useSharedValue<SwipeDirection>(null);
  const [priority, setPriority] = useState<PriorityLevel>(
    (task.priority as PriorityLevel) ?? "medium",
  );

  // Reset priority when task changes
  useEffect(() => {
    setPriority((task.priority as PriorityLevel) ?? "medium");
  }, [task.priority]);

  // Animated values for stacking effect
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const stackTranslateY = useSharedValue(-index * 18);
  const stackScale = useSharedValue(1 - index * 0.05);
  const stackOpacity = useSharedValue(1 - index * 0.15);

  // Reset position and opacity when task changes or when transitioning from previous card
  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    opacity.value = 1;
    // Reset swipe progress when card becomes visible (transitions from index -1 to 0)
    if (index >= 0) {
      swipeProgress.value = 0;
    }
  }, [task.id, index, translateX, translateY, opacity, swipeProgress]);

  // Animate stacking properties when index changes
  useLayoutEffect(() => {
    let targetY: number;
    let targetScale: number;
    let targetOpacity: number;

    if (isCompact) {
      targetY = yOffset ?? index * (92 + 4);
      targetScale = 1;
      targetOpacity = 1;
    } else {
      targetY = -Math.max(0, index) * 18;
      targetScale = 1 - Math.max(0, index) * 0.05;
      targetOpacity = 1 - Math.max(0, index) * 0.15;
    }

    if (skipStackAnimation) {
      stackTranslateY.value = targetY;
      stackScale.value = targetScale;
      stackOpacity.value = targetOpacity;
    } else {
      stackTranslateY.value = withSpring(targetY, {
        damping: 60,
        stiffness: 380,
      });
      stackScale.value = withSpring(targetScale, {
        damping: 20,
        stiffness: 180,
      });
      stackOpacity.value = withSpring(targetOpacity, {
        damping: 20,
        stiffness: 180,
      });
    }
  }, [
    index,
    skipStackAnimation,
    stackTranslateY,
    stackScale,
    stackOpacity,
    isCompact,
    yOffset,
  ]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      if (opacity.value < 1) {
        opacity.value = withTiming(1, { duration: 200 });
      }
    })
    .onUpdate((event) => {
      if (index === -1 && !isCompact) {
        return;
      }

      // Update swipe progress for right swipes (to animate previous card)
      if (event.translationX > 0 && canGoPrevious && !isCompact) {
        swipeProgress.value = Math.min(event.translationX / SCREEN_WIDTH, 1);
        translateY.value = startY.value + event.translationY;
      } else {
        swipeProgress.value = 0;
        translateX.value = startX.value + event.translationX;
        translateY.value = startY.value + event.translationY;
      }

      if (isCompact) {
        // Compact mode: Lock vertical movement
        translateY.value = 0;

        if (event.translationX < -SWIPE_THRESHOLD / 2) {
          direction.value = "left";
        } else if (event.translationX > SWIPE_THRESHOLD / 2) {
          direction.value = "right";
        } else {
          direction.value = null;
        }
        return;
      }

      // Determine swipe direction based on dominant axis
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);

      if (absY > absX) {
        if (event.translationY < -SWIPE_THRESHOLD / 2) {
          direction.value = "up";
        } else if (event.translationY > SWIPE_THRESHOLD / 2) {
          direction.value = "down";
        } else {
          direction.value = null;
        }
      } else {
        if (event.translationX < -SWIPE_THRESHOLD / 2) {
          direction.value = "left";
        } else if (event.translationX > SWIPE_THRESHOLD / 2) {
          direction.value = "right";
        } else {
          direction.value = null;
        }
      }
    })
    .onEnd((event) => {
      // Only the top card should respond to gestures in stack mode
      if (!isTopCard && !isCompact) {
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        direction.value = null;
        return;
      }

      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);
      const velocityX = Math.abs(event.velocityX);
      const velocityY = Math.abs(event.velocityY);

      if (isCompact) {
        if (
          absX > SWIPE_THRESHOLD ||
          (absX > 0 && velocityX > SWIPE_VELOCITY)
        ) {
          if (event.translationX < 0) {
            // Left swipe → cancel delete-pending if active, otherwise toggle complete
            if (deletePending) {
              runOnJS(hapticLight)();
              runOnJS(onToggleDeletePending)();
            } else {
              runOnJS(hapticSuccess)();
              runOnJS(onToggle)();
            }
          } else {
            // Right swipe → toggle delete-pending
            runOnJS(hapticWarning)();
            runOnJS(onToggleDeletePending)();
          }
        }

        // Always reset position in compact mode
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        direction.value = null;
        return;
      }

      // Card mode
      if (absY > absX) {
        // Vertical swipe
        if (
          event.translationY < -SWIPE_THRESHOLD ||
          (event.translationY < 0 && velocityY > SWIPE_VELOCITY)
        ) {
          // Up swipe → cancel delete-pending if active, otherwise toggle complete
          if (deletePending) {
            runOnJS(hapticLight)();
            runOnJS(onToggleDeletePending)();
          } else {
            runOnJS(hapticSuccess)();
            runOnJS(onToggle)();
          }
          translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
          translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        } else if (
          event.translationY > SWIPE_THRESHOLD ||
          (event.translationY > 0 && velocityY > SWIPE_VELOCITY)
        ) {
          // Down swipe → toggle delete-pending
          runOnJS(hapticWarning)();
          runOnJS(onToggleDeletePending)();
          translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
          translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        } else {
          // Reset position if threshold not met
          swipeProgress.value = withSpring(0, { damping: 15, stiffness: 150 });
          translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
          translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        }
      } else {
        // Horizontal swipe — left/right card navigation (unchanged)
        if (
          event.translationX < -SWIPE_THRESHOLD ||
          (event.translationX < 0 && velocityX > SWIPE_VELOCITY)
        ) {
          // Left swipe - Next card
          if (canGoNext) {
            runOnJS(hapticLight)();
            swipeProgress.value = 0;
            translateX.value = withTiming(
              -SCREEN_WIDTH * 1.5,
              { duration: 300 },
              () => {
                runOnJS(onNext)();
              },
            );
            translateY.value = withTiming(0, { duration: 300 });
            opacity.value = withTiming(0, { duration: 250 });
          } else {
            swipeProgress.value = withSpring(0, {
              damping: 15,
              stiffness: 150,
            });
            translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
            translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
          }
        } else if (
          event.translationX > SWIPE_THRESHOLD ||
          (event.translationX > 0 && velocityX > SWIPE_VELOCITY)
        ) {
          // Right swipe - Pull previous card back
          if (canGoPrevious) {
            runOnJS(hapticLight)();
            swipeProgress.value = withTiming(1, { duration: 200 }, () => {
              runOnJS(onPrevious)();
            });
            translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
            translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
          } else {
            swipeProgress.value = withSpring(0, {
              damping: 15,
              stiffness: 150,
            });
            translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
            translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
          }
        } else {
          swipeProgress.value = withSpring(0, { damping: 15, stiffness: 150 });
          translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
          translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        }
      }

      direction.value = null;
    });

  // In compact mode, only activate the pan gesture for horizontal swipes
  if (isCompact) {
    panGesture.activeOffsetX([-15, 15]).failOffsetY([-15, 15]);
  }

  // Double-tap gesture → open edit form
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      if (onTaskPress) {
        runOnJS(hapticLight)();
        runOnJS(onTaskPress)();
      }
    });

  // Race: whichever gesture recognizes first wins
  const composedGesture = Gesture.Race(panGesture, doubleTapGesture);

  const cardStyle = useAnimatedStyle(() => {
    if (index === -1 && !isCompact) {
      // Previous card - interpolate position based on swipe progress
      const translateXValue = interpolate(
        swipeProgress.value,
        [0, 1],
        [-SCREEN_WIDTH, 0],
        Extrapolation.CLAMP,
      );

      const rotation = interpolate(
        swipeProgress.value,
        [0, 1],
        [-ROTATION_FACTOR, 0],
        Extrapolation.CLAMP,
      );

      const opacityValue = interpolate(
        swipeProgress.value,
        [0, 0.2, 1],
        [0, 0.9, 1],
        Extrapolation.CLAMP,
      );

      return {
        transform: [
          { translateX: translateXValue },
          { translateY: 0 },
          { rotate: `${rotation}deg` },
          { scale: 1 },
        ],
        opacity: opacityValue,
        zIndex: totalCards - index,
        width: SCREEN_WIDTH * 0.85,
        height: SCREEN_HEIGHT * 0.65,
      };
    }

    // Current and stacked cards (or all cards in Compact mode)
    const rotation = isCompact
      ? 0
      : (translateX.value / SCREEN_WIDTH) * ROTATION_FACTOR;

    const targetWidth = isCompact ? SCREEN_WIDTH - 32 : SCREEN_WIDTH * 0.85;
    const subtaskCount =
      (task as unknown as { subtasks?: unknown[] }).subtasks?.length ?? 0;
    const expandedExtra =
      isExpanded && isCompact && subtaskCount > 0
        ? subtaskCount * 32 + 4
        : 0;
    const targetHeight = isCompact ? 92 + expandedExtra : SCREEN_HEIGHT * 0.65;

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + stackTranslateY.value },
        { rotate: `${rotation}deg` },
        { scale: stackScale.value },
      ],
      opacity: stackOpacity.value * opacity.value,
      zIndex: totalCards - index,
      width: withSpring(targetWidth),
      height: withSpring(targetHeight),
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          cardStyle,
          {
            position: "absolute",
            overflow: "hidden",
          },
        ]}
      >
        <TaskCard
          task={task}
          isCompact={isCompact}
          onToggle={onToggle}
          deletePending={deletePending}
          onSave={onSave}
          priority={priority}
          onChangePriority={setPriority}
          onSubtaskToggle={onSubtaskToggle}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
          onTaskPress={onTaskPress}
        />
        <SwipeOverlay
          direction={direction}
          translationX={translateX}
          translationY={translateY}
          isDeletePending={deletePending}
          isCompact={isCompact}
          taskCompleted={task.completed}
        />
      </Animated.View>
    </GestureDetector>
  );
}
