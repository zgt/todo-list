import { useCallback, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShieldOff } from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import { UserAvatar } from "~/components/UserAvatar";
import { trpc } from "~/utils/api";

export default function BlockedUsersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [rippleTrigger, setRippleTrigger] = useState(0);
  const rippleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRipple = useCallback(() => {
    if (rippleDebounceRef.current) return;
    setRippleTrigger((prev) => prev + 1);
    rippleDebounceRef.current = setTimeout(() => {
      rippleDebounceRef.current = null;
    }, 500);
  }, []);

  const { data: blockedUsers, refetch } = useQuery(
    trpc.moderation.getBlockedUsers.queryOptions(),
  );

  const unblockMutation = useMutation(
    trpc.moderation.unblockUser.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.moderation.getBlockedUsers.queryFilter(),
          ),
          queryClient.invalidateQueries(
            trpc.moderation.getBlockedUserIds.queryFilter(),
          ),
        ]);
      },
      onError: (error) => {
        Alert.alert("Failed to unblock", error.message);
      },
    }),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    triggerRipple();
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch, triggerRipple]);

  const handleUnblock = (userId: string, userName: string) => {
    Alert.alert(
      "Unblock User",
      `Unblock ${userName}? You'll see their content again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          onPress: () => unblockMutation.mutate({ blockedUserId: userId }),
        },
      ],
    );
  };

  return (
    <GradientBackground rippleTrigger={rippleTrigger}>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4">
          <Pressable
            onPress={() => router.back()}
            className="rounded-full bg-[#164B49] p-2"
          >
            <ArrowLeft color="#DCE4E4" size={24} />
          </Pressable>
          <Text className="text-xl font-bold text-[#DCE4E4]">
            Blocked Users
          </Text>
          <View className="w-10" />
        </View>

        <FlatList
          data={blockedUsers ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#50C878"
            />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <ShieldOff
                size={40}
                color="#8FA8A8"
                style={{ marginBottom: 12 }}
              />
              <Text className="text-base text-[#8FA8A8]">No blocked users</Text>
              <Text className="mt-1 text-sm text-[#4B6B6B]">
                Users you block will appear here
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#164B49",
                backgroundColor: "#102A2A",
                marginBottom: 8,
              }}
            >
              <UserAvatar
                name={item.user.name}
                image={item.user.image}
                size={40}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{ fontSize: 16, fontWeight: "600", color: "#DCE4E4" }}
                >
                  {item.user.name}
                </Text>
                <Text style={{ fontSize: 12, color: "#8FA8A8", marginTop: 2 }}>
                  Blocked {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  handleUnblock(item.blockedUserId, item.user.name)
                }
                disabled={unblockMutation.isPending}
                style={({ pressed }) => ({
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: pressed
                    ? "rgba(239, 68, 68, 0.2)"
                    : "rgba(239, 68, 68, 0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(239, 68, 68, 0.3)",
                  opacity: unblockMutation.isPending ? 0.5 : 1,
                })}
              >
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#f87171" }}
                >
                  Unblock
                </Text>
              </Pressable>
            </View>
          )}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}
