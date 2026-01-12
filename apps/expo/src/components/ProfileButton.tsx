import { Image, Pressable, View } from "react-native";
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

export function ProfileButton({ user, onPress }: ProfileButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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
        style={animatedStyle}
        className="h-10 w-10 overflow-hidden rounded-full border-2 border-white/20"
      >
        {user.image ? (
          <Image
            source={{ uri: user.image }}
            className="h-full w-full"
          />
        ) : (
          <View className="bg-muted h-full w-full items-center justify-center">
            <RNText className="text-muted-foreground font-bold">
              {user.name?.charAt(0) ?? "?"}
            </RNText>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}
