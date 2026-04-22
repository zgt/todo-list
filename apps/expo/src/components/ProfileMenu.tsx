import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef } from "react";
import { Alert, Linking, Pressable, Text as RNText, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
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
import { authClient, clearAuthStorage } from "~/utils/auth";

interface ProfileMenuProps {
  visible: boolean;
  onClose: () => void;
  user: User;
}

export function ProfileMenu({ visible, onClose, user }: ProfileMenuProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  const inputRef = useRef<ComponentRef<typeof BottomSheetTextInput>>(null);

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

  const handleDismiss = useCallback(() => {
    setIsEditingName(false);
    setEditedName(user.name);
    onClose();
  }, [onClose, user.name]);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Sign-out error:", error);
    } finally {
      clearAuthStorage();
      queryClient.clear();
      onClose();
    }
  };

  const snapPoints = useMemo(() => ["65%"], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: "#102A2A",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      handleIndicatorStyle={{ backgroundColor: "#164B49", width: 40 }}
    >
      <BottomSheetScrollView style={{ padding: 24 }}>
        {/* Profile Section */}
        <View className="mb-6 flex-row items-center gap-4">
          <View className="overflow-hidden rounded-full border-2 border-[#164B49]">
            <UserAvatar name={user.name} image={user.image} size={64} />
          </View>

          <View className="flex-1">
            {isEditingName ? (
              <View className="flex-row items-center gap-2">
                <BottomSheetTextInput
                  ref={inputRef}
                  value={editedName}
                  onChangeText={setEditedName}
                  onSubmitEditing={handleSaveName}
                  onBlur={handleSaveName}
                  maxLength={50}
                  returnKeyType="done"
                  autoFocus
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#21716C",
                    backgroundColor: "#0A1A1A",
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 18,
                    height: 48,
                    color: "#DCE4E4",
                    textAlignVertical: "center",
                  }}
                  placeholderTextColor="#8FA8A8"
                  placeholder="Display name"
                  editable={!updateNameMutation.isPending}
                />
                <Pressable
                  onPress={() => {
                    void Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Light,
                    );
                    handleSaveName();
                  }}
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
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            onPress={() => void Linking.openURL("https://calayo.net/privacy")}
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
            onPress={() => void Linking.openURL("https://calayo.net/terms")}
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
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              void handleSignOut();
            }}
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

        {/* Bottom padding for safe area */}
        <View style={{ height: 16 }} />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
