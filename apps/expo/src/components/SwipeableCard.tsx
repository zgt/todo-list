import type { SharedValue } from "react-native-reanimated";
import { useEffect, useState } from "react";
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

import type { SwipeDirection } from "./SwipeOverlay";
import type { LocalTask } from "~/db/client";
import { SwipeOverlay } from "./SwipeOverlay";
import { TaskCard } from "./TaskCard";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Swipe configuration constants
const SWIPE_THRESHOLD = 100; // Distance to trigger action
const SWIPE_VELOCITY = 500; // Velocity threshold
const ROTATION_FACTOR = 15; // Max rotation in degrees

interface SwipeableCardProps {
  task: LocalTask;
  index: number;
  totalCards: number;
  isTopCard: boolean;
  canGoNext: boolean;
  canGoPrevious: boolean;
  swipeProgress: SharedValue<number>;
  deletePending: boolean;
  onToggle: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onDeletePending: () => void;
  onCancelDelete: () => void;
  onEditStart: () => void;
  onSave: (updates: Partial<{ title: string; description: string }>) => void;
  onCancelEdit: () => void;
  isEditing: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

export function SwipeableCard({
  task,
  index,
  totalCards,
  isTopCard,
  canGoNext,
  canGoPrevious,
  swipeProgress,
  deletePending,
  onToggle,
  onComplete,
  onDelete,
  onDeletePending,
  onCancelDelete,
  onEditStart,
  onSave,
  onCancelEdit,
  isEditing,
  onNext,
  onPrevious,
}: SwipeableCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const direction = useSharedValue<SwipeDirection>(null);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");

  // Reset local state when task changes or edit mode ends
  useEffect(() => {
    if (!isEditing) {
      setTitle(task.title);
      setDescription(task.description ?? "");
    }
  }, [task.title, task.description, isEditing]);

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
  useEffect(() => {
    stackTranslateY.value = withSpring(-Math.max(0, index) * 18, {
      damping: 20,
      stiffness: 180,
    });
    stackScale.value = withSpring(1 - Math.max(0, index) * 0.05, {
      damping: 20,
      stiffness: 180,
    });
    stackOpacity.value = withSpring(1 - Math.max(0, index) * 0.15, {
      damping: 20,
      stiffness: 180,
    });
  }, [index, stackTranslateY, stackScale, stackOpacity]);

  const panGesture = Gesture.Pan()
    // .enabled(!isEditing) // Enable gestures during edit for save/cancel actions
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      // Reset opacity when gesture starts (in case card was faded out)
      if (opacity.value < 1) {
        opacity.value = withTiming(1, { duration: 200 });
      }
    })
    .onUpdate((event) => {
      if (index === -1) {
        // Previous card - don't handle gestures directly
        return;
      }

      // Update swipe progress for right swipes (to animate previous card)
      if (event.translationX > 0 && canGoPrevious) {
        // Map translation to progress: 0 at start, 1 at full swipe
        swipeProgress.value = Math.min(event.translationX / SCREEN_WIDTH, 1);
        // Don't move the top card during right swipe, only the previous card slides in
        translateY.value = startY.value + event.translationY;
      } else {
        swipeProgress.value = 0;
        // Normal gesture handling for other directions
        translateX.value = startX.value + event.translationX;
        translateY.value = startY.value + event.translationY;
      }

      // Determine swipe direction based on dominant axis
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);

      if (absY > absX) {
        // Vertical swipe
        if (event.translationY < -SWIPE_THRESHOLD / 2) {
          direction.value = "up";
        } else if (event.translationY > SWIPE_THRESHOLD / 2) {
          direction.value = "down";
        } else {
          direction.value = null;
        }
      } else {
        // Horizontal swipe
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
      // Only the top card should respond to gestures
      if (!isTopCard) {
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        direction.value = null;
        return;
      }

      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);
      const velocityX = Math.abs(event.velocityX);
      const velocityY = Math.abs(event.velocityY);

      // Check if swipe threshold or velocity threshold is met
      if (absY > absX) {
        // Vertical swipe
        if (
          event.translationY < -SWIPE_THRESHOLD ||
          (event.translationY < 0 && velocityY > SWIPE_VELOCITY)
        ) {
          // Up swipe logic
          if (isEditing) {
            // Edit mode: Swipe up to SAVE
            runOnJS(onSave)({
              title: title.trim(),
              description: description.trim(),
            });
            translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
            translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
          } else if (task.completed) {
            // If task is completed, handle delete logic
            if (deletePending) {
              // Second swipe - actually delete
              runOnJS(onDelete)();
            } else {
              // First swipe - enter delete pending mode
              runOnJS(onDeletePending)();
            }
          } else {
            // Task not completed - complete it
            runOnJS(onComplete)();
          }
          translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
          translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        } else if (
          event.translationY > SWIPE_THRESHOLD ||
          (event.translationY > 0 && velocityY > SWIPE_VELOCITY)
        ) {
          // Down swipe
          if (isEditing) {
            // Edit mode: Swipe down to CANCEL
            runOnJS(onCancelEdit)();
            translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
            translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
          } else if (deletePending) {
            // Cancel delete mode
            runOnJS(onCancelDelete)();
          } else {
            // Edit mode start
            runOnJS(onEditStart)();
          }
          translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
          translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        } else {
          // Reset position if threshold not met
          swipeProgress.value = withSpring(0, { damping: 15, stiffness: 150 });
          translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
          translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        }
      } else {
        // Horizontal swipe
        if (
          event.translationX < -SWIPE_THRESHOLD ||
          (event.translationX < 0 && velocityX > SWIPE_VELOCITY)
        ) {
          // Left swipe - Next card
          if (canGoNext) {
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
            // At end of list, bounce back
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
          // Right swipe - Pull previous card back from left
          if (canGoPrevious) {
            // Animate swipe progress to complete
            swipeProgress.value = withTiming(1, { duration: 200 }, () => {
              runOnJS(onPrevious)();
            });
            translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
            translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
          } else {
            // At start of list, bounce back
            swipeProgress.value = withSpring(0, {
              damping: 15,
              stiffness: 150,
            });
            translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
            translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
          }
        } else {
          // Reset position if threshold not met
          swipeProgress.value = withSpring(0, { damping: 15, stiffness: 150 });
          translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
          translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        }
      }

      direction.value = null;
    });

  const cardStyle = useAnimatedStyle(() => {
    if (index === -1) {
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
      };
    }

    // Current and stacked cards
    const rotation = (translateX.value / SCREEN_WIDTH) * ROTATION_FACTOR;

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + stackTranslateY.value },
        { rotate: `${rotation}deg` },
        { scale: stackScale.value },
      ],
      opacity: stackOpacity.value * opacity.value,
      zIndex: totalCards - index,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          cardStyle,
          {
            position: "absolute",
            width: SCREEN_WIDTH * 0.85,
            height: SCREEN_HEIGHT * 0.6,
          },
        ]}
      >
        <TaskCard
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
          deletePending={deletePending}
          isEditing={isEditing}
          onSave={onSave}
          title={title}
          description={description}
          onChangeTitle={setTitle}
          onChangeDescription={setDescription}
        />
        <SwipeOverlay
          direction={direction}
          translationX={translateX}
          translationY={translateY}
          deletePending={deletePending}
        />
      </Animated.View>
    </GestureDetector>
  );
}
