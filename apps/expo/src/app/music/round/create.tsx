import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Info,
  Sparkles,
} from "lucide-react-native";

import type { ThemeTemplatePickerRef } from "~/components/music/ThemeTemplatePicker";
import { GradientBackground } from "~/components/GradientBackground";
import { ThemeTemplatePicker } from "~/components/music/ThemeTemplatePicker";
import { trpc } from "~/utils/api";

export default function CreateRound() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const themePickerRef = useRef<ThemeTemplatePickerRef>(null);

  const [themeName, setThemeName] = useState("");
  const [themeDescription, setThemeDescription] = useState("");

  const { data: league } = useQuery(
    trpc.musicLeague.getLeagueById.queryOptions(
      { id: leagueId },
      { enabled: !!leagueId },
    ),
  );

  // Check if there's an unfinished round
  const hasUnfinishedRound = league?.rounds.some(
    (r: { status: string }) =>
      r.status !== "COMPLETED" && r.status !== "PENDING",
  );

  const createRoundMutation = useMutation(
    trpc.musicLeague.createRound.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getLeagueById.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.musicLeague.getAllLeagues.queryFilter(),
        );
        if (data?.id) {
          router.replace(`/music/round/${data.id}` as never);
        } else {
          router.back();
        }
      },
      onError: (error) => {
        Alert.alert("Failed to create round", error.message);
      },
    }),
  );

  const handleCreate = () => {
    if (!themeName.trim()) {
      Alert.alert("Theme required", "Please enter a theme name for the round.");
      return;
    }
    if (!leagueId) {
      Alert.alert("Error", "Missing league ID.");
      return;
    }

    createRoundMutation.mutate({
      leagueId,
      themeName: themeName.trim(),
      themeDescription: themeDescription.trim() || undefined,
    });
  };

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
          <Text className="text-xl font-bold text-[#DCE4E4]">Create Round</Text>
          <View className="w-10" />
        </View>

        <FlatList
          data={[{ key: "form" }]}
          renderItem={() => null}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ListHeaderComponent={
            <View>
              {/* Theme Name */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
                  Theme Name *
                </Text>
                <TextInput
                  value={themeName}
                  onChangeText={setThemeName}
                  placeholder="e.g. Songs That Define You"
                  placeholderTextColor="#8FA8A8"
                  maxLength={200}
                  className="rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-3 text-base text-[#DCE4E4]"
                />
              </View>

              {/* Browse Themes Button */}
              <Pressable
                onPress={() => themePickerRef.current?.present()}
                className="mb-4 flex-row items-center justify-center gap-2 rounded-xl border border-[#164B49] bg-[#102A2A] py-3 active:bg-[#164B49]"
              >
                <Sparkles size={18} color="#50C878" />
                <Text className="font-semibold text-[#50C878]">
                  Browse Themes
                </Text>
              </Pressable>

              {/* Theme Description */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
                  Description (optional)
                </Text>
                <TextInput
                  value={themeDescription}
                  onChangeText={setThemeDescription}
                  placeholder="Add some context or rules for this round..."
                  placeholderTextColor="#8FA8A8"
                  maxLength={500}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="min-h-[80px] rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-3 text-base text-[#DCE4E4]"
                />
              </View>

              {/* League Defaults Summary */}
              <View className="mb-6 rounded-xl border border-[#164B49] bg-[#0A1A1A]/60 p-4">
                <Text className="mb-3 text-sm font-bold text-[#DCE4E4]">
                  Round Schedule
                </Text>
                {league ? (
                  <>
                    <View className="mb-2 flex-row items-center gap-2">
                      <Calendar size={14} color="#50C878" />
                      <Text className="text-sm text-[#8FA8A8]">
                        {league.submissionWindowDays} day
                        {league.submissionWindowDays !== 1 ? "s" : ""} for
                        submissions
                      </Text>
                    </View>
                    <View className="mb-2 flex-row items-center gap-2">
                      <Clock size={14} color="#50C878" />
                      <Text className="text-sm text-[#8FA8A8]">
                        {league.votingWindowDays} day
                        {league.votingWindowDays !== 1 ? "s" : ""} for voting
                      </Text>
                    </View>
                    {hasUnfinishedRound && (
                      <View className="mt-2 flex-row items-start gap-2 rounded-lg bg-[#FFA500]/10 p-3">
                        <Info
                          size={14}
                          color="#FFA500"
                          style={{ marginTop: 1 }}
                        />
                        <Text className="flex-1 text-xs text-[#FFA500]">
                          This round will start after the current round ends
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <ActivityIndicator size="small" color="#50C878" />
                )}
              </View>

              {/* Create Button */}
              <Pressable
                onPress={handleCreate}
                disabled={createRoundMutation.isPending || !themeName.trim()}
                style={{
                  alignItems: "center",
                  borderRadius: 12,
                  backgroundColor: "#50C878",
                  paddingVertical: 16,
                  opacity:
                    createRoundMutation.isPending || !themeName.trim()
                      ? 0.5
                      : 1,
                }}
              >
                {createRoundMutation.isPending ? (
                  <ActivityIndicator color="#0A1A1A" />
                ) : (
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: "#0A1A1A",
                    }}
                  >
                    {hasUnfinishedRound ? "Queue Round" : "Create Round"}
                  </Text>
                )}
              </Pressable>
            </View>
          }
        />

        <ThemeTemplatePicker
          ref={themePickerRef}
          onSelectTheme={setThemeName}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}
