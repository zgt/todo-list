import { Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import type { User } from "~/utils/auth";
import { UserAvatar } from "~/components/UserAvatar";

interface ProfileButtonProps {
  user: User;
  onPress: () => void;
}

const AVATAR_SIZE = 36;
const AVATAR_INSET = 2;
const INNER_AVATAR_SIZE = AVATAR_SIZE - AVATAR_INSET * 2;

const styles = StyleSheet.create({
  container: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: AVATAR_SIZE / 2,
  },
});

export function ProfileButton({ user, onPress }: ProfileButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    "worklet";
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    "worklet";
    scale.value = withSpring(1);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={`Profile: ${user.name}`}
      accessibilityRole="button"
      accessibilityHint="Open profile menu"
      hitSlop={8}
    >
      <Animated.View
        style={[styles.container, animatedStyle]}
        className="border-2 border-white/20"
      >
        <UserAvatar
          name={user.name}
          image={user.image}
          size={INNER_AVATAR_SIZE}
        />
      </Animated.View>
    </Pressable>
  );
}
