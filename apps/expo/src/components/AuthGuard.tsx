import { useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";

import { DotBackground } from "./DotBackground";
import { GradientBackground } from "./GradientBackground";
import { SignInButtons } from "./SignInButton";

export function AuthGuard() {
  const [dotTrigger, setDotTrigger] = useState(false);

  return (
    <GradientBackground>
      <DotBackground trigger={dotTrigger} />
      <View className="flex-1 items-center justify-center px-8">
        {/* App Branding */}
        <View className="mb-8 items-center">
          <RNText className="mb-2 text-5xl font-bold text-[#DCE4E4]">
            Toki <RNText className="text-[#50C878]">list</RNText>
          </RNText>
          <View className="h-1 w-20 rounded-full bg-[#50C878]" />
        </View>

        {/* Compelling Message */}
        <View className="mb-12 items-center">
          <RNText className="mb-3 text-center text-2xl font-semibold text-[#DCE4E4]">
            Welcome back!
          </RNText>
          <RNText className="text-center text-base leading-relaxed text-[#8FA8A8]">
            Sign in to sync your tasks across all your devices and never lose
            track of what matters.
          </RNText>
        </View>

        {/* Ripple Trigger */}
        <Pressable
          onPress={() => setDotTrigger((prev) => !prev)}
          className="mb-6 rounded-full border border-[#164B49] bg-[#102A2A] px-6 py-3"
        >
          <RNText className="text-sm font-medium text-[#50C878]">Ripple</RNText>
        </Pressable>

        {/* Sign-In Buttons */}
        <View className="top-60">
          <SignInButtons size="large" />
        </View>
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
