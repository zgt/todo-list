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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Check, Sparkles } from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import type { ThemeTemplatePickerRef } from "~/components/music/ThemeTemplatePicker";
import { ThemeTemplatePicker } from "~/components/music/ThemeTemplatePicker";
import { trpc } from "~/utils/api";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  result.setHours(20, 0, 0, 0);
  return result;
}

const SUBMISSION_PRESETS = [
  { label: "1 day", days: 1 },
  { label: "2 days", days: 2 },
  { label: "3 days", days: 3 },
  { label: "5 days", days: 5 },
  { label: "1 week", days: 7 },
];

const VOTING_GAP_PRESETS = [
  { label: "+1 day", days: 1 },
  { label: "+2 days", days: 2 },
  { label: "+3 days", days: 3 },
  { label: "+5 days", days: 5 },
];

export default function CreateRound() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const themePickerRef = useRef<ThemeTemplatePickerRef>(null);

  const [themeName, setThemeName] = useState("");
  const [themeDescription, setThemeDescription] = useState("");
  const [submissionDays, setSubmissionDays] = useState(3);
  const [votingGapDays, setVotingGapDays] = useState(2);

  const submissionDeadline = addDays(new Date(), submissionDays);
  const votingDeadline = addDays(submissionDeadline, votingGapDays);

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
      submissionDeadline: submissionDeadline.toISOString(),
      votingDeadline: votingDeadline.toISOString(),
    });
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

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
          <Text className="text-xl font-bold text-[#DCE4E4]">
            Create Round
          </Text>
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

              {/* Submission Deadline */}
              <Text className="mb-3 text-lg font-bold text-[#DCE4E4]">
                Deadlines
              </Text>

              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
                  Submission window
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {SUBMISSION_PRESETS.map((preset) => (
                    <Pressable
                      key={preset.days}
                      onPress={() => setSubmissionDays(preset.days)}
                      className={`rounded-full px-4 py-2 ${
                        submissionDays === preset.days
                          ? "border border-[#50C878] bg-[#50C878]/20"
                          : "border border-[#164B49] bg-[#102A2A]"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          submissionDays === preset.days
                            ? "text-[#50C878]"
                            : "text-[#8FA8A8]"
                        }`}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View className="mt-2 flex-row items-center gap-2">
                  <Calendar size={14} color="#8FA8A8" />
                  <Text className="text-xs text-[#8FA8A8]">
                    Closes {formatDate(submissionDeadline)}
                  </Text>
                </View>
              </View>

              {/* Voting Deadline */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
                  Voting window (after submissions close)
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {VOTING_GAP_PRESETS.map((preset) => (
                    <Pressable
                      key={preset.days}
                      onPress={() => setVotingGapDays(preset.days)}
                      className={`rounded-full px-4 py-2 ${
                        votingGapDays === preset.days
                          ? "border border-[#50C878] bg-[#50C878]/20"
                          : "border border-[#164B49] bg-[#102A2A]"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          votingGapDays === preset.days
                            ? "text-[#50C878]"
                            : "text-[#8FA8A8]"
                        }`}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View className="mt-2 flex-row items-center gap-2">
                  <Calendar size={14} color="#8FA8A8" />
                  <Text className="text-xs text-[#8FA8A8]">
                    Closes {formatDate(votingDeadline)}
                  </Text>
                </View>
              </View>

              {/* Summary */}
              <View className="mb-6 rounded-xl border border-[#164B49] bg-[#0A1A1A]/60 p-4">
                <Text className="mb-2 text-sm font-bold text-[#DCE4E4]">
                  Summary
                </Text>
                <View className="flex-row items-center gap-2">
                  <Check size={14} color="#50C878" />
                  <Text className="text-sm text-[#8FA8A8]">
                    Submissions open for {submissionDays} day{submissionDays !== 1 ? "s" : ""}
                  </Text>
                </View>
                <View className="mt-1 flex-row items-center gap-2">
                  <Check size={14} color="#50C878" />
                  <Text className="text-sm text-[#8FA8A8]">
                    Voting open for {votingGapDays} day{votingGapDays !== 1 ? "s" : ""} after
                  </Text>
                </View>
                <View className="mt-1 flex-row items-center gap-2">
                  <Check size={14} color="#50C878" />
                  <Text className="text-sm text-[#8FA8A8]">
                    Results on {formatDate(votingDeadline)}
                  </Text>
                </View>
              </View>

              {/* Create Button */}
              <Pressable
                onPress={handleCreate}
                disabled={createRoundMutation.isPending || !themeName.trim()}
                className="items-center rounded-xl bg-[#50C878] py-4 active:bg-[#66D99A]"
                style={
                  createRoundMutation.isPending || !themeName.trim()
                    ? { opacity: 0.5 }
                    : undefined
                }
              >
                {createRoundMutation.isPending ? (
                  <ActivityIndicator color="#0A1A1A" />
                ) : (
                  <Text className="text-lg font-bold text-[#0A1A1A]">
                    Create Round
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
