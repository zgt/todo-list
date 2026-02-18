import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ListMusic } from "lucide-react-native";

import type { SubmissionItem } from "~/components/music/roundDetailTypes";
import { GradientBackground } from "~/components/GradientBackground";
import { CountdownTimer } from "~/components/music/CountdownTimer";
import { PhaseProgressBar } from "~/components/music/PhaseProgressBar";
import { ResultsPhaseView } from "~/components/music/ResultsPhaseView";
import { RoundAdminControls } from "~/components/music/RoundAdminControls";
import { RoundHeader } from "~/components/music/RoundHeader";
import { RoundThemeCard } from "~/components/music/RoundThemeCard";
import { SubmissionPhaseView } from "~/components/music/SubmissionPhaseView";
import { VotingPhaseView } from "~/components/music/VotingPhaseView";
import { trpc } from "~/utils/api";

export default function RoundDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: round,
    isLoading,
    refetch,
  } = useQuery(
    trpc.musicLeague.getRoundById.queryOptions(
      { roundId: id },
      { enabled: !!id },
    ),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

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
  const isVotingPhase = status === "VOTING";
  const isResultsPhase = status === "RESULTS" || status === "COMPLETED";
  const isAdmin = round.userRole === "OWNER" || round.userRole === "ADMIN";

  const activeDeadline = isSubmissionPhase
    ? round.submissionDeadline
    : isVotingPhase
      ? round.votingDeadline
      : null;
  const deadlineLabel = isSubmissionPhase
    ? "Submissions close"
    : isVotingPhase
      ? "Voting closes"
      : null;

  return (
    <GradientBackground>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        <RoundHeader
          roundNumber={round.roundNumber}
          status={status}
          onBack={() => router.back()}
        />

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#50C878"
            />
          }
        >
          <View className="mb-6 rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-4">
            <PhaseProgressBar currentPhase={status} />
          </View>

          {activeDeadline && deadlineLabel && (
            <View className="mb-4">
              <CountdownTimer deadline={activeDeadline} label={deadlineLabel} />
            </View>
          )}

          {isAdmin && (
            <RoundAdminControls
              status={status}
              currentPlaylistUrl={round.playlistUrl}
              roundId={id}
            />
          )}

          <RoundThemeCard
            themeName={round.themeName}
            themeDescription={round.themeDescription}
            submissionDeadline={round.submissionDeadline}
            votingDeadline={round.votingDeadline}
          />

          {!isSubmissionPhase && (
            <Pressable
              onPress={() =>
                router.push(`/music/round/${id}/playlist` as never)
              }
              className="mb-6 flex-row items-center justify-center gap-2 rounded-xl border py-3"
              style={({ pressed }) => ({
                borderColor: "rgba(29,185,84,0.3)",
                backgroundColor: pressed
                  ? "rgba(29,185,84,0.2)"
                  : "rgba(29,185,84,0.1)",
              })}
            >
              <ListMusic size={18} color="#1DB954" />
              <Text className="font-semibold text-[#1DB954]">
                View Playlist
              </Text>
            </Pressable>
          )}

          {isSubmissionPhase && (
            <SubmissionPhaseView
              submissions={submissions as SubmissionItem[]}
              submissionCount={round.submissionCount}
              memberCount={round.memberCount}
              songsPerRound={round.songsPerRound}
              roundId={id}
            />
          )}

          {isVotingPhase && (
            <VotingPhaseView
              submissions={submissions as SubmissionItem[]}
              upvotePointsPerRound={round.upvotePointsPerRound}
              roundId={id}
            />
          )}

          {isResultsPhase && (
            <ResultsPhaseView submissions={submissions as SubmissionItem[]} />
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}
