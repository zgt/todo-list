import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ArrowLeft, Plus } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { GradientBackground } from "~/components/GradientBackground";

export default function LeagueDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: league, isLoading } = useQuery(
    trpc.musicLeague.getLeagueById.queryOptions(
      { id: id! },
      { enabled: !!id },
    ),
  );

  if (isLoading || !league) {
    return (
      <GradientBackground>
        <SafeAreaView className="flex-1 items-center justify-center">
          <Text className="text-[#8FA8A8]">Loading league details...</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const currentUserMember = league.members.find(
    (m: { userId: string; role: string }) =>
      m.role === "OWNER" || m.role === "ADMIN",
  );
  const userIsAdmin = league.members.some(
    (m: { userId: string; role: string }) =>
      m.role === "OWNER" || m.role === "ADMIN",
  );

  return (
    <GradientBackground>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4">
          <Link href="/music" asChild>
            <Pressable className="rounded-full bg-[#164B49] p-2">
              <ArrowLeft color="#DCE4E4" size={24} />
            </Pressable>
          </Link>
          <Text className="text-xl font-bold text-[#DCE4E4]">
            {league.name}
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1 p-4">
          {/* League Info */}
          <View className="mb-6 rounded-xl border border-[#164B49] bg-[#102A2A] p-4">
            <Text className="text-sm text-[#8FA8A8]">Invite Code</Text>
            <Text className="mb-2 font-mono text-2xl font-bold text-[#50C878]">
              {league.inviteCode}
            </Text>
            <Text className="text-sm text-[#8FA8A8]">
              {league.members.length} members
            </Text>
          </View>

          {/* Rounds */}
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-[#DCE4E4]">Rounds</Text>
          </View>

          {league.rounds.length > 0 ? (
            <View className="gap-3">
              {league.rounds.map(
                (round: {
                  id: string;
                  roundNumber: number;
                  themeName: string;
                  themeDescription: string | null;
                  status: string;
                }) => (
                  <Link
                    key={round.id}
                    href={`/music/round/${round.id}` as never}
                    asChild
                  >
                    <Pressable className="rounded-lg border border-[#164B49] bg-[#102A2A] p-4 active:bg-[#164B49]">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="mb-1 text-xs font-bold uppercase text-[#50C878]">
                            Round {round.roundNumber}
                          </Text>
                          <Text className="text-lg font-semibold text-[#DCE4E4]">
                            {round.themeName}
                          </Text>
                          <Text className="text-sm text-[#8FA8A8]">
                            {round.themeDescription}
                          </Text>
                        </View>
                        <View className="ml-2 rounded-md bg-[#0A1A1A] px-2 py-1">
                          <Text className="text-xs font-medium text-[#DCE4E4]">
                            {round.status}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  </Link>
                ),
              )}
            </View>
          ) : (
            <View className="items-center py-8">
              <Text className="italic text-[#8FA8A8]">
                No rounds started yet
              </Text>
            </View>
          )}

          {/* Members */}
          <Text className="mb-4 mt-8 text-xl font-bold text-[#DCE4E4]">
            Members
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {league.members.map(
              (member: {
                id: string;
                role: string;
                user: { name: string | null };
              }) => (
                <View
                  key={member.id}
                  className="flex-row items-center gap-2 rounded-full bg-[#164B49] px-3 py-1"
                >
                  <Text className="text-sm font-medium text-[#DCE4E4]">
                    {member.user.name ?? "Unknown"}
                  </Text>
                  {member.role === "OWNER" && (
                    <Text className="text-xs font-bold text-[#50C878]">
                      👑
                    </Text>
                  )}
                </View>
              ),
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}
