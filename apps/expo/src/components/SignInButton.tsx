import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import * as AppleAuthentication from "expo-apple-authentication";

import { authClient } from "~/utils/auth";

type Provider = "apple" | "discord";

interface SignInButtonProps {
  provider: Provider;
  size?: "default" | "large";
  showLabel?: boolean;
}

function AppleIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 1 24 24" fill="#FFFFFF">
      <Path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </Svg>
  );
}

function DiscordIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#FFFFFF">
      <Path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </Svg>
  );
}

const providerConfig = {
  apple: {
    label: "Apple",
    bgColor: "#000000",
    Icon: AppleIcon,
  },
  discord: {
    label: "Discord",
    bgColor: "#5865F2",
    Icon: DiscordIcon,
  },
};

export function SignInButton({
  provider,
  size = "default",
  showLabel = false,
}: SignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const scale = useSharedValue(1);

  const config = providerConfig[provider];
  const sizeClass = size === "large" ? "h-14" : "h-10";

  const iconSize = provider === "apple" ? 50 : size === "large" ? 44 : 18;
  const IconComponent = config.Icon;

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

  const handleAppleNativeSignIn = async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    console.log(credential);

    if (!credential.identityToken) {
      throw new Error("No identity token returned from Apple");
    }
    try {
      await authClient.signIn.social({
        provider: "apple",
        idToken: { token: credential.identityToken },
      });
    } catch (error: unknown) {
      console.error("Sign-in error:", error);
      Alert.alert(
        "Sign-in failed",
        `Could not connect to ${config.label}. Please try again.`,
      );
    }
  };

  const handleSignIn = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (provider === "apple" && Platform.OS === "ios") {
        await handleAppleNativeSignIn();
      } else {
        await authClient.signIn.social({
          provider,
          callbackURL: "tokilist://",
        });
      }
    } catch (error: unknown) {
      const code =
        error instanceof Error
          ? (error as Error & { code?: string }).code
          : undefined;
      if (code === "ERR_REQUEST_CANCELED") {
        // User cancelled, no alert needed
      } else {
        console.error("Sign-in error:", error);
        Alert.alert(
          "Sign-in failed",
          `Could not connect to ${config.label}. Please try again.`,
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showLabel) {
    return (
      <Pressable
        onPress={handleSignIn}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isLoading}
        accessibilityLabel={`Sign in with ${config.label}`}
        accessibilityRole="button"
        accessibilityHint={`Opens ${config.label} authentication`}
      >
        <Animated.View
          style={[animatedStyle, { backgroundColor: config.bgColor }]}
          className={`${sizeClass} flex-row items-center justify-center gap-3 rounded-xl px-6`}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <IconComponent size={iconSize} />
              <Text className="text-base font-semibold text-white">
                Sign in with {config.label}
              </Text>
            </>
          )}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handleSignIn}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isLoading}
      accessibilityLabel={`Sign in with ${config.label}`}
      accessibilityRole="button"
      accessibilityHint={`Opens ${config.label} authentication`}
    >
      <Animated.View
        style={[animatedStyle, { borderColor: "#164B49" }]}
        className={`${size === "large" ? "h-14 w-14" : "h-10 w-10"} items-center justify-center overflow-hidden rounded-full border`}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <IconComponent size={iconSize} />
        )}
      </Animated.View>
    </Pressable>
  );
}

export function SignInButtons({
  size = "large",
}: {
  size?: "default" | "large";
}) {
  return (
    <View className="flex-row items-center justify-center gap-5">
      <SignInButton provider="apple" size={size} />
      <SignInButton provider="discord" size={size} />
    </View>
  );
}
