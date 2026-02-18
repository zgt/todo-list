import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  Share2,
  Trash2,
  Trophy,
} from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import type { LeagueSettingsSheetRef } from "~/components/music/LeagueSettingsSheet";
import { LeagueSettingsSheet } from "~/components/music/LeagueSettingsSheet";
import { LeagueStandingsTable } from "~/components/music/LeagueStandingsTable";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

type RoundItem = {
  id: string;
  roundNumber: number;
  themeName: string;
  themeDescription: string | null;
  status: string;
};

export default function LeagueDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const settingsSheetRef = useRef<LeagueSettingsSheetRef>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: session } = authClient.useSession();
  const currentUserId = session?.user.id;

  const {
    data: league,
    isLoading,
    refetch: refetchLeague,
  } = useQuery(
    trpc.musicLeague.getLeagueById.queryOptions({ id: id }, { enabled: !!id }),
  );

  const {
    data: standings,
    refetch: refetchStandings,
  } = useQuery(
    trpc.musicLeague.getLeagueStandings.queryOptions(
      { leagueId: id },
      { enabled: !!id },
    ),
  );

  const regenerateInviteCodeMutation = useMutation(
    trpc.musicLeague.regenerateLeagueInviteCode.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getLeagueById.queryFilter(),
        );
      },
      onError: (error) => {
        Alert.alert("Failed to regenerate", error.message);
      },
    }),
  );

  const leaveLeagueMutation = useMutation(
    trpc.musicLeague.leaveLeague.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getAllLeagues.queryFilter(),
        );
        router.back();
      },
      onError: (error) => {
        Alert.alert("Failed to leave", error.message);
      },
    }),
  );

  const deleteLeagueMutation = useMutation(
    trpc.musicLeague.deleteLeague.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getAllLeagues.queryFilter(),
        );
        router.back();
      },
      onError: (error) => {
        Alert.alert("Failed to delete", error.message);
      },
    }),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchLeague(), refetchStandings()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchLeague, refetchStandings]);

  // Determine user role
  const currentMember = league?.members.find(
    (m: { userId: string }) => m.userId === currentUserId,
  );
  const isOwner = currentMember?.role === "OWNER";
  const isAdmin = currentMember?.role === "ADMIN" || isOwner;

  const handleShareInvite = async () => {
    if (!league) return;
    try {
      await Share.share({
        message: `Join my music league "${league.name}" with invite code: ${league.inviteCode}`,
      });
    } catch {
      // User cancelled share
    }
  };

  const handleRegenerateCode = () => {
    Alert.alert(
      "Regenerate Invite Code",
      "This will invalidate the current invite code. Anyone with the old code won't be able to join.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          style: "destructive",
          onPress: () => regenerateInviteCodeMutation.mutate({ leagueId: id }),
        },
      ],
    );
  };

  const handleLeaveLeague = () => {
    Alert.alert(
      "Leave League",
      "Are you sure you want to leave this league? You can rejoin with an invite code.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => leaveLeagueMutation.mutate({ leagueId: id }),
        },
      ],
    );
  };

  const handleDeleteLeague = () => {
    Alert.alert(
      "Delete League",
      "This will permanently delete the league and all its data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteLeagueMutation.mutate({ leagueId: id }),
        },
      ],
    );
  };

  const renderRoundCard = useCallback(({ item }: { item: RoundItem }) => (
    <Pressable
      onPress={() => router.push(`/music/round/${item.id}` as never)}
      className="rounded-lg border border-[#164B49] bg-[#102A2A] p-4 active:bg-[#164B49]"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="mb-1 text-xs font-bold uppercase text-[#50C878]">
            Round {item.roundNumber}
          </Text>
          <Text className="text-lg font-semibold text-[#DCE4E4]">
            {item.themeName}
          </Text>
          {item.themeDescription && (
            <Text className="text-sm text-[#8FA8A8]">
              {item.themeDescription}
            </Text>
          )}
        </View>
        <View className="ml-2 rounded-md bg-[#0A1A1A] px-2 py-1">
          <Text className="text-xs font-medium text-[#DCE4E4]">
            {item.status}
          </Text>
        </View>
      </View>
    </Pressable>
  ), [router]);

  if (isLoading || !league) {
    return (
      <GradientBackground>
        <SafeAreaView className="flex-1 items-center justify-center">
          <Stack.Screen options={{ headerShown: false }} />
          <ActivityIndicator size="large" color="#50C878" />
          <Text className="mt-3 text-[#8FA8A8]">Loading league details...</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
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
          <Text
            className="flex-1 text-center text-xl font-bold text-[#DCE4E4]"
            numberOfLines={1}
          >
            {league.name}
          </Text>
          {isAdmin ? (
            <Pressable
              onPress={() => settingsSheetRef.current?.present()}
              className="rounded-full bg-[#164B49] p-2"
            >
              <Settings color="#DCE4E4" size={20} />
            </Pressable>
          ) : (
            <View className="w-10" />
          )}
        </View>

        <FlatList
          data={league.rounds as RoundItem[]}
          keyExtractor={(item) => item.id}
          renderItem={renderRoundCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#50C878"
            />
          }
          ListHeaderComponent={
            <View>
              {/* Invite Code Card */}
              <View className="mb-4 rounded-xl border border-[#164B49] bg-[#102A2A] p-4">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-sm text-[#8FA8A8]">Invite Code</Text>
                    <Text className="font-mono text-2xl font-bold text-[#50C878]">
                      {league.inviteCode}
                    </Text>
                  </View>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={handleShareInvite}
                      className="h-10 w-10 items-center justify-center rounded-full bg-[#164B49] active:bg-[#21716C]"
                    >
                      <Share2 size={18} color="#DCE4E4" />
                    </Pressable>
                    {isAdmin && (
                      <Pressable
                        onPress={handleRegenerateCode}
                        disabled={regenerateInviteCodeMutation.isPending}
                        className="h-10 w-10 items-center justify-center rounded-full bg-[#164B49] active:bg-[#21716C]"
                        style={
                          regenerateInviteCodeMutation.isPending
                            ? { opacity: 0.5 }
                            : undefined
                        }
                      >
                        <RefreshCw size={18} color="#DCE4E4" />
                      </Pressable>
                    )}
                  </View>
                </View>
                <Text className="mt-2 text-sm text-[#8FA8A8]">
                  {league.members.length} members
                </Text>
              </View>

              {/* Admin: Create Round Button */}
              {isAdmin && (
                <Pressable
                  onPress={() => router.push(`/music/round/create?leagueId=${id}` as never)}
                  className="mb-4 flex-row items-center justify-center gap-2 rounded-xl bg-[#50C878] py-3 active:bg-[#66D99A]"
                >
                  <Plus size={20} color="#0A1A1A" strokeWidth={3} />
                  <Text className="text-base font-bold text-[#0A1A1A]">
                    Create Round
                  </Text>
                </Pressable>
              )}

              {/* Standings */}
              {standings && standings.length > 0 && (
                <View className="mb-6">
                  <View className="mb-3 flex-row items-center gap-2">
                    <Trophy size={18} color="#50C878" />
                    <Text className="text-xl font-bold text-[#DCE4E4]">
                      Standings
                    </Text>
                  </View>
                  <LeagueStandingsTable
                    standings={standings}
                    currentUserId={currentUserId ?? ""}
                  />
                </View>
              )}

              {/* Rounds Header */}
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-xl font-bold text-[#DCE4E4]">Rounds</Text>
              </View>

              {league.rounds.length === 0 && (
                <View className="items-center py-8">
                  <Text className="text-[#8FA8A8] italic">
                    No rounds started yet
                  </Text>
                </View>
              )}
            </View>
          }
          ListFooterComponent={
            <View>
              {/* Members */}
              <Text className="mt-8 mb-4 text-xl font-bold text-[#DCE4E4]">
                Members
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {league.members.map(
                  (member: {
                    id: string;
                    role: string;
                    userId: string;
                    user: { name: string | null };
                  }) => (
                    <View
                      key={member.id}
                      className={`flex-row items-center gap-2 rounded-full px-3 py-1 ${
                        member.userId === currentUserId
                          ? "bg-[#50C878]/20 border border-[#50C878]/40"
                          : "bg-[#164B49]"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          member.userId === currentUserId
                            ? "text-[#50C878]"
                            : "text-[#DCE4E4]"
                        }`}
                      >
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

              {/* Actions */}
              <View className="mt-8 gap-3">
                {!isOwner && (
                  <Pressable
                    onPress={handleLeaveLeague}
                    disabled={leaveLeagueMutation.isPending}
                    className="flex-row items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3 active:bg-red-500/20"
                    style={
                      leaveLeagueMutation.isPending ? { opacity: 0.5 } : undefined
                    }
                  >
                    <LogOut size={18} color="#ef4444" />
                    <Text className="font-semibold text-red-400">
                      Leave League
                    </Text>
                  </Pressable>
                )}

                {isOwner && (
                  <Pressable
                    onPress={handleDeleteLeague}
                    disabled={deleteLeagueMutation.isPending}
                    className="flex-row items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3 active:bg-red-500/20"
                    style={
                      deleteLeagueMutation.isPending ? { opacity: 0.5 } : undefined
                    }
                  >
                    <Trash2 size={18} color="#ef4444" />
                    <Text className="font-semibold text-red-400">
                      Delete League
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          }
        />

        {/* Settings Bottom Sheet */}
        {isAdmin && (
          <LeagueSettingsSheet
            ref={settingsSheetRef}
            leagueId={id}
            name={league.name}
            description={league.description}
            songsPerRound={league.songsPerRound}
            upvotePointsPerRound={league.upvotePointsPerRound}
            allowDownvotes={league.allowDownvotes}
          />
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}
