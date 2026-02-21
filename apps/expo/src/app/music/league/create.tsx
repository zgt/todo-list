import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import { trpc } from "~/utils/api";

function NumberStepper({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-3">
      <Text className="text-base font-medium text-[#DCE4E4]">{label}</Text>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-9 w-9 items-center justify-center rounded-lg bg-[#164B49] active:bg-[#21716C]"
          style={value <= min ? { opacity: 0.4 } : undefined}
        >
          <ChevronDown size={20} color="#DCE4E4" />
        </Pressable>
        <Text className="w-8 text-center text-lg font-bold text-[#50C878]">
          {value}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="h-9 w-9 items-center justify-center rounded-lg bg-[#164B49] active:bg-[#21716C]"
          style={value >= max ? { opacity: 0.4 } : undefined}
        >
          <ChevronUp size={20} color="#DCE4E4" />
        </Pressable>
      </View>
    </View>
  );
}

const SUBMISSION_WINDOW_PRESETS = [
  { label: "1 day", days: 1 },
  { label: "2 days", days: 2 },
  { label: "3 days", days: 3 },
  { label: "5 days", days: 5 },
  { label: "1 week", days: 7 },
];

const VOTING_WINDOW_PRESETS = [
  { label: "1 day", days: 1 },
  { label: "2 days", days: 2 },
  { label: "3 days", days: 3 },
  { label: "5 days", days: 5 },
];

export default function CreateLeague() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [songsPerRound, setSongsPerRound] = useState(1);
  const [upvotePoints, setUpvotePoints] = useState(5);
  const [allowDownvotes, setAllowDownvotes] = useState(false);
  const [downvotePoints, setDownvotePoints] = useState(3);
  const [submissionWindowDays, setSubmissionWindowDays] = useState(3);
  const [votingWindowDays, setVotingWindowDays] = useState(2);

  const createMutation = useMutation(
    trpc.musicLeague.createLeague.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getAllLeagues.queryFilter(),
        );
        router.replace(`/music/league/${data.id}` as never);
      },
      onError: (error) => {
        Alert.alert("Failed to create league", error.message);
      },
    }),
  );

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter a league name.");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      songsPerRound,
      upvotePointsPerRound: upvotePoints,
      allowDownvotes,
      submissionWindowDays,
      votingWindowDays,
      downvotePointsPerRound: downvotePoints,
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
          <Text className="text-xl font-bold text-[#DCE4E4]">
            Create League
          </Text>
          <View className="w-10" />
        </View>

        <FlatList
          data={[{ key: "form" }]}
          renderItem={() => null}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 64 }}
          ListHeaderComponent={
            <View>
              {/* Name */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
                  League Name *
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Friday Vibes"
                  placeholderTextColor="#8FA8A8"
                  maxLength={100}
                  className="rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-3 text-base text-[#DCE4E4]"
                />
              </View>

              {/* Description */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What's this league about?"
                  placeholderTextColor="#8FA8A8"
                  maxLength={500}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="min-h-[80px] rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-3 text-base text-[#DCE4E4]"
                />
              </View>

              {/* Round Windows */}
              <Text className="mb-3 text-lg font-bold text-[#DCE4E4]">
                Round Windows
              </Text>

              {/* Submission Window Presets */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
                  Submission window
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {SUBMISSION_WINDOW_PRESETS.map((preset) => (
                    <Pressable
                      key={preset.days}
                      onPress={() => setSubmissionWindowDays(preset.days)}
                      className={`rounded-full px-4 py-2 ${
                        submissionWindowDays === preset.days
                          ? "border border-[#50C878] bg-[#50C878]/20"
                          : "border border-[#164B49] bg-[#102A2A]"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          submissionWindowDays === preset.days
                            ? "text-[#50C878]"
                            : "text-[#8FA8A8]"
                        }`}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Voting Window Presets */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
                  Voting window (after submissions close)
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {VOTING_WINDOW_PRESETS.map((preset) => (
                    <Pressable
                      key={preset.days}
                      onPress={() => setVotingWindowDays(preset.days)}
                      className={`rounded-full px-4 py-2 ${
                        votingWindowDays === preset.days
                          ? "border border-[#50C878] bg-[#50C878]/20"
                          : "border border-[#164B49] bg-[#102A2A]"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          votingWindowDays === preset.days
                            ? "text-[#50C878]"
                            : "text-[#8FA8A8]"
                        }`}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Settings */}
              <Text className="mb-3 text-lg font-bold text-[#DCE4E4]">
                Settings
              </Text>

              <View className="mb-4 gap-3">
                <NumberStepper
                  label="Songs per round"
                  value={songsPerRound}
                  onChange={setSongsPerRound}
                  min={1}
                  max={5}
                />

                <NumberStepper
                  label="Upvote points per round"
                  value={upvotePoints}
                  onChange={setUpvotePoints}
                  min={1}
                  max={20}
                />

                {/* Allow Downvotes Toggle */}
                <View className="flex-row items-center justify-between rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-3">
                  <View className="flex-1">
                    <Text className="text-base font-medium text-[#DCE4E4]">
                      Allow downvotes
                    </Text>
                    <Text className="mt-0.5 text-xs text-[#8FA8A8]">
                      Members can spend points to downvote songs
                    </Text>
                  </View>
                  <Switch
                    value={allowDownvotes}
                    onValueChange={setAllowDownvotes}
                    trackColor={{ false: "#164B49", true: "#50C878" }}
                    thumbColor={allowDownvotes ? "#0A1A1A" : "#8FA8A8"}
                  />
                </View>

                {/* Downvote Points (only when downvotes enabled) */}
                {allowDownvotes && (
                  <NumberStepper
                    label="Downvote points per round"
                    value={downvotePoints}
                    onChange={setDownvotePoints}
                    min={1}
                    max={10}
                  />
                )}
              </View>

              {/* Create Button */}
              <Pressable
                onPress={handleCreate}
                disabled={createMutation.isPending || !name.trim()}
                style={{
                  alignItems: "center",
                  borderRadius: 12,
                  backgroundColor: "#50C878",
                  paddingVertical: 16,
                  marginTop: 16,
                  opacity: createMutation.isPending || !name.trim() ? 0.5 : 1,
                }}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#0A1A1A" />
                ) : (
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: "#0A1A1A",
                    }}
                  >
                    Create League
                  </Text>
                )}
              </Pressable>
            </View>
          }
        />
      </SafeAreaView>
    </GradientBackground>
  );
}
