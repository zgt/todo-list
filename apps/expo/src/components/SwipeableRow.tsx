import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Pencil, Trash2 } from "lucide-react-native";

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
}

const BUTTON_WIDTH = 72;
const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 500;

export function SwipeableRow({
  children,
  onEdit,
  onDelete,
  isEditing,
}: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const isOpen = useSharedValue<"edit" | "delete" | null>(null);

  const close = useCallback(() => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    isOpen.value = null;
  }, [translateX, isOpen]);

  const handleEdit = useCallback(() => {
    close();
    onEdit();
  }, [close, onEdit]);

  const handleDelete = useCallback(() => {
    close();
    onDelete();
  }, [close, onDelete]);

  const panGesture = Gesture.Pan()
    .enabled(!isEditing)
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Calculate new position
      let newX = event.translationX;

      // If already open, add the open offset
      if (isOpen.value === "edit") {
        newX += BUTTON_WIDTH;
      } else if (isOpen.value === "delete") {
        newX -= BUTTON_WIDTH;
      }

      // Clamp translation to reveal buttons with rubber band effect
      if (newX > BUTTON_WIDTH) {
        // Past edit button - apply rubber band
        newX = BUTTON_WIDTH + (newX - BUTTON_WIDTH) * 0.3;
      } else if (newX < -BUTTON_WIDTH) {
        // Past delete button - apply rubber band
        newX = -BUTTON_WIDTH + (newX + BUTTON_WIDTH) * 0.3;
      }

      translateX.value = newX;
    })
    .onEnd((event) => {
      const currentX = translateX.value;
      const velocityX = event.velocityX;

      // Determine final position based on position and velocity
      if (
        currentX > SWIPE_THRESHOLD ||
        (velocityX > VELOCITY_THRESHOLD && currentX > 0)
      ) {
        // Open edit
        translateX.value = withSpring(BUTTON_WIDTH, {
          damping: 20,
          stiffness: 200,
        });
        isOpen.value = "edit";
      } else if (
        currentX < -SWIPE_THRESHOLD ||
        (velocityX < -VELOCITY_THRESHOLD && currentX < 0)
      ) {
        // Open delete
        translateX.value = withSpring(-BUTTON_WIDTH, {
          damping: 20,
          stiffness: 200,
        });
        isOpen.value = "delete";
      } else {
        // Close
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        isOpen.value = null;
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const editButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [0, BUTTON_WIDTH], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const scale = interpolate(translateX.value, [0, BUTTON_WIDTH], [0.8, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const deleteButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [-BUTTON_WIDTH, 0], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const scale = interpolate(translateX.value, [-BUTTON_WIDTH, 0], [1, 0.8], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <View style={styles.container}>
      {/* Edit button (left side, revealed on right swipe) */}
      <Animated.View
        style={[styles.buttonContainer, styles.editButton, editButtonStyle]}
      >
        <Pressable
          style={styles.buttonPressable}
          onPress={() => runOnJS(handleEdit)()}
        >
          <Pencil size={22} color="#fff" />
          <Text style={styles.buttonText}>Edit</Text>
        </Pressable>
      </Animated.View>

      {/* Delete button (right side, revealed on left swipe) */}
      <Animated.View
        style={[styles.buttonContainer, styles.deleteButton, deleteButtonStyle]}
      >
        <Pressable
          style={styles.buttonPressable}
          onPress={() => runOnJS(handleDelete)()}
        >
          <Trash2 size={22} color="#fff" />
          <Text style={styles.buttonText}>Delete</Text>
        </Pressable>
      </Animated.View>

      {/* Row content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.rowContent, rowStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  buttonContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: BUTTON_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    left: 0,
    backgroundColor: "#3B82F6", // Blue
  },
  deleteButton: {
    right: 0,
    backgroundColor: "#ef4444", // Red
  },
  buttonPressable: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  rowContent: {
    backgroundColor: "transparent",
  },
});
