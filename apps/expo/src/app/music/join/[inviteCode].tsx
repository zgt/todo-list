import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users } from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import { trpc } from "~/utils/api";

export default function JoinLeague() {
  const { inviteCode } = useLocalSearchParams<{ inviteCode: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: league,
    isLoading,
    error,
  } = useQuery(
    trpc.musicLeague.getLeagueByInviteCode.queryOptions({
      inviteCode: String(inviteCode),
    }),
  );

  const joinMutation = useMutation(
    trpc.musicLeague.joinLeague.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getAllLeagues.queryFilter(),
        );
        router.replace(`/music/league/${data.id}` as never);
      },
      onError: (error) => {
        if (error.message.includes("already a member")) {
          // Redirect to the league if already a member
          if (league) {
            router.replace(`/music/league/${league.id}` as never);
          }
          return;
        }
        Alert.alert("Failed to join", error.message);
      },
    }),
  );

  const handleJoin = () => {
    if (!inviteCode) return;
    joinMutation.mutate({ inviteCode });
  };

  // Loading state
  if (isLoading) {
    return (
      <GradientBackground>
        <SafeAreaView style={{ flex: 1 }}>
          <Stack.Screen options={{ headerShown: false }} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Error / not found state
  if (error || !league) {
    return (
      <GradientBackground>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <Stack.Screen options={{ headerShown: false }} />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
          >
            <Pressable
              onPress={() => router.back()}
              style={{
                borderRadius: 9999,
                backgroundColor: "#164B49",
                padding: 8,
              }}
            >
              <ArrowLeft color="#DCE4E4" size={24} />
            </Pressable>
          </View>

          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 32,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#DCE4E4",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              League not found
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#8FA8A8",
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              The invite code "{inviteCode}" doesn't match any league. Check the
              code and try again.
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={{
                borderRadius: 12,
                backgroundColor: "#164B49",
                paddingHorizontal: 24,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{
                  fontWeight: "600",
                  color: "#DCE4E4",
                }}
              >
                Back to Dashboard
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              borderRadius: 9999,
              backgroundColor: "#164B49",
              padding: 8,
            }}
          >
            <ArrowLeft color="#DCE4E4" size={24} />
          </Pressable>
        </View>

        {/* League Preview */}
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#164B49",
              backgroundColor: "#102A2A",
              padding: 24,
            }}
          >
            {/* Invite badge */}
            <View
              style={{
                alignSelf: "flex-start",
                borderRadius: 9999,
                backgroundColor: "rgba(80, 200, 120, 0.2)",
                paddingHorizontal: 12,
                paddingVertical: 4,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#50C878",
                  textTransform: "uppercase",
                }}
              >
                You're invited
              </Text>
            </View>

            {/* League name */}
            <Text
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: "#DCE4E4",
                marginBottom: 8,
              }}
            >
              {league.name}
            </Text>

            {/* Description */}
            {league.description && (
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: "#8FA8A8",
                  marginBottom: 16,
                }}
              >
                {league.description}
              </Text>
            )}

            {/* Member count */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 24,
              }}
            >
              <Users size={16} color="#8FA8A8" />
              <Text style={{ fontSize: 14, color: "#8FA8A8" }}>
                {league.memberCount}
                {league.maxMembers ? ` / ${league.maxMembers}` : ""} members
              </Text>
            </View>

            {/* Join button */}
            <Pressable
              onPress={handleJoin}
              disabled={joinMutation.isPending}
              style={{
                alignItems: "center",
                borderRadius: 12,
                backgroundColor: "#50C878",
                paddingVertical: 16,
                opacity: joinMutation.isPending ? 0.5 : 1,
              }}
            >
              {joinMutation.isPending ? (
                <ActivityIndicator color="#0A1A1A" />
              ) : (
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#0A1A1A",
                  }}
                >
                  Join League
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}
