import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  Link as LinkIcon,
} from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import { PhaseProgressBar } from "~/components/music/PhaseProgressBar";
import { trpc } from "~/utils/api";

const PHASE_LABELS: Record<string, string> = {
  SUBMISSION: "Listening",
  LISTENING: "Voting",
  VOTING: "Results",
  RESULTS: "Completed",
};

export default function RoundDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [showPlaylistInput, setShowPlaylistInput] = useState(false);

  const { data: round, isLoading } = useQuery(
    trpc.musicLeague.getRoundById.queryOptions(
      { roundId: id },
      { enabled: !!id },
    ),
  );

  const advancePhaseMutation = useMutation(
    trpc.musicLeague.advanceRoundPhase.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.musicLeague.getLeagueById.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.musicLeague.getAllLeagues.queryFilter(),
        );
      },
      onError: (error) => {
        Alert.alert("Failed to advance phase", error.message);
      },
    }),
  );

  const setPlaylistUrlMutation = useMutation(
    trpc.musicLeague.setRoundPlaylistUrl.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryFilter(),
        );
        setShowPlaylistInput(false);
        setPlaylistUrl("");
        Alert.alert("Saved", "Playlist URL has been set.");
      },
      onError: (error) => {
        Alert.alert("Failed to set playlist URL", error.message);
      },
    }),
  );

  if (isLoading || !round) {
    return (
      <GradientBackground>
        <SafeAreaView className="flex-1 items-center justify-center">
          <Stack.Screen options={{ headerShown: false }} />
          <ActivityIndicator size="large" color="#50C878" />
          <Text className="mt-3 text-[#8FA8A8]">Loading round...</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const { status, submissions } = round;
  const isSubmissionPhase = status === "SUBMISSION";
  const isResultsPhase = status === "RESULTS" || status === "COMPLETED";
  const isAdmin = round.userRole === "OWNER" || round.userRole === "ADMIN";
  const canAdvance = isAdmin && status !== "COMPLETED";

  const mySubmission = submissions.find((s: { isOwn: boolean }) => s.isOwn);

  const handleAdvancePhase = () => {
    const nextPhase = PHASE_LABELS[status] ?? "next phase";
    Alert.alert(
      "Advance Phase",
      `Are you sure you want to advance this round to "${nextPhase}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Advance",
          onPress: () => advancePhaseMutation.mutate({ roundId: id }),
        },
      ],
    );
  };

  const handleSetPlaylistUrl = () => {
    const url = playlistUrl.trim();
    if (!url) {
      Alert.alert("URL required", "Please enter a playlist URL.");
      return;
    }
    setPlaylistUrlMutation.mutate({ roundId: id, playlistUrl: url });
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
          <View>
            <Text className="text-center text-xl font-bold text-[#DCE4E4]">
              Round {round.roundNumber}
            </Text>
            <Text className="text-center text-xs font-medium uppercase text-[#50C878]">
              {status}
            </Text>
          </View>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Phase Progress Bar */}
          <View className="mb-6 rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-4">
            <PhaseProgressBar currentPhase={status} />
          </View>

          {/* Admin Controls */}
          {isAdmin && (
            <View className="mb-6 gap-3">
              {/* Advance Phase */}
              {canAdvance && (
                <Pressable
                  onPress={handleAdvancePhase}
                  disabled={advancePhaseMutation.isPending}
                  className="flex-row items-center justify-center gap-2 rounded-xl border border-[#50C878]/30 bg-[#50C878]/10 py-3 active:bg-[#50C878]/20"
                  style={
                    advancePhaseMutation.isPending
                      ? { opacity: 0.5 }
                      : undefined
                  }
                >
                  {advancePhaseMutation.isPending ? (
                    <ActivityIndicator color="#50C878" size="small" />
                  ) : (
                    <>
                      <ChevronRight size={18} color="#50C878" />
                      <Text className="font-semibold text-[#50C878]">
                        Advance to {PHASE_LABELS[status] ?? "Next"}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}

              {/* Set Playlist URL */}
              {!showPlaylistInput ? (
                <Pressable
                  onPress={() => setShowPlaylistInput(true)}
                  className="flex-row items-center justify-center gap-2 rounded-xl border border-[#164B49] bg-[#102A2A] py-3 active:bg-[#164B49]"
                >
                  <LinkIcon size={16} color="#8FA8A8" />
                  <Text className="font-medium text-[#8FA8A8]">
                    {round.playlistUrl
                      ? "Update Playlist URL"
                      : "Set Playlist URL"}
                  </Text>
                </Pressable>
              ) : (
                <View className="gap-2 rounded-xl border border-[#164B49] bg-[#102A2A] p-3">
                  <TextInput
                    value={playlistUrl}
                    onChangeText={setPlaylistUrl}
                    placeholder="https://open.spotify.com/playlist/..."
                    placeholderTextColor="#8FA8A8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    className="rounded-lg border border-[#164B49] bg-[#0A1A1A] px-3 py-2.5 text-sm text-[#DCE4E4]"
                  />
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => {
                        setShowPlaylistInput(false);
                        setPlaylistUrl("");
                      }}
                      className="flex-1 items-center rounded-lg border border-[#164B49] py-2.5 active:bg-[#164B49]"
                    >
                      <Text className="text-sm font-medium text-[#8FA8A8]">
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSetPlaylistUrl}
                      disabled={
                        setPlaylistUrlMutation.isPending ||
                        !playlistUrl.trim()
                      }
                      className="flex-1 items-center rounded-lg bg-[#50C878] py-2.5 active:bg-[#66D99A]"
                      style={
                        setPlaylistUrlMutation.isPending ||
                        !playlistUrl.trim()
                          ? { opacity: 0.5 }
                          : undefined
                      }
                    >
                      {setPlaylistUrlMutation.isPending ? (
                        <ActivityIndicator color="#0A1A1A" size="small" />
                      ) : (
                        <Text className="text-sm font-bold text-[#0A1A1A]">
                          Save
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Show current playlist URL if set */}
              {round.playlistUrl && !showPlaylistInput && (
                <View className="rounded-lg border border-[#164B49]/50 bg-[#0A1A1A]/50 px-3 py-2">
                  <Text className="text-xs text-[#8FA8A8]">
                    Current playlist:
                  </Text>
                  <Text
                    className="text-xs text-[#50C878]"
                    numberOfLines={1}
                  >
                    {round.playlistUrl}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Theme Card */}
          <View className="mb-6 rounded-xl border border-[#164B49] bg-[#102A2A] p-6 shadow-lg">
            <Text className="mb-2 text-sm font-bold uppercase tracking-wide text-[#50C878]">
              Theme
            </Text>
            <Text className="mb-4 text-3xl font-bold leading-tight text-[#DCE4E4]">
              {round.themeName}
            </Text>
            {round.themeDescription && (
              <Text className="text-base leading-relaxed text-[#8FA8A8]">
                {round.themeDescription}
              </Text>
            )}

            {/* Deadlines */}
            <View className="mt-6 flex-row gap-4 border-t border-[#164B49] pt-4">
              <View className="flex-1">
                <View className="mb-1 flex-row items-center gap-1">
                  <Clock size={12} color="#8FA8A8" />
                  <Text className="text-xs font-medium uppercase text-[#8FA8A8]">
                    Submit By
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-[#DCE4E4]">
                  {new Date(round.submissionDeadline).toLocaleDateString()}
                </Text>
              </View>
              <View className="flex-1">
                <View className="mb-1 flex-row items-center gap-1">
                  <Clock size={12} color="#8FA8A8" />
                  <Text className="text-xs font-medium uppercase text-[#8FA8A8]">
                    Vote By
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-[#DCE4E4]">
                  {new Date(round.votingDeadline).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          {/* User Actions */}
          {isSubmissionPhase && (
            <View className="mb-8">
              {mySubmission ? (
                <View className="rounded-lg border border-[#50C878]/30 bg-[#164B49]/30 p-4">
                  <View className="mb-2 flex-row items-center gap-2">
                    <Check size={16} color="#50C878" />
                    <Text className="font-semibold text-[#50C878]">
                      You've submitted!
                    </Text>
                  </View>
                  <Text className="text-lg font-medium text-[#DCE4E4]">
                    {mySubmission.trackName}
                  </Text>
                  <Text className="text-sm text-[#8FA8A8]">
                    {mySubmission.artistName}
                  </Text>
                </View>
              ) : (
                <View className="items-center rounded-lg bg-[#50C878] p-4">
                  <Text className="text-lg font-bold text-[#0A1A1A]">
                    Submit a Song
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Submissions List */}
          <Text className="mb-4 text-xl font-bold text-[#DCE4E4]">
            {isResultsPhase ? "Results" : "Submissions"} ({submissions.length})
          </Text>

          {submissions.length === 0 ? (
            <Text className="py-8 text-center italic text-[#8FA8A8]">
              No submissions yet. Be the first!
            </Text>
          ) : (
            <View className="gap-3 pb-8">
              {submissions.map(
                (
                  sub: {
                    id: string;
                    isOwn: boolean;
                    trackName: string;
                    artistName: string;
                    submitter: { name: string | null } | null;
                    totalPoints: number;
                  },
                  index: number,
                ) => (
                  <View
                    key={sub.id}
                    className={`rounded-lg border p-3 ${
                      sub.isOwn
                        ? "border-[#50C878]/50 bg-[#50C878]/10"
                        : "border-[#164B49] bg-[#102A2A]"
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      {isResultsPhase && (
                        <View className="h-8 w-8 items-center justify-center rounded-full bg-[#0A1A1A]">
                          <Text className="font-bold text-[#DCE4E4]">
                            #{index + 1}
                          </Text>
                        </View>
                      )}

                      <View className="h-12 w-12 rounded bg-[#0A1A1A]" />

                      <View className="flex-1">
                        <Text
                          className="font-semibold text-[#DCE4E4]"
                          numberOfLines={1}
                        >
                          {sub.trackName}
                        </Text>
                        <Text
                          className="text-xs text-[#8FA8A8]"
                          numberOfLines={1}
                        >
                          {sub.artistName}
                        </Text>
                        {isResultsPhase && sub.submitter && (
                          <Text className="mt-1 text-xs text-[#50C878]">
                            Submitted by {sub.submitter.name}
                          </Text>
                        )}
                      </View>

                      {isResultsPhase && (
                        <View className="items-end">
                          <Text className="text-lg font-bold text-[#50C878]">
                            {sub.totalPoints}
                          </Text>
                          <Text className="text-xs text-[#8FA8A8]">pts</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ),
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}
