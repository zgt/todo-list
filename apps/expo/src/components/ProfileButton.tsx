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
        style={[
          animatedStyle,
          { width: 40, height: 40, overflow: "hidden", borderRadius: 20 },
        ]}
        className="border-2 border-white/20"
      >
        {user.image ? (
          <Image
            source={{ uri: user.image }}
            style={{ width: 40, height: 40 }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="bg-muted items-center justify-center"
            style={{ width: 40, height: 40 }}
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
