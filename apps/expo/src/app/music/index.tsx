import { Link, Stack } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Plus } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { GradientBackground } from "../../components/GradientBackground";

export default function MusicLeagueDashboard() {
  const { data: leagues, isLoading } = useQuery(
    trpc.musicLeague.getAllLeagues.queryOptions(),
  );

  return (
    <GradientBackground>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen
          options={{
            title: "Music Leagues",
            headerShown: false,
          }}
        />

        <View className="flex-row items-center justify-between px-6 py-4">
          <Text className="text-3xl font-bold text-[#DCE4E4]">
            Music Leagues
          </Text>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-[#8FA8A8]">Loading leagues...</Text>
          </View>
        ) : !leagues || leagues.length === 0 ? (
          <View className="mt-10 items-center px-8">
            <Text className="text-center text-lg font-medium text-[#DCE4E4]">
              No leagues yet
            </Text>
            <Text className="mt-2 text-center text-sm text-[#8FA8A8]">
              Create a new league or join one with an invite code to get
              started!
            </Text>
          </View>
        ) : (
          <View className="flex-1 p-4 gap-3">
            {leagues.map((item) => (
              <Link key={item.id} href={`/music/league/${item.id}` as never} asChild>
                <Pressable className="rounded-xl border border-[#164B49] bg-[#102A2A] p-4 active:bg-[#164B49]">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xl font-semibold text-[#DCE4E4]">
                      {item.name}
                    </Text>
                    <View className="rounded-full bg-[#164B49] px-2 py-1">
                      <Text className="text-xs font-medium text-[#50C878]">
                        {item.memberCount} members
                      </Text>
                    </View>
                  </View>

                  {item.currentRound ? (
                    <View className="mt-3 rounded-lg bg-[#0A1A1A] p-3">
                      <Text className="mb-1 text-xs font-bold uppercase text-[#50C878]">
                        Current Round
                      </Text>
                      <Text className="text-base font-medium text-[#DCE4E4]">
                        {item.currentRound.themeName}
                      </Text>
                      <Text className="text-sm text-[#8FA8A8]">
                        Status: {item.currentRound.status}
                      </Text>
                    </View>
                  ) : (
                    <Text className="mt-2 text-sm italic text-[#8FA8A8]">
                      No active rounds
                    </Text>
                  )}
                </Pressable>
              </Link>
            ))}
          </View>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}
