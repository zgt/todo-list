import { useState } from "react";
import { ActivityIndicator, Alert, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { LogIn } from "lucide-react-native";

import { authClient } from "~/utils/auth";

interface SignInButtonProps {
  size?: "default" | "large";
}

export function SignInButton({ size = "default" }: SignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const scale = useSharedValue(1);

  const sizeClass = size === "large" ? "h-14 w-14" : "h-10 w-10";
  const iconSize = size === "large" ? 28 : 20;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    "worklet";
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    "worklet";
    scale.value = withSpring(1);
  };

  const handleSignIn = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await authClient.signIn.social({
        provider: "discord",
        callbackURL: "todolist://",
      });
      // OAuth flow will redirect to Discord, then back to app
      // Session will update automatically via authClient.useSession()
    } catch (error) {
      console.error("Sign-in error:", error);
      Alert.alert(
        "Sign-in failed",
        "Could not connect to Discord. Please try again.",
      );
      setIsLoading(false);
    }
  };

  return (
    <Pressable
      onPress={handleSignIn}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isLoading}
      accessibilityLabel="Sign in with Discord"
      accessibilityRole="button"
      accessibilityHint="Opens Discord authentication"
    >
      <Animated.View
        style={animatedStyle}
        className={`${sizeClass} items-center justify-center overflow-hidden rounded-full border-2 border-[#164B49] bg-[#102A2A]/40`}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#50C878" />
        ) : (
          <LogIn size={iconSize} color="#50C878" />
        )}
      </Animated.View>
    </Pressable>
  );
}
