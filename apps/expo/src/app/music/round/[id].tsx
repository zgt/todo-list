import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Edit3,
  ExternalLink,
  Link as LinkIcon,
  ListMusic,
  Music,
  Send,
} from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import { CountdownTimer } from "~/components/music/CountdownTimer";
import { MemberStatusBoard } from "~/components/music/MemberStatusBoard";
import { PhaseProgressBar } from "~/components/music/PhaseProgressBar";
import { RemainingPointsBadge } from "~/components/music/RemainingPointsBadge";
import { ResultCard } from "~/components/music/ResultCard";
import { VoteCard } from "~/components/music/VoteCard";
import { trpc } from "~/utils/api";

const PHASE_LABELS: Record<string, string> = {
  SUBMISSION: "Listening",
  LISTENING: "Voting",
  VOTING: "Results",
  RESULTS: "Completed",
};

interface SubmissionItem {
  id: string;
  isOwn: boolean;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArtUrl: string | null;
  spotifyTrackId: string;
  submitter: { name: string | null; image: string | null } | null;
  totalPoints: number;
  votes: {
    voter: { name: string | null; image: string | null } | null;
    points: number;
  }[];
  comments: {
    user: { name: string | null } | null;
    text: string;
  }[];
}

export default function RoundDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [showPlaylistInput, setShowPlaylistInput] = useState(false);

  // Voting state
  const [voteAllocations, setVoteAllocations] = useState<
    Record<string, number>
  >({});
  const [voteComments, setVoteComments] = useState<Record<string, string>>({});
  const [hasSubmittedVotes, setHasSubmittedVotes] = useState(false);

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

  const submitVotesMutation = useMutation(
    trpc.musicLeague.submitVotes.mutationOptions({
      onSuccess: async () => {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        await queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryFilter(),
        );
        setHasSubmittedVotes(true);
        Alert.alert("Votes submitted!", "Your votes have been recorded.");
      },
      onError: (error) => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Failed to submit votes", error.message);
      },
    }),
  );

  const handlePointsChange = useCallback(
    (submissionId: string, points: number) => {
      setVoteAllocations((prev) => ({ ...prev, [submissionId]: points }));
    },
    [],
  );

  const handleCommentChange = useCallback(
    (submissionId: string, comment: string) => {
      setVoteComments((prev) => ({ ...prev, [submissionId]: comment }));
    },
    [],
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
  const isVotingPhase = status === "VOTING";
  const isResultsPhase = status === "RESULTS" || status === "COMPLETED";
  const isAdmin = round.userRole === "OWNER" || round.userRole === "ADMIN";
  const canAdvance = isAdmin && status !== "COMPLETED";

  const mySubmissions = submissions.filter((s: { isOwn: boolean }) => s.isOwn);
  const maxSongs = round.songsPerRound;
  const canSubmitMore = mySubmissions.length < maxSongs;

  // Voting calculations
  const votableSubmissions = submissions.filter(
    (s: { isOwn: boolean }) => !s.isOwn,
  );
  const totalBudget = round.upvotePointsPerRound;
  const usedPoints = Object.values(voteAllocations).reduce(
    (sum, pts) => sum + pts,
    0,
  );
  const remainingPoints = totalBudget - usedPoints;
  const showVotingUI = isVotingPhase && !hasSubmittedVotes;

  // Sort results by points descending
  const sortedSubmissions = isResultsPhase
    ? [...submissions].sort(
        (a: { totalPoints: number }, b: { totalPoints: number }) =>
          b.totalPoints - a.totalPoints,
      )
    : submissions;

  // Determine the active countdown deadline
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

  // Determine member status tracking action for current phase
  const memberTrackAction: "submitted" | "voted" = isVotingPhase
    ? "voted"
    : "submitted";

  const handleSubmitVotes = () => {
    const votes = Object.entries(voteAllocations)
      .filter(([, points]) => points > 0)
      .map(([submissionId, points]) => ({ submissionId, points }));

    const comments = Object.entries(voteComments)
      .filter(([, text]) => text.trim().length > 0)
      .map(([submissionId, text]) => ({ submissionId, text: text.trim() }));

    if (votes.length === 0) {
      Alert.alert(
        "No votes",
        "Please allocate at least some points before submitting.",
      );
      return;
    }

    submitVotesMutation.mutate({ roundId: id, votes, comments });
  };

  const handleEditVotes = () => {
    setHasSubmittedVotes(false);
    setVoteAllocations({});
    setVoteComments({});
  };

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

  const handleOpenSpotify = (spotifyTrackId: string) => {
    void Linking.openURL(`spotify:track:${spotifyTrackId}`).catch(() => {
      void Linking.openURL(`https://open.spotify.com/track/${spotifyTrackId}`);
    });
  };

  const renderSubmission = ({ item: sub }: { item: SubmissionItem }) => (
    <View
      className={`rounded-lg border p-3 ${
        sub.isOwn
          ? "border-[#50C878]/50 bg-[#50C878]/10"
          : "border-[#164B49] bg-[#102A2A]"
      }`}
    >
      <View className="flex-row items-center gap-3">
        {sub.albumArtUrl ? (
          <Image
            source={{ uri: sub.albumArtUrl }}
            style={{ width: 48, height: 48, borderRadius: 6 }}
          />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded bg-[#0A1A1A]">
            <Music size={20} color="#8FA8A8" />
          </View>
        )}

        <View className="flex-1">
          <Text className="font-semibold text-[#DCE4E4]" numberOfLines={1}>
            {sub.trackName}
          </Text>
          <Text className="text-xs text-[#8FA8A8]" numberOfLines={1}>
            {sub.artistName}
          </Text>
        </View>

        {sub.spotifyTrackId && (
          <Pressable
            onPress={() => handleOpenSpotify(sub.spotifyTrackId)}
            hitSlop={8}
            className="rounded-md bg-[#1DB954]/20 px-2 py-1"
          >
            <View className="flex-row items-center gap-1">
              <ExternalLink size={10} color="#1DB954" />
              <Text className="text-[10px] font-medium text-[#1DB954]">
                Spotify
              </Text>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );

  const renderResult = ({
    item: sub,
    index,
  }: {
    item: SubmissionItem;
    index: number;
  }) => (
    <ResultCard
      rank={index + 1}
      trackName={sub.trackName}
      artistName={sub.artistName}
      albumName={sub.albumName}
      albumArtUrl={sub.albumArtUrl}
      submitterName={sub.submitter?.name ?? null}
      totalPoints={sub.totalPoints}
      votes={sub.votes}
      comments={sub.comments}
    />
  );

  const renderVoteCard = ({ item: sub }: { item: SubmissionItem }) => (
    <VoteCard
      submissionId={sub.id}
      trackName={sub.trackName}
      artistName={sub.artistName}
      albumName={sub.albumName}
      albumArtUrl={sub.albumArtUrl}
      points={voteAllocations[sub.id] ?? 0}
      maxPoints={(voteAllocations[sub.id] ?? 0) + remainingPoints}
      comment={voteComments[sub.id] ?? ""}
      onPointsChange={handlePointsChange}
      onCommentChange={handleCommentChange}
    />
  );

  // Determine FlatList data and renderer based on phase
  let listData: SubmissionItem[];
  let listRenderItem: (props: {
    item: SubmissionItem;
    index: number;
  }) => React.JSX.Element;

  if (showVotingUI) {
    listData = votableSubmissions as SubmissionItem[];
    listRenderItem = renderVoteCard;
  } else if (isResultsPhase) {
    listData = sortedSubmissions as SubmissionItem[];
    listRenderItem = renderResult;
  } else {
    listData = submissions as SubmissionItem[];
    listRenderItem = renderSubmission;
  }

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
            <Text className="text-center text-xs font-medium text-[#50C878] uppercase">
              {status}
            </Text>
          </View>
          <View className="w-10" />
        </View>

        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={listRenderItem}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#50C878"
            />
          }
          ListHeaderComponent={
            <View>
              {/* Phase Progress Bar */}
              <View className="mb-6 rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-4">
                <PhaseProgressBar currentPhase={status} />
              </View>

              {/* Countdown Timer */}
              {activeDeadline && deadlineLabel && (
                <View className="mb-4">
                  <CountdownTimer
                    deadline={activeDeadline}
                    label={deadlineLabel}
                  />
                </View>
              )}

              {/* Member Status Board */}
              {round.memberStatus.length > 0 && !isResultsPhase && (
                <View className="mb-4">
                  <MemberStatusBoard
                    members={round.memberStatus}
                    trackAction={memberTrackAction}
                  />
                </View>
              )}

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
                <Text className="mb-2 text-sm font-bold tracking-wide text-[#50C878] uppercase">
                  Theme
                </Text>
                <Text className="mb-4 text-3xl leading-tight font-bold text-[#DCE4E4]">
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
                    <Text className="mb-1 text-xs font-medium text-[#8FA8A8] uppercase">
                      Submit By
                    </Text>
                    <Text className="text-sm font-semibold text-[#DCE4E4]">
                      {new Date(round.submissionDeadline).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="mb-1 text-xs font-medium text-[#8FA8A8] uppercase">
                      Vote By
                    </Text>
                    <Text className="text-sm font-semibold text-[#DCE4E4]">
                      {new Date(round.votingDeadline).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Playlist Link (non-submission phases) */}
              {!isSubmissionPhase && (
                <Pressable
                  onPress={() =>
                    router.push(`/music/round/${id}/playlist` as never)
                  }
                  className="mb-6 flex-row items-center justify-center gap-2 rounded-xl border border-[#1DB954]/30 bg-[#1DB954]/10 py-3 active:bg-[#1DB954]/20"
                >
                  <ListMusic size={18} color="#1DB954" />
                  <Text className="font-semibold text-[#1DB954]">
                    View Playlist
                  </Text>
                </Pressable>
              )}

              {/* Submission Phase Actions */}
              {isSubmissionPhase && (
                <View className="mb-6 gap-3">
                  {/* Submission Progress */}
                  <View className="flex-row items-center justify-between rounded-lg border border-[#164B49] bg-[#102A2A] px-4 py-3">
                    <Text className="text-sm font-medium text-[#8FA8A8]">
                      Submission progress
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-bold text-[#DCE4E4]">
                        {round.submissionCount}/{round.memberCount} songs
                      </Text>
                      <View className="h-2 w-16 overflow-hidden rounded-full bg-[#164B49]">
                        <View
                          className="h-full rounded-full bg-[#50C878]"
                          style={{
                            width: `${Math.min(100, (round.submissionCount / Math.max(1, round.memberCount)) * 100)}%`,
                          }}
                        />
                      </View>
                    </View>
                  </View>

                  {/* My Submissions */}
                  {mySubmissions.length > 0 && (
                    <View className="gap-2">
                      <View className="flex-row items-center gap-2">
                        <Check size={14} color="#50C878" />
                        <Text className="text-sm font-semibold text-[#50C878]">
                          Your submissions ({mySubmissions.length}/{maxSongs})
                        </Text>
                      </View>
                      {mySubmissions.map((sub: SubmissionItem) => (
                        <View
                          key={sub.id}
                          className="flex-row items-center gap-3 rounded-lg border border-[#50C878]/30 bg-[#50C878]/5 p-3"
                        >
                          {sub.albumArtUrl ? (
                            <Image
                              source={{ uri: sub.albumArtUrl }}
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 6,
                              }}
                            />
                          ) : (
                            <View className="h-10 w-10 items-center justify-center rounded bg-[#0A1A1A]">
                              <Music size={16} color="#8FA8A8" />
                            </View>
                          )}
                          <View className="flex-1">
                            <Text
                              className="font-medium text-[#DCE4E4]"
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
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Submit a Song Button */}
                  {canSubmitMore && (
                    <Pressable
                      onPress={() =>
                        router.push(`/music/round/${id}/submit` as never)
                      }
                      className="flex-row items-center justify-center gap-2 rounded-lg bg-[#50C878] py-4 active:bg-[#66D99A]"
                    >
                      <Music size={20} color="#0A1A1A" />
                      <Text className="text-base font-bold text-[#0A1A1A]">
                        Submit a Song
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}

              {/* Voting Phase - Active Voting UI */}
              {showVotingUI && (
                <View className="mb-4 gap-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xl font-bold text-[#DCE4E4]">
                      Cast Your Votes
                    </Text>
                    <RemainingPointsBadge
                      remaining={remainingPoints}
                      total={totalBudget}
                    />
                  </View>
                  <Text className="text-sm text-[#8FA8A8]">
                    Distribute {totalBudget} points across submissions. Tap + to
                    add points.
                  </Text>

                  {votableSubmissions.length === 0 && (
                    <Text className="py-8 text-center text-[#8FA8A8] italic">
                      No other submissions to vote on yet.
                    </Text>
                  )}
                </View>
              )}

              {/* Voting Phase - Already Submitted */}
              {isVotingPhase && hasSubmittedVotes && (
                <View className="mb-4 gap-3">
                  <View className="items-center gap-2 rounded-xl border border-[#50C878]/30 bg-[#50C878]/10 p-4">
                    <Check size={24} color="#50C878" />
                    <Text className="text-base font-semibold text-[#50C878]">
                      Votes Submitted
                    </Text>
                    <Text className="text-center text-sm text-[#8FA8A8]">
                      Your votes have been recorded. You can edit them before
                      voting closes.
                    </Text>
                    <Pressable
                      onPress={handleEditVotes}
                      className="mt-2 flex-row items-center gap-2 rounded-lg border border-[#50C878]/30 px-4 py-2 active:bg-[#50C878]/10"
                    >
                      <Edit3 size={14} color="#50C878" />
                      <Text className="text-sm font-semibold text-[#50C878]">
                        Edit Votes
                      </Text>
                    </Pressable>
                  </View>

                  <Text className="text-xl font-bold text-[#DCE4E4]">
                    Submissions ({submissions.length})
                  </Text>
                </View>
              )}

              {/* Non-voting section headers */}
              {!isVotingPhase && (
                <>
                  <Text className="mb-4 text-xl font-bold text-[#DCE4E4]">
                    {isResultsPhase ? "Results" : "Submissions"} (
                    {submissions.length})
                  </Text>

                  {submissions.length === 0 && (
                    <Text className="py-8 text-center text-[#8FA8A8] italic">
                      No submissions yet. Be the first!
                    </Text>
                  )}
                </>
              )}
            </View>
          }
          ListFooterComponent={
            showVotingUI && votableSubmissions.length > 0 ? (
              <View className="mt-4 gap-3 pb-4">
                <View className="flex-row items-center justify-center">
                  <RemainingPointsBadge
                    remaining={remainingPoints}
                    total={totalBudget}
                  />
                </View>

                <Pressable
                  onPress={handleSubmitVotes}
                  disabled={submitVotesMutation.isPending || usedPoints === 0}
                  className="flex-row items-center justify-center gap-2 rounded-xl bg-[#50C878] py-4 active:bg-[#66D99A]"
                  style={
                    submitVotesMutation.isPending || usedPoints === 0
                      ? { opacity: 0.5 }
                      : undefined
                  }
                >
                  {submitVotesMutation.isPending ? (
                    <ActivityIndicator color="#0A1A1A" size="small" />
                  ) : (
                    <>
                      <Send size={18} color="#0A1A1A" />
                      <Text className="text-base font-bold text-[#0A1A1A]">
                        Submit Votes ({usedPoints}/{totalBudget} pts)
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : undefined
          }
        />
      </SafeAreaView>
    </GradientBackground>
  );
}
