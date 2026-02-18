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
    trpc.musicLeague.getLeagueByInviteCode.queryOptions(
      { inviteCode: inviteCode ?? "" },
      { enabled: !!inviteCode },
    ),
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
        <SafeAreaView className="flex-1 items-center justify-center">
          <Stack.Screen options={{ headerShown: false }} />
          <ActivityIndicator size="large" color="#50C878" />
          <Text className="mt-4 text-[#8FA8A8]">Looking up league...</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Error / not found state
  if (error || !league) {
    return (
      <GradientBackground>
        <SafeAreaView className="flex-1" edges={["top"]}>
          <Stack.Screen options={{ headerShown: false }} />

          <View className="flex-row items-center px-4 py-4">
            <Pressable onPress={() => router.back()} className="rounded-full bg-[#164B49] p-2">
              <ArrowLeft color="#DCE4E4" size={24} />
            </Pressable>
          </View>

          <View className="flex-1 items-center justify-center px-8">
            <Text className="mb-2 text-center text-xl font-bold text-[#DCE4E4]">
              League not found
            </Text>
            <Text className="mb-6 text-center text-sm text-[#8FA8A8]">
              The invite code "{inviteCode}" doesn't match any league. Check the
              code and try again.
            </Text>
            <Pressable onPress={() => router.back()} className="rounded-xl bg-[#164B49] px-6 py-3 active:bg-[#21716C]">
              <Text className="font-semibold text-[#DCE4E4]">
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
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View className="flex-row items-center px-4 py-4">
          <Pressable onPress={() => router.back()} className="rounded-full bg-[#164B49] p-2">
            <ArrowLeft color="#DCE4E4" size={24} />
          </Pressable>
        </View>

        {/* League Preview */}
        <View className="flex-1 justify-center px-6">
          <View className="rounded-2xl border border-[#164B49] bg-[#102A2A] p-6">
            {/* Invite badge */}
            <View className="mb-4 self-start rounded-full bg-[#50C878]/20 px-3 py-1">
              <Text className="text-xs font-bold text-[#50C878] uppercase">
                You're invited
              </Text>
            </View>

            {/* League name */}
            <Text className="mb-2 text-2xl font-bold text-[#DCE4E4]">
              {league.name}
            </Text>

            {/* Description */}
            {league.description && (
              <Text className="mb-4 text-sm leading-5 text-[#8FA8A8]">
                {league.description}
              </Text>
            )}

            {/* Member count */}
            <View className="mb-6 flex-row items-center gap-2">
              <Users size={16} color="#8FA8A8" />
              <Text className="text-sm text-[#8FA8A8]">
                {league.memberCount}
                {league.maxMembers ? ` / ${league.maxMembers}` : ""} members
              </Text>
            </View>

            {/* Join button */}
            <Pressable
              onPress={handleJoin}
              disabled={joinMutation.isPending}
              className="items-center rounded-xl bg-[#50C878] py-4 active:bg-[#66D99A]"
              style={joinMutation.isPending ? { opacity: 0.5 } : undefined}
            >
              {joinMutation.isPending ? (
                <ActivityIndicator color="#0A1A1A" />
              ) : (
                <Text className="text-lg font-bold text-[#0A1A1A]">
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
