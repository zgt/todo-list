import { Text as RNText, View } from "react-native";

import { DotBackground } from "./DotBackground";
import { GradientBackground } from "./GradientBackground";
import { SignInButtons } from "./SignInButton";

export function AuthGuard() {
  return (
    <GradientBackground>
      <DotBackground />
      <View className="flex-1 items-center justify-center px-8">
        {/* Branding */}
        <View className="mb-8 items-center">
          <RNText className="mb-2 text-5xl font-bold text-[#DCE4E4]">
            Toki <RNText className="text-[#50C878]">list</RNText>
          </RNText>
          <View className="h-1 w-20 rounded-full bg-[#50C878]" />
        </View>

        <View className="mb-12 items-center rounded-full border border-[#164B49] bg-[#102A2A] px-6 py-3">
          <RNText className="mb-3 text-center text-2xl font-semibold text-[#DCE4E4]">
            Welcome back!
          </RNText>
          <RNText className="text-center text-base leading-relaxed text-[#8FA8A8]">
            Sign in to sync your tasks across all your devices and never lose
            track of what matters.
          </RNText>
        </View>

        {/* Sign-In Buttons */}
        <View className="top-70">
          <SignInButtons size="large" />
        </View>
        {/* Subtle Footer */}
        <View className="absolute bottom-12">
          <RNText className="text-center text-xs text-white">
            Sign in with Apple or Discord
          </RNText>
        </View>
      </View>
    </GradientBackground>
  );
}
