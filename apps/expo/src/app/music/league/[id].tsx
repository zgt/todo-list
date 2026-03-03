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
  Flag,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  Share2,
  Trophy,
} from "lucide-react-native";

import type { CreateRoundSheetRef } from "~/components/music/CreateRoundSheet";
import type { LeagueSettingsSheetRef } from "~/components/music/LeagueSettingsSheet";
import type { ReportSheetRef } from "~/components/music/ReportSheet";
import { GradientBackground } from "~/components/GradientBackground";
import { CreateRoundSheet } from "~/components/music/CreateRoundSheet";
import { LeagueSettingsSheet } from "~/components/music/LeagueSettingsSheet";
import { LeagueStandingsTable } from "~/components/music/LeagueStandingsTable";
import { ReportSheet } from "~/components/music/ReportSheet";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

interface RoundItem {
  id: string;
  roundNumber: number;
  themeName: string;
  themeDescription: string | null;
  status: string;
}

export default function LeagueDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const settingsSheetRef = useRef<LeagueSettingsSheetRef>(null);
  const createRoundRef = useRef<CreateRoundSheetRef>(null);
  const reportSheetRef = useRef<ReportSheetRef>(null);
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

  const { data: session } = authClient.useSession();
  const currentUserId = session?.user.id;

  const {
    data: league,
    isLoading,
    refetch: refetchLeague,
  } = useQuery(
    trpc.musicLeague.getLeagueById.queryOptions({ id: id }, { enabled: !!id }),
  );

  const { data: standings, refetch: refetchStandings } = useQuery(
    trpc.musicLeague.getLeagueStandings.queryOptions(
      { leagueId: id },
      { enabled: !!id },
    ),
  );

  const { data: blockedUserIds = [] } = useQuery(
    trpc.moderation.getBlockedUserIds.queryOptions(),
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
    triggerRipple();
    try {
      await Promise.all([refetchLeague(), refetchStandings()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchLeague, refetchStandings, triggerRipple]);

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

  const renderRoundCard = useCallback(
    ({ item }: { item: RoundItem }) => {
      const isPending = item.status === "PENDING";

      // Color-coded status badges
      const getStatusColors = (status: string) => {
        switch (status) {
          case "PENDING":
            return { bg: "rgba(107, 114, 128, 0.15)", text: "#6B7280" };
          case "SUBMISSION":
            return { bg: "rgba(80, 200, 120, 0.2)", text: "#50C878" }; // teal/green
          case "VOTING":
            return { bg: "rgba(234, 179, 8, 0.2)", text: "#EAB308" }; // amber
          case "RESULTS":
            return { bg: "rgba(100, 149, 237, 0.2)", text: "#6495ED" }; // blue
          default:
            return { bg: "rgba(138, 138, 138, 0.15)", text: "#8FA8A8" }; // gray
        }
      };

      const statusColors = getStatusColors(item.status);

      return (
        <Pressable
          onPress={() => router.push(`/music/round/${item.id}` as never)}
          accessibilityLabel={`Round ${item.roundNumber}: ${item.themeName}, ${item.status}`}
          accessibilityRole="button"
          style={[
            {
              borderRadius: 16,
              borderWidth: 1,
              borderColor: isPending ? "#1A3A3A" : "#164B49",
              backgroundColor: "#102A2A",
              padding: 16,
              marginBottom: 8,
            },
            isPending ? { opacity: 0.6 } : undefined,
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 6,
                  color: isPending ? "#6B7280" : "#50C878",
                }}
              >
                Round {item.roundNumber}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  marginBottom: 4,
                  color: isPending ? "#6B7280" : "#DCE4E4",
                }}
              >
                {item.themeName}
              </Text>
              {item.themeDescription && (
                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: 20,
                    color: isPending ? "#4B5563" : "#8FA8A8",
                  }}
                  numberOfLines={2}
                >
                  {item.themeDescription}
                </Text>
              )}
            </View>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: statusColors.bg,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: statusColors.text,
                }}
              >
                {item.status}
              </Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [router],
  );

  if (isLoading || !league) {
    return (
      <GradientBackground rippleTrigger={rippleTrigger}>
        <SafeAreaView
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Stack.Screen options={{ headerShown: false }} />
          <ActivityIndicator size="large" color="#50C878" />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground rippleTrigger={rippleTrigger}>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View className="px-4 py-4">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              className="rounded-full bg-[#164B49] p-2"
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <ArrowLeft color="#DCE4E4" size={24} />
            </Pressable>
            <Text
              className="flex-1 text-center text-xl font-bold text-[#DCE4E4]"
              numberOfLines={1}
            >
              {league.name}
            </Text>
            <View className="flex-row gap-2">
              {isAdmin && (
                <Pressable
                  onPress={() => settingsSheetRef.current?.present()}
                  className="rounded-full bg-[#164B49] p-2"
                >
                  <Settings color="#DCE4E4" size={20} />
                </Pressable>
              )}
              <Pressable
                onPress={() =>
                  reportSheetRef.current?.present({
                    contentType: "LEAGUE",
                    contentId: id,
                    contentLabel: league.name,
                    reportedUserId: league.creatorId,
                  })
                }
                className="rounded-full bg-[#164B49] p-2"
                accessibilityLabel="League settings"
                accessibilityRole="button"
              >
                <Flag color="#8FA8A8" size={20} />
              </Pressable>
            </View>
          </View>
          {league.description ? (
            <Text className="mt-1 text-center text-sm text-[#B8CFCF]">
              {league.description}
            </Text>
          ) : null}
        </View>

        <FlatList
          data={league.rounds as RoundItem[]}
          keyExtractor={(item) => item.id}
          renderItem={renderRoundCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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
              <View className="mb-4 rounded-2xl border border-[#50C878]/20 bg-[#102A2A] p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="mb-1 text-xs font-semibold tracking-wider text-[#8FA8A8] uppercase">
                      Invite Code
                    </Text>
                    <Text
                      className="font-mono text-2xl font-bold tracking-widest text-[#50C878]"
                      selectable
                    >
                      {league.inviteCode}
                    </Text>
                    <Text className="mt-1.5 text-xs text-[#8FA8A8]">
                      {league.members.length} members
                    </Text>
                  </View>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={handleShareInvite}
                      className="h-10 w-10 items-center justify-center rounded-full bg-[#164B49] active:bg-[#21716C]"
                      accessibilityLabel="Share invite code"
                      accessibilityRole="button"
                    >
                      <Share2 size={18} color="#DCE4E4" />
                    </Pressable>
                    {isAdmin && (
                      <Pressable
                        onPress={handleRegenerateCode}
                        disabled={regenerateInviteCodeMutation.isPending}
                        className="h-10 w-10 items-center justify-center rounded-full bg-[#164B49] active:bg-[#21716C]"
                        accessibilityLabel="Regenerate invite code"
                        accessibilityRole="button"
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
              </View>

              {/* Admin: Create Round Button */}
              {isAdmin && (
                <Pressable
                  onPress={() => createRoundRef.current?.present()}
                  className="mb-4 flex-row items-center justify-center gap-2 rounded-2xl bg-[#50C878] py-3 active:bg-[#66D99A]"
                  accessibilityLabel="Create round"
                  accessibilityRole="button"
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
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {league.members
                  .filter(
                    (member: { userId: string }) =>
                      !blockedUserIds.includes(member.userId),
                  )
                  .map(
                    (member: {
                      id: string;
                      role: string;
                      userId: string;
                      user: { name: string | null };
                    }) => (
                      <Pressable
                        key={member.id}
                        onLongPress={() => {
                          if (member.userId === currentUserId) return;
                          reportSheetRef.current?.present({
                            contentType: "USER",
                            contentId: member.userId,
                            contentLabel: member.user.name ?? "Unknown",
                            reportedUserId: member.userId,
                          });
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          borderRadius: 9999,
                          paddingHorizontal: 14,
                          paddingVertical: 6,
                          ...(member.userId === currentUserId
                            ? {
                                borderWidth: 1,
                                borderColor: "rgba(80, 200, 120, 0.4)",
                                backgroundColor: "rgba(80, 200, 120, 0.2)",
                              }
                            : {
                                backgroundColor: "#164B49",
                              }),
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "500",
                            color:
                              member.userId === currentUserId
                                ? "#50C878"
                                : "#DCE4E4",
                          }}
                        >
                          {member.user.name ?? "Unknown"}
                        </Text>
                        {member.role === "OWNER" && (
                          <Text style={{ fontSize: 12 }}>👑</Text>
                        )}
                      </Pressable>
                    ),
                  )}
              </View>

              {/* Actions */}
              {!isOwner && (
                <View style={{ marginTop: 32 }}>
                  <Pressable
                    onPress={handleLeaveLeague}
                    disabled={leaveLeagueMutation.isPending}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "rgba(239, 68, 68, 0.3)",
                      backgroundColor: pressed
                        ? "rgba(239, 68, 68, 0.2)"
                        : "rgba(239, 68, 68, 0.1)",
                      paddingVertical: 14,
                      opacity: leaveLeagueMutation.isPending ? 0.5 : 1,
                    })}
                  >
                    <LogOut size={18} color="#ef4444" />
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: "#f87171",
                      }}
                    >
                      Leave League
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          }
        />

        {/* Create Round Bottom Sheet */}
        {isAdmin && <CreateRoundSheet ref={createRoundRef} leagueId={id} />}

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
            downvotePointsPerRound={league.downvotePointsPerRound}
            submissionWindowDays={league.submissionWindowDays}
            votingWindowDays={league.votingWindowDays}
            isOwner={isOwner}
            onDeleteLeague={handleDeleteLeague}
          />
        )}

        {/* Report/Block Bottom Sheet */}
        <ReportSheet ref={reportSheetRef} />
      </SafeAreaView>
    </GradientBackground>
  );
}
