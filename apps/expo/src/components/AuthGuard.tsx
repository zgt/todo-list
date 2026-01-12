import { View } from "react-native";
import { Text as RNText } from "react-native";
import { GradientBackground } from "./GradientBackground";
import { SignInButton } from "./SignInButton";

export function AuthGuard() {
  return (
    <GradientBackground>
      <View className="flex-1 items-center justify-center px-8">
        {/* App Branding */}
        <View className="mb-8 items-center">
          <RNText className="mb-2 text-5xl font-bold text-[#DCE4E4]">
            Todo <RNText className="text-[#50C878]">list</RNText>
          </RNText>
          <View className="h-1 w-20 rounded-full bg-[#50C878]" />
        </View>

        {/* Compelling Message */}
        <View className="mb-12 items-center">
          <RNText className="mb-3 text-center text-2xl font-semibold text-[#DCE4E4]">
            Welcome back!
          </RNText>
          <RNText className="text-center text-base leading-relaxed text-[#8FA8A8]">
            Sign in with Discord to sync your tasks across all your devices and
            never lose track of what matters.
          </RNText>
        </View>

        {/* Sign-In Button */}
        <SignInButton size="large" />

        {/* Subtle Footer */}
        <View className="absolute bottom-12">
          <RNText className="text-center text-xs text-[#8FA8A8]/60">
            Your data is securely encrypted
          </RNText>
        </View>
      </View>
    </GradientBackground>
  );
}
