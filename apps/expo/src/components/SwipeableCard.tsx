import type { SharedValue } from "react-native-reanimated";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
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

import type { PriorityLevel } from "./priority-config";
import type { LocalTask } from "~/db/client";
import { SwipeOverlay } from "./SwipeOverlay";
import { TaskCard } from "./TaskCard";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  onToggle: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onDeletePending: () => void;
  onCancelDelete: () => void;
  onEditStart: () => void;
  onSave: (
    updates: Partial<{
      title: string;
      description: string;
      categoryId: string | null;
      dueDate: Date | null;
      priority: PriorityLevel;
    }>,
  ) => void;
  onCancelEdit: () => void;
  isEditing: boolean;
  skipStackAnimation: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onTaskPress?: () => void;
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
  onToggle,
  onComplete,
  onDelete,
  onDeletePending,
  onCancelDelete,
  onEditStart,
  onSave,
  onCancelEdit,
  isEditing,
  skipStackAnimation,
  onNext,
  onPrevious,
  onTaskPress,
}: SwipeableCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const direction = useSharedValue<SwipeDirection>(null);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(
    task.categoryId ?? null,
  );
  const [dueDate, setDueDate] = useState<Date | null>(task.dueDate ?? null);
  const [priority, setPriority] = useState<PriorityLevel>(
    (task.priority as PriorityLevel) ?? null,
  );

  // Reset local state when task changes or edit mode ends
  useEffect(() => {
    if (!isEditing) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setCategoryId(task.categoryId ?? null);
      setDueDate(task.dueDate ?? null);
      setPriority((task.priority as PriorityLevel) ?? null);
    }
  }, [
    task.title,
    task.description,
    task.categoryId,
    task.dueDate,
    task.priority,
    isEditing,
  ]);

  // Handler for saving from gesture - captures current state values
  const handleSwipeSave = useCallback(() => {
    onSave({
      title: title.trim(),
      description: description.trim(),
      categoryId,
      dueDate,
      priority,
    });
  }, [onSave, title, description, categoryId, dueDate, priority]);

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
  // Skip animation when index change is caused by sort reorder (after completion)
  // useLayoutEffect to avoid 1-frame delay before animation starts
  useLayoutEffect(() => {
    let targetY: number;
    let targetScale: number;
    let targetOpacity: number;

    if (isCompact) {
      targetY = index * (80 + 12); // Height + Gap
      targetScale = 1;
      targetOpacity = 1;
    } else {
      targetY = -Math.max(0, index) * 18;
      targetScale = 1 - Math.max(0, index) * 0.05;
      targetOpacity = 1 - Math.max(0, index) * 0.15;
    }

    if (skipStackAnimation) {
      console.log("skip");
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
  ]);

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
      if (index === -1 && !isCompact) {
        // Previous card - don't handle gestures directly in stack mode
        return;
      }

      // Update swipe progress for right swipes (to animate previous card)
      if (event.translationX > 0 && canGoPrevious && !isCompact) {
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

      if (isCompact) {
        // Compact mode: Lock vertical movement
        translateY.value = 0;

        // Determine horizontal direction only
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
          if (event.translationX > 0) {
            // Right swipe
            if (deletePending) {
              // Cancel delete mode
              runOnJS(onCancelDelete)();
            } else if (task.completed) {
              // Uncomplete the task
              runOnJS(onToggle)();
            } else if (onTaskPress) {
              // Open bottom sheet edit form (only for uncompleted tasks)
              runOnJS(onTaskPress)();
            }
          } else {
            // Left swipe — mirrors card view swipe-up behavior
            if (task.completed) {
              if (deletePending) {
                // Third left swipe — actually delete
                runOnJS(onDelete)();
              } else {
                // Second left swipe — enter delete pending
                runOnJS(onDeletePending)();
              }
            } else {
              // First left swipe — complete the task
              runOnJS(onComplete)();
            }
          }
        }

        // Always reset position in compact mode
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        direction.value = null;
        return;
      }

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
            runOnJS(handleSwipeSave)();
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
          if (deletePending) {
            // Cancel delete mode
            runOnJS(onCancelDelete)();
          } else if (task.completed) {
            // Uncomplete the task
            runOnJS(onToggle)();
          } else if (onTaskPress) {
            // Open bottom sheet edit form (only for uncompleted tasks)
            runOnJS(onTaskPress)();
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
        // Horizontal swipe - only available in non-compact mode (compact mode returns early above)
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

  // In compact mode, only activate the pan gesture for horizontal swipes
  // so vertical drags fall through to the ScrollView for scrolling
  if (isCompact) {
    panGesture.activeOffsetX([-15, 15]).failOffsetY([-15, 15]);
  }

  const composedGesture = panGesture;

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

    const targetWidth = isCompact ? SCREEN_WIDTH * 0.95 : SCREEN_WIDTH * 0.85;
    const targetHeight = isCompact ? 80 : SCREEN_HEIGHT * 0.65;

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
          },
        ]}
      >
        <TaskCard
          task={task}
          isCompact={isCompact}
          onToggle={onToggle}
          onDelete={onDelete}
          deletePending={deletePending}
          isEditing={isEditing}
          onSave={onSave}
          title={title}
          description={description}
          onChangeTitle={setTitle}
          onChangeDescription={setDescription}
          categoryId={categoryId}
          dueDate={dueDate}
          onChangeCategoryId={setCategoryId}
          onChangeDueDate={setDueDate}
          priority={priority}
          onChangePriority={setPriority}
        />
        <SwipeOverlay
          direction={direction}
          translationX={translateX}
          translationY={translateY}
          deletePending={deletePending}
          isCompact={isCompact}
          taskCompleted={task.completed}
        />
      </Animated.View>
    </GestureDetector>
  );
}
