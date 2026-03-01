import { useEffect } from "react";
import { Alert, Pressable, Text as RNText, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Bell, LogOut, Music, Users } from "lucide-react-native";

import { UserAvatar } from "~/components/UserAvatar";
import type { User } from "~/utils/auth";
import { authClient } from "~/utils/auth";

interface ProfileMenuProps {
  visible: boolean;
  onClose: () => void;
  user: User;
}

export function ProfileMenu({ visible, onClose, user }: ProfileMenuProps) {
  const router = useRouter();
  const backdropOpacity = useSharedValue(0);
  const translateY = useSharedValue(300);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 40, stiffness: 150 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(300, { duration: 150 });
    }
  }, [visible, backdropOpacity, translateY]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      onClose();
    } catch (error) {
      console.error("Sign-out error:", error);
      Alert.alert("Sign-out failed", "Could not sign out. Please try again.");
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
      }}
      accessibilityViewIsModal={true}
    >
      {/* Backdrop */}
      <Pressable
        onPress={onClose}
        style={{ flex: 1 }}
        accessibilityElementsHidden={true}
      >
        <Animated.View
          style={[
            {
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
            },
            backdropAnimatedStyle,
          ]}
        />
      </Pressable>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
          },
          sheetAnimatedStyle,
        ]}
      >
        <View className="w-full rounded-t-3xl border-t border-[#164B49] bg-[#102A2A] p-6 shadow-2xl">
          {/* Profile Section */}
          <View className="mb-6 flex-row items-center gap-4">
            <View className="overflow-hidden rounded-full border-2 border-[#164B49]">
              <UserAvatar name={user.name} image={user.image} size={64} />
            </View>

            <View className="flex-1">
              <RNText className="text-xl font-semibold text-[#DCE4E4]">
                {user.name}
              </RNText>
              {user.email && (
                <RNText className="text-sm text-[#8FA8A8]">{user.email}</RNText>
              )}
            </View>
          </View>

          {/* Menu Items */}
          <View className="gap-2">
            <Pressable
              onPress={() => {
                onClose();
                router.push("/lists" as never);
              }}
              className="flex-row items-center gap-3 rounded-lg p-4 active:bg-[#183F3F]"
            >
              <Users size={20} color="#50C878" />
              <RNText className="text-base font-medium text-[#DCE4E4]">
                My Lists
              </RNText>
            </Pressable>

            <Pressable
              onPress={() => {
                onClose();
                router.push("/music" as never);
              }}
              className="flex-row items-center gap-3 rounded-lg p-4 active:bg-[#183F3F]"
            >
              <Music size={20} color="#50C878" />
              <RNText className="text-base font-medium text-[#DCE4E4]">
                Music Leagues
              </RNText>
            </Pressable>

            <Pressable
              onPress={() => {
                onClose();
                router.push("/settings" as never);
              }}
              className="flex-row items-center gap-3 rounded-lg p-4 active:bg-[#183F3F]"
            >
              <Bell size={20} color="#50C878" />
              <RNText className="text-base font-medium text-[#DCE4E4]">
                Notifications
              </RNText>
            </Pressable>

            <View className="my-2 h-px bg-[#164B49]" />

            <Pressable
              onPress={handleSignOut}
              className="flex-row items-center gap-3 rounded-lg p-4 active:bg-[#183F3F]"
              accessibilityLabel="Sign out"
              accessibilityRole="button"
            >
              <LogOut size={20} color="#E57373" />
              <RNText className="text-base font-medium text-[#E57373]">
                Sign Out
              </RNText>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
