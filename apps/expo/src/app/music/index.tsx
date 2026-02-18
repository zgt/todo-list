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
    error,
    refetch,
  } = useQuery(trpc.musicLeague.getAllLeagues.queryOptions());

  console.log("🎵 MUSIC DASHBOARD:", JSON.stringify({ isLoading, error: error?.message, leagueCount: leagues?.length, firstLeague: leagues?.[0]?.name }));

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
            style={{ flex: 1 }}
            contentContainerStyle={{ flex: 1, justifyContent: "center", paddingHorizontal: 32 }}
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
          <>
          <View style={{ backgroundColor: "red", padding: 8, margin: 8 }}>
            <Text style={{ color: "white", fontWeight: "bold" }}>
              DEBUG: {leagues?.length ?? 0} leagues found. isLoading={String(isLoading)}
            </Text>
          </View>
          <ScrollView
            style={{ flex: 1, borderWidth: 2, borderColor: "yellow" }}
            contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
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
                <Pressable
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#164B49",
                    backgroundColor: "#102A2A",
                    padding: 16,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ flex: 1, fontSize: 18, fontWeight: "600", color: "#DCE4E4" }}>
                      {item.name}
                    </Text>
                    <View style={{ marginLeft: 8, borderRadius: 9999, backgroundColor: "rgba(80,200,120,0.15)", paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: "500", color: "#50C878" }}>
                        {item.memberCount} members
                      </Text>
                    </View>
                  </View>

                  {item.currentRound ? (
                    <View style={{ marginTop: 12, borderRadius: 8, backgroundColor: "rgba(10,26,26,0.6)", padding: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ marginBottom: 2, fontSize: 11, fontWeight: "700", color: "#50C878", textTransform: "uppercase" }}>
                            Current Round
                          </Text>
                          <Text style={{ fontSize: 15, fontWeight: "500", color: "#DCE4E4" }}>
                            {item.currentRound.themeName}
                          </Text>
                        </View>
                        <View style={{ marginLeft: 8, borderRadius: 6, backgroundColor: "#164B49", paddingHorizontal: 8, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: "500", color: "#8FA8A8" }}>
                            {item.currentRound.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <Text style={{ marginTop: 8, fontSize: 13, color: "#8FA8A8", fontStyle: "italic" }}>
                      No active rounds
                    </Text>
                  )}
                </Pressable>
              </Link>
            ))}
          </ScrollView>
          </>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}
