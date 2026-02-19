import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  Music,
  Star,
  Trophy,
  Users,
} from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

interface StatCard {
  id: string;
  label: string;
  value: string | number;
  icon: React.ReactNode;
}

export default function ProfileScreen() {
  const router = useRouter();
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
  const {
    data: profile,
    isLoading,
    refetch,
  } = useQuery(trpc.musicLeague.getUserProfile.queryOptions());

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerRipple();
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch, triggerRipple]);

  if (isLoading) {
    return (
      <GradientBackground>
        <SafeAreaView className="flex-1 items-center justify-center">
          <Stack.Screen options={{ headerShown: false }} />
          <ActivityIndicator size="large" color="#50C878" />
          <Text className="mt-3 text-[#8FA8A8]">Loading profile...</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const stats: StatCard[] = [
    {
      id: "points",
      label: "Total Points",
      value: profile?.totalPoints ?? 0,
      icon: <Star size={20} color="#FFD700" />,
    },
    {
      id: "wins",
      label: "Rounds Won",
      value: profile?.roundsWon ?? 0,
      icon: <Trophy size={20} color="#50C878" />,
    },
    {
      id: "leagues",
      label: "Leagues Active",
      value: profile?.leaguesJoined ?? 0,
      icon: <Users size={20} color="#66B2FF" />,
    },
    {
      id: "submissions",
      label: "Total Submissions",
      value: profile?.totalSubmissions ?? 0,
      icon: <Music size={20} color="#BA68C8" />,
    },
  ];

  const renderStatCard = ({ item }: { item: StatCard }) => (
    <View className="flex-1 rounded-xl border border-[#164B49] bg-[#102A2A] p-4">
      <View className="mb-2">{item.icon}</View>
      <Text className="text-2xl font-bold text-[#DCE4E4]">{item.value}</Text>
      <Text className="text-xs text-[#8FA8A8]">{item.label}</Text>
    </View>
  );

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
          <Text className="text-xl font-bold text-[#DCE4E4]">Profile</Text>
          <View className="w-10" />
        </View>

        <FlatList
          data={[{ id: "content" }]}
          keyExtractor={(item) => item.id}
          renderItem={() => null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#50C878"
            />
          }
          ListHeaderComponent={
            <View className="px-4 pb-8">
              {/* User Avatar & Name */}
              <View className="mb-6 items-center">
                {session?.user.image ? (
                  <Image
                    source={{ uri: session.user.image }}
                    style={{ width: 80, height: 80, borderRadius: 40 }}
                  />
                ) : (
                  <View className="h-20 w-20 items-center justify-center rounded-full bg-[#164B49]">
                    <Text className="text-2xl font-bold text-[#50C878]">
                      {(session?.user.name ?? "?")[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text className="mt-3 text-xl font-bold text-[#DCE4E4]">
                  {session?.user.name ?? "User"}
                </Text>
                {profile && (
                  <Text className="mt-1 text-sm text-[#8FA8A8]">
                    {profile.roundsParticipated} rounds played
                  </Text>
                )}
              </View>

              {/* Stats Grid - 2x2 */}
              <View className="mb-6 gap-3">
                <View className="flex-row gap-3">
                  {stats.slice(0, 2).map((stat) => (
                    <View key={stat.id} className="flex-1">
                      {renderStatCard({ item: stat })}
                    </View>
                  ))}
                </View>
                <View className="flex-row gap-3">
                  {stats.slice(2, 4).map((stat) => (
                    <View key={stat.id} className="flex-1">
                      {renderStatCard({ item: stat })}
                    </View>
                  ))}
                </View>
              </View>

              {/* Best Submission */}
              {profile?.bestSubmission && (
                <View className="mb-6">
                  <Text className="mb-3 text-lg font-bold text-[#DCE4E4]">
                    Best Submission
                  </Text>
                  <View className="rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/5 p-4">
                    <View className="flex-row items-center gap-4">
                      {profile.bestSubmission.albumArtUrl ? (
                        <Image
                          source={{ uri: profile.bestSubmission.albumArtUrl }}
                          style={{ width: 72, height: 72, borderRadius: 8 }}
                        />
                      ) : (
                        <View className="h-[72px] w-[72px] items-center justify-center rounded-lg bg-[#0A1A1A]">
                          <Music size={28} color="#8FA8A8" />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text
                          className="text-base font-bold text-[#DCE4E4]"
                          numberOfLines={1}
                        >
                          {profile.bestSubmission.trackName}
                        </Text>
                        <Text
                          className="text-sm text-[#8FA8A8]"
                          numberOfLines={1}
                        >
                          {profile.bestSubmission.artistName}
                        </Text>
                        <Text className="mt-1 text-xs text-[#8FA8A8]">
                          Theme: {profile.bestSubmission.roundTheme}
                        </Text>
                        <View className="mt-2 flex-row items-center gap-1">
                          <Trophy size={14} color="#FFD700" />
                          <Text className="text-sm font-bold text-[#FFD700]">
                            {profile.bestSubmission.points} points
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Settings Link */}
              <Pressable
                onPress={() => router.push("/music/settings" as never)}
                className="flex-row items-center justify-between rounded-xl border border-[#164B49] bg-[#102A2A] p-4 active:bg-[#164B49]"
              >
                <View className="flex-row items-center gap-3">
                  <Bell size={20} color="#8FA8A8" />
                  <Text className="text-base font-medium text-[#DCE4E4]">
                    Notification Settings
                  </Text>
                </View>
                <ArrowLeft
                  size={18}
                  color="#8FA8A8"
                  style={{ transform: [{ rotate: "180deg" }] }}
                />
              </Pressable>
            </View>
          }
        />
      </SafeAreaView>
    </GradientBackground>
  );
}
