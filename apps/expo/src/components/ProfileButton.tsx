import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text as RNText } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import type { User } from "~/utils/auth";

interface ProfileButtonProps {
  user: User;
  onPress: () => void;
}

const AVATAR_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    overflow: "hidden",
    borderRadius: AVATAR_SIZE / 2,
  },
  image: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  placeholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
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
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
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
    >
      <Animated.View
        style={[styles.container, animatedStyle]}
        className="border-2 border-white/20"
      >
        {user.image ? (
          <Image
            source={{ uri: user.image }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View
            className="bg-muted items-center justify-center"
            style={styles.placeholder}
          >
            <RNText className="text-muted-foreground font-bold">
              {user.name?.charAt(0) ?? "?"}
            </RNText>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}
