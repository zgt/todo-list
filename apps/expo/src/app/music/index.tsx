import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Music, Plus, Search, User } from "lucide-react-native";

import type { CreateLeagueSheetRef } from "~/components/music/CreateLeagueSheet";
import { CreateLeagueSheet } from "~/components/music/CreateLeagueSheet";
import { trpc } from "~/utils/api";
import { GradientBackground } from "../../components/GradientBackground";

export default function MusicLeagueDashboard() {
  const router = useRouter();
  const createLeagueRef = useRef<CreateLeagueSheetRef>(null);
  const [inviteCode, setInviteCode] = useState("");
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

  const {
    data: leagues,
    isLoading,
    refetch,
  } = useQuery(trpc.musicLeague.getAllLeagues.queryOptions());

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

  const handleJoinNavigate = () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      Alert.alert(
        "Enter a code",
        "Please enter an invite code to join a league.",
      );
      return;
    }
    setInviteCode("");
    router.push(`/music/join/${code}` as never);
  };

  const renderLeagueCard = useCallback(
    ({ item }: { item: NonNullable<typeof leagues>[number] }) => (
      <Pressable
        onPress={() => router.push(`/music/league/${item.id}` as never)}
        className="mx-4 mb-3 rounded-2xl border border-[#164B49] bg-[#102A2A] p-4 active:bg-[#164B49]/60"
        accessibilityLabel={`League: ${item.name}, ${item.memberCount} members`}
        accessibilityRole="button"
      >
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-lg font-semibold text-[#DCE4E4]">
            {item.name}
          </Text>
          <View className="ml-2 rounded-full bg-[#50C878]/15 px-2.5 py-1">
            <Text className="text-xs font-medium text-[#50C878]">
              {item.memberCount} members
            </Text>
          </View>
        </View>

        {item.currentRound ? (
          <View className="mt-3 rounded-xl bg-[#0A1A1A]/60 p-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="mb-0.5 text-[11px] font-bold text-[#50C878] uppercase">
                  Current Round
                </Text>
                <Text className="text-[15px] font-medium text-[#DCE4E4]">
                  {item.currentRound.themeName}
                </Text>
              </View>
              <View className="ml-2 rounded-md bg-[#164B49] px-2 py-1">
                <Text className="text-xs font-medium text-[#8FA8A8]">
                  {item.currentRound.status}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <Text className="mt-2 text-sm text-[#8FA8A8] italic">
            No active rounds
          </Text>
        )}
      </Pressable>
    ),
    [router],
  );

  return (
    <GradientBackground rippleTrigger={rippleTrigger}>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen
          options={{ title: "Music Leagues", headerShown: false }}
        />

        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <Text className="text-3xl font-bold text-[#DCE4E4]">
            Music Leagues
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => router.push("/music/profile" as never)}
              className="h-10 w-10 items-center justify-center rounded-full bg-[#164B49] active:bg-[#21716C]"
              accessibilityLabel="Profile"
              accessibilityRole="button"
            >
              <User size={18} color="#DCE4E4" />
            </Pressable>
            <Pressable
              onPress={() => createLeagueRef.current?.present()}
              className="flex-row items-center gap-1.5 rounded-full bg-[#50C878] px-4 py-2 active:bg-[#66D99A]"
              accessibilityLabel="Create league"
              accessibilityRole="button"
            >
              <Plus size={18} color="#0A1A1A" strokeWidth={3} />
              <Text className="text-sm font-bold text-[#0A1A1A]">Create</Text>
            </Pressable>
          </View>
        </View>

        {/* Join League Input */}
        <View className="flex-row items-center gap-2 px-4 pb-4">
          <View className="flex-1 flex-row items-center rounded-2xl border border-[#164B49] bg-[#102A2A] px-3">
            <Search size={18} color="#8FA8A8" />
            <TextInput
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="Enter invite code"
              placeholderTextColor="#8FA8A8"
              autoCapitalize="characters"
              returnKeyType="go"
              onSubmitEditing={handleJoinNavigate}
              className="flex-1 py-3 pl-2 text-base text-[#DCE4E4]"
            />
          </View>
          <Pressable
            onPress={handleJoinNavigate}
            disabled={!inviteCode.trim()}
            className="rounded-2xl bg-[#164B49] px-4 py-3 active:bg-[#21716C]"
            style={!inviteCode.trim() ? { opacity: 0.5 } : undefined}
            accessibilityLabel="Join league"
            accessibilityRole="button"
          >
            <Text className="font-semibold text-[#DCE4E4]">Join</Text>
          </Pressable>
        </View>

        {/* Content */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#50C878" />
          </View>
        ) : !leagues || leagues.length === 0 ? (
          <View className="flex-1 items-center px-8 pt-20">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-[#164B49]">
              <Music size={28} color="#50C878" />
            </View>
            <Text className="mb-2 text-center text-xl font-bold text-[#DCE4E4]">
              No leagues yet
            </Text>
            <Text className="mb-6 text-center text-sm leading-5 text-[#8FA8A8]">
              Create a new league to play with friends, or enter an invite code
              above to join one.
            </Text>
            <Pressable
              onPress={() => createLeagueRef.current?.present()}
              className="flex-row items-center gap-2 rounded-2xl bg-[#50C878] px-6 py-3 active:bg-[#66D99A]"
            >
              <Plus size={20} color="#0A1A1A" strokeWidth={3} />
              <Text className="text-base font-bold text-[#0A1A1A]">
                Create Your First League
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={leagues}
            keyExtractor={(item) => item.id}
            renderItem={renderLeagueCard}
            contentContainerStyle={{
              paddingTop: 4,
              paddingBottom: 100,
              flexGrow: 1,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#50C878"
              />
            }
          />
        )}
        <CreateLeagueSheet ref={createLeagueRef} />
      </SafeAreaView>
    </GradientBackground>
  );
}
