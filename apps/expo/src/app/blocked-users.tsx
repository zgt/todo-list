import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShieldBan } from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import { UserAvatar } from "~/components/UserAvatar";
import { trpc } from "~/utils/api";

export default function BlockedUsersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: blockedUsers, isLoading } = useQuery(
    trpc.moderation.getBlockedUsers.queryOptions(),
  );

  const unblockMutation = useMutation(
    trpc.moderation.unblockUser.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.moderation.getBlockedUsers.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.moderation.getBlockedUserIds.queryFilter(),
        );
      },
      onError: (error) => {
        Alert.alert("Error", error.message || "Failed to unblock user.");
      },
    }),
  );

  const handleUnblock = (blockedUserId: string, userName: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Unblock User", `Unblock ${userName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unblock",
        onPress: () => unblockMutation.mutate({ blockedUserId }),
      },
    ]);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              borderRadius: 999,
              backgroundColor: "#164B49",
              padding: 8,
            }}
          >
            <ArrowLeft color="#DCE4E4" size={24} />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#DCE4E4" }}>
            Blocked Users
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {isLoading ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator color="#50C878" />
          </View>
        ) : !blockedUsers?.length ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 32,
            }}
          >
            <ShieldBan size={48} color="#164B49" />
            <Text
              style={{
                fontSize: 16,
                color: "#8FA8A8",
                textAlign: "center",
                marginTop: 16,
              }}
            >
              No blocked users
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#8FA8A8",
                textAlign: "center",
                marginTop: 4,
                opacity: 0.7,
              }}
            >
              Users you block will appear here
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#164B49",
                backgroundColor: "#102A2A",
                overflow: "hidden",
              }}
            >
              {blockedUsers.map((item, index) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    borderBottomWidth: index < blockedUsers.length - 1 ? 1 : 0,
                    borderBottomColor: "#164B49",
                  }}
                >
                  <UserAvatar
                    name={item.user.name}
                    image={item.user.image}
                    size={40}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "500",
                        color: "#DCE4E4",
                      }}
                    >
                      {item.user.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#8FA8A8",
                        marginTop: 2,
                      }}
                    >
                      Blocked{" "}
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      handleUnblock(item.blockedUserId, item.user.name)
                    }
                    disabled={unblockMutation.isPending}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#164B49",
                      backgroundColor: "#0A1A1A",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: "#DCE4E4",
                      }}
                    >
                      Unblock
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}
