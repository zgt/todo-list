import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Stack, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Music, Plus, Search } from "lucide-react-native";

import { trpc } from "~/utils/api";
import { GradientBackground } from "../../components/GradientBackground";

export default function MusicLeagueDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: leagues,
    isLoading,
    refetch,
  } = useQuery(trpc.musicLeague.getAllLeagues.queryOptions());

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleJoinNavigate = () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      Alert.alert("Enter a code", "Please enter an invite code to join a league.");
      return;
    }
    setInviteCode("");
    router.push(`/music/join/${code}` as never);
  };

  return (
    <GradientBackground>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen
          options={{
            title: "Music Leagues",
            headerShown: false,
          }}
        />

        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <Text className="text-3xl font-bold text-[#DCE4E4]">
            Music Leagues
          </Text>
          <Link href="/music/league/create" asChild>
            <Pressable className="flex-row items-center gap-1.5 rounded-full bg-[#50C878] px-4 py-2 active:bg-[#66D99A]">
              <Plus size={18} color="#0A1A1A" strokeWidth={3} />
              <Text className="text-sm font-bold text-[#0A1A1A]">Create</Text>
            </Pressable>
          </Link>
        </View>

        {/* Join League Input */}
        <View className="flex-row items-center gap-2 px-4 pb-4">
          <View className="flex-1 flex-row items-center rounded-xl border border-[#164B49] bg-[#102A2A] px-3">
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
            className="rounded-xl bg-[#164B49] px-4 py-3 active:bg-[#21716C]"
            style={!inviteCode.trim() ? { opacity: 0.5 } : undefined}
          >
            <Text className="font-semibold text-[#DCE4E4]">Join</Text>
          </Pressable>
        </View>

        {/* Content */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#50C878" />
            <Text className="mt-3 text-[#8FA8A8]">Loading leagues...</Text>
          </View>
        ) : !leagues || leagues.length === 0 ? (
          <ScrollView
            contentContainerClassName="flex-1 justify-center px-8"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#50C878"
              />
            }
          >
            <View className="items-center">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-[#164B49]">
                <Music size={36} color="#50C878" />
              </View>
              <Text className="mb-2 text-center text-xl font-bold text-[#DCE4E4]">
                No leagues yet
              </Text>
              <Text className="mb-6 text-center text-sm leading-5 text-[#8FA8A8]">
                Create a new league to play with friends, or enter an invite
                code above to join one.
              </Text>
              <Link href="/music/league/create" asChild>
                <Pressable className="flex-row items-center gap-2 rounded-xl bg-[#50C878] px-6 py-3 active:bg-[#66D99A]">
                  <Plus size={20} color="#0A1A1A" strokeWidth={3} />
                  <Text className="text-base font-bold text-[#0A1A1A]">
                    Create Your First League
                  </Text>
                </Pressable>
              </Link>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="p-4 gap-3 pb-8"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#50C878"
              />
            }
          >
            {leagues.map((item) => (
              <Link
                key={item.id}
                href={`/music/league/${item.id}` as never}
                asChild
              >
                <Pressable className="rounded-xl border border-[#164B49] bg-[#102A2A] p-4 active:bg-[#164B49]/60">
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 text-xl font-semibold text-[#DCE4E4]">
                      {item.name}
                    </Text>
                    <View className="ml-2 rounded-full bg-[#50C878]/15 px-2.5 py-1">
                      <Text className="text-xs font-medium text-[#50C878]">
                        {item.memberCount} members
                      </Text>
                    </View>
                  </View>

                  {item.currentRound ? (
                    <View className="mt-3 rounded-lg bg-[#0A1A1A]/60 p-3">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="mb-0.5 text-xs font-bold text-[#50C878] uppercase">
                            Current Round
                          </Text>
                          <Text className="text-base font-medium text-[#DCE4E4]">
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
              </Link>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}
