import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Sparkles } from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import type { ThemeTemplatePickerRef } from "~/components/music/ThemeTemplatePicker";
import { ThemeTemplatePicker } from "~/components/music/ThemeTemplatePicker";
import { trpc } from "~/utils/api";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  result.setHours(20, 0, 0, 0); // default to 8 PM
  return result;
}

export default function CreateRound() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const themePickerRef = useRef<ThemeTemplatePickerRef>(null);

  const [themeName, setThemeName] = useState("");
  const [themeDescription, setThemeDescription] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState(
    addDays(new Date(), 3),
  );
  const [votingDeadline, setVotingDeadline] = useState(
    addDays(new Date(), 5),
  );

  // Android picker visibility state
  const [showSubmissionPicker, setShowSubmissionPicker] = useState(false);
  const [showVotingPicker, setShowVotingPicker] = useState(false);

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
    if (submissionDeadline <= new Date()) {
      Alert.alert(
        "Invalid deadline",
        "Submission deadline must be in the future.",
      );
      return;
    }
    if (votingDeadline <= submissionDeadline) {
      Alert.alert(
        "Invalid deadline",
        "Voting deadline must be after submission deadline.",
      );
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

  const onSubmissionDateChange = (_: unknown, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowSubmissionPicker(false);
    if (selectedDate) {
      setSubmissionDeadline(selectedDate);
      // Auto-adjust voting deadline if it's before the new submission deadline
      if (votingDeadline <= selectedDate) {
        setVotingDeadline(addDays(selectedDate, 2));
      }
    }
  };

  const onVotingDateChange = (_: unknown, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowVotingPicker(false);
    if (selectedDate) {
      if (selectedDate <= submissionDeadline) {
        Alert.alert(
          "Invalid date",
          "Voting deadline must be after submission deadline.",
        );
        return;
      }
      setVotingDeadline(selectedDate);
    }
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
          <Text className="text-xl font-bold text-[#DCE4E4]">
            Create Round
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4 pb-8"
          keyboardShouldPersistTaps="handled"
        >
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

          {/* Deadlines Section */}
          <Text className="mb-3 text-lg font-bold text-[#DCE4E4]">
            Deadlines
          </Text>

          {/* Submission Deadline */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
              Submission Deadline
            </Text>
            {Platform.OS === "android" ? (
              <Pressable
                onPress={() => setShowSubmissionPicker(true)}
                className="flex-row items-center gap-3 rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-3"
              >
                <Calendar size={18} color="#50C878" />
                <Text className="flex-1 text-base text-[#DCE4E4]">
                  {formatDate(submissionDeadline)}
                </Text>
              </Pressable>
            ) : (
              <View className="rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-2">
                <DateTimePicker
                  value={submissionDeadline}
                  mode="datetime"
                  display="compact"
                  minimumDate={new Date()}
                  onChange={onSubmissionDateChange}
                  themeVariant="dark"
                />
              </View>
            )}
            {showSubmissionPicker && Platform.OS === "android" && (
              <DateTimePicker
                value={submissionDeadline}
                mode="datetime"
                minimumDate={new Date()}
                onChange={onSubmissionDateChange}
              />
            )}
          </View>

          {/* Voting Deadline */}
          <View className="mb-8">
            <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
              Voting Deadline
            </Text>
            {Platform.OS === "android" ? (
              <Pressable
                onPress={() => setShowVotingPicker(true)}
                className="flex-row items-center gap-3 rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-3"
              >
                <Calendar size={18} color="#50C878" />
                <Text className="flex-1 text-base text-[#DCE4E4]">
                  {formatDate(votingDeadline)}
                </Text>
              </Pressable>
            ) : (
              <View className="rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-2">
                <DateTimePicker
                  value={votingDeadline}
                  mode="datetime"
                  display="compact"
                  minimumDate={submissionDeadline}
                  onChange={onVotingDateChange}
                  themeVariant="dark"
                />
              </View>
            )}
            {showVotingPicker && Platform.OS === "android" && (
              <DateTimePicker
                value={votingDeadline}
                mode="datetime"
                minimumDate={submissionDeadline}
                onChange={onVotingDateChange}
              />
            )}
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
        </ScrollView>

        {/* Theme Template Picker */}
        <ThemeTemplatePicker
          ref={themePickerRef}
          onSelectTheme={setThemeName}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}
