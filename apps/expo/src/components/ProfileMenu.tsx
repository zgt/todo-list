import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Linking,
  Pressable,
  Text as RNText,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  FileText,
  LogOut,
  Pencil,
  Settings,
  Shield,
  Users,
} from "lucide-react-native";

import type { User } from "~/utils/auth";
import { UserAvatar } from "~/components/UserAvatar";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

interface ProfileMenuProps {
  visible: boolean;
  onClose: () => void;
  user: User;
}

export function ProfileMenu({ visible, onClose, user }: ProfileMenuProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const backdropOpacity = useSharedValue(0);
  const translateY = useSharedValue(300);
  const keyboardOffset = useSharedValue(0);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  const inputRef = useRef<TextInput>(null);

  const updateNameMutation = useMutation(
    trpc.user.updateDisplayName.mutationOptions({
      onSuccess: () => {
        setIsEditingName(false);
        void queryClient.invalidateQueries();
        void authClient.getSession({ query: { disableCookieCache: true } });
      },
      onError: () => {
        Alert.alert(
          "Error",
          "Could not update display name. Please try again.",
        );
      },
    }),
  );

  const handleSaveName = () => {
    const trimmed = editedName.trim();
    if (!trimmed || trimmed === user.name) {
      setIsEditingName(false);
      setEditedName(user.name);
      return;
    }
    updateNameMutation.mutate({ name: trimmed });
  };

  const handleStartEditing = () => {
    setEditedName(user.name);
    setIsEditingName(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 40, stiffness: 150 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(300, { duration: 150 });
    }
    return () => {
      setIsEditingName(false);
      setEditedName(user.name);
    };
  }, [visible, backdropOpacity, translateY, user.name]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", (e) => {
      keyboardOffset.value = withTiming(-e.endCoordinates.height * 0.35, {
        duration: 250,
      });
    });
    const hideSub = Keyboard.addListener("keyboardWillHide", () => {
      keyboardOffset.value = withTiming(0, { duration: 250 });
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOffset]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + keyboardOffset.value }],
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
              {isEditingName ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    ref={inputRef}
                    value={editedName}
                    onChangeText={setEditedName}
                    onSubmitEditing={handleSaveName}
                    onBlur={handleSaveName}
                    maxLength={50}
                    returnKeyType="done"
                    autoFocus
                    className="flex-1 rounded-2xl border border-[#21716C] bg-[#0A1A1A] px-3 text-[#DCE4E4]"
                    style={{
                      paddingVertical: 10,
                      fontSize: 18,
                      height: 48,
                      textAlignVertical: "center",
                    }}
                    placeholderTextColor="#8FA8A8"
                    placeholder="Display name"
                    editable={!updateNameMutation.isPending}
                  />
                  <Pressable
                    onPress={handleSaveName}
                    disabled={updateNameMutation.isPending}
                    className="rounded-2xl bg-[#50C878] p-2 active:bg-[#388E3C]"
                  >
                    <Check size={18} color="#0A1A1A" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handleStartEditing}
                  className="flex-row items-center gap-2"
                >
                  <RNText className="text-xl font-semibold text-[#DCE4E4]">
                    {user.name}
                  </RNText>
                  <Pencil size={14} color="#8FA8A8" />
                </Pressable>
              )}
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
                router.push("/settings" as never);
              }}
              className="flex-row items-center gap-3 rounded-lg p-4 active:bg-[#183F3F]"
            >
              <Bell size={20} color="#50C878" />
              <RNText className="text-base font-medium text-[#DCE4E4]">
                Notifications
              </RNText>
            </Pressable>

            <Pressable
              onPress={() => {
                onClose();
                router.push("/profile" as never);
              }}
              className="flex-row items-center gap-3 rounded-lg p-4 active:bg-[#183F3F]"
            >
              <Settings size={20} color="#50C878" />
              <RNText className="text-base font-medium text-[#DCE4E4]">
                Account Settings
              </RNText>
            </Pressable>

            <View className="my-2 h-px bg-[#164B49]" />

            <Pressable
              onPress={() =>
                void Linking.openURL("https://tokilist.com/privacy")
              }
              className="flex-row items-center gap-3 rounded-lg p-4 active:bg-[#183F3F]"
              accessibilityLabel="Privacy Policy"
              accessibilityRole="link"
            >
              <Shield size={20} color="#8FA8A8" />
              <RNText className="text-base font-medium text-[#8FA8A8]">
                Privacy Policy
              </RNText>
            </Pressable>

            <Pressable
              onPress={() => void Linking.openURL("https://tokilist.com/terms")}
              className="flex-row items-center gap-3 rounded-lg p-4 active:bg-[#183F3F]"
              accessibilityLabel="Terms of Service"
              accessibilityRole="link"
            >
              <FileText size={20} color="#8FA8A8" />
              <RNText className="text-base font-medium text-[#8FA8A8]">
                Terms of Service
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
