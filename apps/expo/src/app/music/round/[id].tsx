import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock,
  Link,
  ListMusic,
  MessageCircle,
  Minus,
  Music,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  Vote,
} from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import { trpc } from "~/utils/api";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "rgba(138, 138, 138, 0.15)", text: "#6B7280" },
  SUBMISSION: { bg: "rgba(80, 200, 120, 0.2)", text: "#50C878" },
  LISTENING: { bg: "rgba(100, 149, 237, 0.2)", text: "#6495ED" },
  VOTING: { bg: "rgba(255, 165, 0, 0.2)", text: "#FFA500" },
  RESULTS: { bg: "rgba(147, 112, 219, 0.2)", text: "#9370DB" },
  COMPLETED: { bg: "rgba(138, 138, 138, 0.2)", text: "#8A8A8A" },
};

const PHASE_STEPS = ["SUBMISSION", "LISTENING", "VOTING", "RESULTS"] as const;
const PHASE_LABELS: Record<string, string> = {
  SUBMISSION: "Submit",
  LISTENING: "Listen",
  VOTING: "Vote",
  RESULTS: "Results",
};

function getActiveStepIndex(status: string): number {
  const idx = PHASE_STEPS.indexOf(status as (typeof PHASE_STEPS)[number]);
  return idx === -1 ? PHASE_STEPS.length : idx; // COMPLETED → past all steps
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Ended";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RoundDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [rippleTrigger, setRippleTrigger] = useState(0);
  const rippleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRipple = useCallback(() => {
    if (rippleDebounceRef.current) return;
    setRippleTrigger((prev) => prev + 1);
    rippleDebounceRef.current = setTimeout(() => {
      rippleDebounceRef.current = null;
    }, 500);
  }, []);

  const {
    data: round,
    isLoading,
    error,
    refetch,
  } = useQuery(
    trpc.musicLeague.getRoundById.queryOptions(
      { roundId: id },
      { enabled: !!id },
    ),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerRipple();
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch, triggerRipple]);

  // Loading state
  if (isLoading) {
    return (
      <GradientBackground>
        <SafeAreaView
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Stack.Screen options={{ headerShown: false }} />
          <ActivityIndicator size="large" color="#50C878" />
          <Text style={{ marginTop: 12, fontSize: 14, color: "#8FA8A8" }}>
            Loading round...
          </Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Error / not found state
  if (error || !round) {
    return (
      <GradientBackground>
        <SafeAreaView
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Stack.Screen options={{ headerShown: false }} />
          <Text style={{ marginBottom: 16, fontSize: 18, color: "#8FA8A8" }}>
            Round not found
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              backgroundColor: "#102A2A",
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#164B49",
            }}
          >
            <Text style={{ fontWeight: "500", color: "#50C878" }}>Go Back</Text>
          </Pressable>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const statusColor = STATUS_COLORS[round.status] ?? {
    bg: "rgba(138, 138, 138, 0.2)",
    text: "#8A8A8A",
  };

  return (
    <GradientBackground rippleTrigger={rippleTrigger}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        <FlatList
          data={[{ key: "content" }]}
          renderItem={() => null}
          keyExtractor={(item) => item.key}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#50C878"
            />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
          ListHeaderComponent={
            <View style={{ padding: 16 }}>
              {/* Header: Back button + Round number + Status badge */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 24,
                }}
              >
                <Pressable
                  onPress={() => router.back()}
                  style={{
                    borderRadius: 9999,
                    backgroundColor: "#164B49",
                    padding: 8,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ArrowLeft size={24} color="#DCE4E4" />
                </Pressable>

                <Text
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    fontSize: 18,
                    fontWeight: "600",
                    color: "#DCE4E4",
                  }}
                >
                  Round {round.roundNumber}
                </Text>

                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 9999,
                    backgroundColor: statusColor.bg,
                  }}
                >
                  <Text
                    style={{
                      color: statusColor.text,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {round.status}
                  </Text>
                </View>
              </View>

              {/* Theme Card */}
              <ThemeCard
                themeName={round.themeName}
                themeDescription={round.themeDescription}
                submissionDeadline={round.submissionDeadline}
                votingDeadline={round.votingDeadline}
              />

              {/* PENDING Banner */}
              {round.status === "PENDING" && (
                <View
                  style={{
                    backgroundColor: "rgba(107, 114, 128, 0.1)",
                    borderWidth: 1,
                    borderColor: "rgba(107, 114, 128, 0.3)",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    marginBottom: 16,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Clock size={18} color="#6B7280" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#8FA8A8",
                      }}
                    >
                      Waiting for previous round to finish
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        marginTop: 2,
                      }}
                    >
                      This round will start automatically when the current round
                      completes
                    </Text>
                  </View>
                </View>
              )}

              {/* Phase Progress Bar */}
              {round.status !== "PENDING" && (
                <PhaseProgressBar status={round.status} />
              )}

              {/* Countdown Timer */}
              <CountdownTimer
                status={round.status}
                submissionDeadline={round.submissionDeadline}
                votingDeadline={round.votingDeadline}
              />

              {/* Submission Phase Section */}
              {round.status === "SUBMISSION" && (
                <SubmissionPhaseSection
                  roundId={id}
                  submissions={round.submissions.filter((s) => s.isOwn)}
                  submissionCount={round.submissionCount}
                  memberCount={round.memberCount}
                  songsPerRound={round.songsPerRound}
                />
              )}

              {/* View Playlist Button (non-submission phases) */}
              {["LISTENING", "VOTING", "RESULTS", "COMPLETED"].includes(
                round.status,
              ) && (
                <ViewPlaylistButton
                  roundId={id}
                  trackCount={round.submissions.length}
                  showTrackCount={round.status === "LISTENING"}
                />
              )}

              {/* Voting Phase Section */}
              {round.status === "VOTING" && (
                <VotingPhaseSection
                  roundId={id}
                  submissions={round.submissions.filter((s) => !s.isOwn)}
                  upvotePointsPerRound={round.upvotePointsPerRound}
                />
              )}

              {/* Results Phase Section */}
              {(round.status === "RESULTS" || round.status === "COMPLETED") && (
                <ResultsPhaseSection submissions={round.submissions} />
              )}

              {/* Admin Controls */}
              {(round.userRole === "OWNER" || round.userRole === "ADMIN") && (
                <AdminControls
                  roundId={id}
                  status={round.status}
                  playlistUrl={round.playlistUrl}
                />
              )}

              {/* Member Status Board */}
              {(round.status === "SUBMISSION" || round.status === "VOTING") && (
                <MemberStatusBoard
                  status={round.status}
                  memberStatus={round.memberStatus}
                />
              )}
            </View>
          }
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

/* ─── Phase Progress Bar ─── */

function PhaseProgressBar({ status }: { status: string }) {
  const activeIdx = getActiveStepIndex(status);

  return (
    <View
      style={{
        backgroundColor: "#102A2A",
        borderWidth: 1,
        borderColor: "#164B49",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {PHASE_STEPS.map((step, i) => {
          const isPast = i < activeIdx;
          const isActive = i === activeIdx;

          const circleBg = isActive
            ? "#50C878"
            : isPast
              ? "rgba(80,200,120,0.2)"
              : "#1A3A3A";
          const circleText = isActive
            ? "#FFFFFF"
            : isPast
              ? "#50C878"
              : "#8FA8A8";
          const labelColor = isActive
            ? "#50C878"
            : isPast
              ? "#50C878"
              : "#8FA8A8";

          return (
            <View key={step} style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                {/* Connecting line before (except first step) */}
                {i > 0 && (
                  <View
                    style={{
                      flex: 1,
                      height: 2,
                      backgroundColor:
                        isPast || isActive ? "#50C878" : "#1A3A3A",
                    }}
                  />
                )}

                {/* Numbered circle */}
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: circleBg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: circleText,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    {i + 1}
                  </Text>
                </View>

                {/* Connecting line after (except last step) */}
                {i < PHASE_STEPS.length - 1 && (
                  <View
                    style={{
                      flex: 1,
                      height: 2,
                      backgroundColor: isPast ? "#50C878" : "#1A3A3A",
                    }}
                  />
                )}
              </View>

              {/* Label */}
              <Text
                style={{
                  color: labelColor,
                  fontSize: 11,
                  fontWeight: "600",
                  marginTop: 6,
                }}
              >
                {PHASE_LABELS[step]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ─── Countdown Timer ─── */

function CountdownTimer({
  status,
  submissionDeadline,
  votingDeadline,
}: {
  status: string;
  submissionDeadline: Date | string | null;
  votingDeadline: Date | string | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  const showTimer = status === "SUBMISSION" || status === "VOTING";
  const deadline =
    status === "SUBMISSION" ? submissionDeadline : votingDeadline;

  useEffect(() => {
    if (!showTimer || !deadline) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [showTimer, deadline]);

  if (!showTimer || !deadline) return null;

  const deadlineMs =
    typeof deadline === "string"
      ? new Date(deadline).getTime()
      : deadline.getTime();
  const remaining = deadlineMs - now;
  const label =
    status === "SUBMISSION" ? "Submissions close in" : "Voting closes in";

  return (
    <View
      style={{
        backgroundColor: "#102A2A",
        borderWidth: 1,
        borderColor: "#164B49",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Clock size={16} color="#8FA8A8" />
      <Text style={{ fontSize: 13, marginLeft: 8, color: "#8FA8A8" }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          fontVariant: ["tabular-nums"],
          marginLeft: "auto",
          color: "#DCE4E4",
        }}
      >
        {formatCountdown(remaining)}
      </Text>
    </View>
  );
}

/* ─── Theme Card ─── */

function ThemeCard({
  themeName,
  themeDescription,
  submissionDeadline,
  votingDeadline,
}: {
  themeName: string;
  themeDescription: string | null;
  submissionDeadline: Date | string | null;
  votingDeadline: Date | string | null;
}) {
  return (
    <View
      style={{
        backgroundColor: "#102A2A",
        borderWidth: 1,
        borderColor: "#164B49",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          marginBottom: themeDescription ? 8 : 12,
          fontSize: 20,
          fontWeight: "700",
          color: "#DCE4E4",
        }}
      >
        {themeName}
      </Text>

      {themeDescription ? (
        <Text
          style={{
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 12,
            color: "#8FA8A8",
          }}
        >
          {themeDescription}
        </Text>
      ) : null}

      {(submissionDeadline ?? votingDeadline) && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#164B49",
            paddingTop: 12,
            gap: 6,
          }}
        >
          {submissionDeadline && (
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ fontSize: 12, color: "#8FA8A8" }}>
                Submission deadline
              </Text>
              <Text
                style={{ fontSize: 12, fontWeight: "600", color: "#DCE4E4" }}
              >
                {formatDate(submissionDeadline)}
              </Text>
            </View>
          )}
          {votingDeadline && (
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ fontSize: 12, color: "#8FA8A8" }}>
                Voting deadline
              </Text>
              <Text
                style={{ fontSize: 12, fontWeight: "600", color: "#DCE4E4" }}
              >
                {formatDate(votingDeadline)}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/* ─── Submission Phase Section ─── */

interface OwnSubmission {
  id: string;
  isOwn: boolean;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArtUrl: string | null;
  spotifyTrackId: string;
}

function SubmissionPhaseSection({
  roundId,
  submissions,
  submissionCount,
  memberCount,
  songsPerRound,
}: {
  roundId: string;
  submissions: OwnSubmission[];
  submissionCount: number;
  memberCount: number;
  songsPerRound: number;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const deleteSubmission = useMutation(
    trpc.musicLeague.deleteSubmission.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryFilter(),
        );
      },
    }),
  );

  const handleDelete = (submissionId: string, trackName: string) => {
    Alert.alert("Remove Song", `Remove "${trackName}" from your submissions?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void deleteSubmission.mutateAsync({ submissionId }).catch(() => {
            Alert.alert("Error", "Failed to remove submission.");
          });
        },
      },
    ]);
  };

  const hasMaxSubmissions = submissions.length >= songsPerRound;

  return (
    <View style={{ gap: 16, marginBottom: 16 }}>
      {/* Submission Progress Card */}
      <View
        style={{
          backgroundColor: "#102A2A",
          borderWidth: 1,
          borderColor: "#164B49",
          borderRadius: 12,
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(80, 200, 120, 0.2)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Music size={18} color="#50C878" />
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#DCE4E4" }}>
            Submission Phase
          </Text>
          <Text style={{ marginTop: 2, fontSize: 12, color: "#8FA8A8" }}>
            {submissionCount}/{memberCount} members have submitted
          </Text>
        </View>
      </View>

      {/* User's Submissions or Empty State */}
      {submissions.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: "500", color: "#8FA8A8" }}>
            {submissions.length}/{songsPerRound} songs submitted
          </Text>
          {submissions.map((sub) => (
            <View
              key={sub.id}
              style={{
                backgroundColor: "#102A2A",
                borderWidth: 1,
                borderColor: "#164B49",
                borderRadius: 12,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {sub.albumArtUrl ? (
                <Image
                  source={{ uri: sub.albumArtUrl }}
                  style={{ width: 48, height: 48, borderRadius: 8 }}
                />
              ) : (
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    backgroundColor: "#1A3A3A",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Music size={20} color="#8FA8A8" />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#DCE4E4" }}
                  numberOfLines={1}
                >
                  {sub.trackName}
                </Text>
                <Text
                  style={{ marginTop: 2, fontSize: 12, color: "#8FA8A8" }}
                  numberOfLines={1}
                >
                  {sub.artistName}
                </Text>
              </View>
              <Pressable
                onPress={() => handleDelete(sub.id, sub.trackName)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 8,
                }}
              >
                <Trash2 size={16} color="#EF4444" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View
          style={{
            backgroundColor: "#102A2A",
            borderWidth: 1,
            borderColor: "#164B49",
            borderRadius: 12,
            padding: 24,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "rgba(80, 200, 120, 0.1)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Music size={24} color="#50C878" />
          </View>
          <Text style={{ fontSize: 14, color: "#8FA8A8" }}>
            No songs submitted yet
          </Text>
        </View>
      )}

      {/* Submit a Song Button */}
      <Pressable
        onPress={() => router.push(`/music/round/${roundId}/submit`)}
        disabled={hasMaxSubmissions}
        style={{
          backgroundColor: hasMaxSubmissions ? "#1A3A3A" : "#50C878",
          borderRadius: 12,
          paddingVertical: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          opacity: hasMaxSubmissions ? 0.5 : 1,
        }}
      >
        <Music size={20} color={hasMaxSubmissions ? "#8FA8A8" : "#0A1A1A"} />
        <Text
          style={{
            color: hasMaxSubmissions ? "#8FA8A8" : "#0A1A1A",
            fontSize: 16,
            fontWeight: "700",
            marginLeft: 8,
          }}
        >
          {hasMaxSubmissions ? "Max Songs Submitted" : "Submit a Song"}
        </Text>
      </Pressable>
    </View>
  );
}

/* ─── View Playlist Button ─── */

function ViewPlaylistButton({
  roundId,
  trackCount,
  showTrackCount,
}: {
  roundId: string;
  trackCount: number;
  showTrackCount: boolean;
}) {
  const router = useRouter();

  return (
    <View style={{ gap: 8, marginBottom: 16 }}>
      <Pressable
        onPress={() => router.push(`/music/round/${roundId}/playlist`)}
        style={{
          backgroundColor: "#102A2A",
          borderWidth: 1,
          borderColor: "#1DB954",
          borderRadius: 12,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ListMusic size={20} color="#1DB954" />
        <Text
          style={{
            color: "#1DB954",
            fontSize: 16,
            fontWeight: "700",
            marginLeft: 8,
          }}
        >
          View Playlist
        </Text>
      </Pressable>

      {showTrackCount && (
        <Text style={{ fontSize: 13, textAlign: "center", color: "#8FA8A8" }}>
          Listen to all {trackCount} tracks before voting begins
        </Text>
      )}
    </View>
  );
}

/* ─── Voting Phase Section ─── */

function VotingPhaseSection({
  roundId,
  submissions,
  upvotePointsPerRound,
}: {
  roundId: string;
  submissions: OwnSubmission[];
  upvotePointsPerRound: number;
}) {
  const queryClient = useQueryClient();

  const [votes, setVotes] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const s of submissions) {
      initial[s.id] = 0;
    }
    return initial;
  });

  const [comments, setComments] = useState<Record<string, string>>({});

  const totalUsed = Object.values(votes).reduce((sum, v) => sum + v, 0);
  const remaining = upvotePointsPerRound - totalUsed;
  const allPointsAllocated = remaining === 0;

  const pointsColor =
    remaining > Math.floor(upvotePointsPerRound * 0.3)
      ? "#50C878"
      : remaining > 0
        ? "#FFA500"
        : "#EF4444";

  const submitVotesMutation = useMutation(
    trpc.musicLeague.submitVotes.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryFilter(),
        );
        Alert.alert("Success", "Your votes have been submitted!");
      },
    }),
  );

  const handleIncrement = (submissionId: string) => {
    if (remaining <= 0) return;
    setVotes((prev) => ({
      ...prev,
      [submissionId]: (prev[submissionId] ?? 0) + 1,
    }));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDecrement = (submissionId: string) => {
    const current = votes[submissionId] ?? 0;
    if (current <= 0) return;
    setVotes((prev) => ({
      ...prev,
      [submissionId]: current - 1,
    }));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    const voteEntries = Object.entries(votes)
      .filter(([, points]) => points > 0)
      .map(([submissionId, points]) => ({ submissionId, points }));

    const commentEntries = Object.entries(comments)
      .filter(([, text]) => text.trim().length > 0)
      .map(([submissionId, text]) => ({ submissionId, text: text.trim() }));

    try {
      await submitVotesMutation.mutateAsync({
        roundId,
        votes: voteEntries,
        comments: commentEntries,
      });
    } catch {
      Alert.alert("Error", "Failed to submit votes. Please try again.");
    }
  };

  return (
    <View style={{ gap: 12, marginBottom: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Vote size={18} color="#FFA500" />
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#DCE4E4" }}>
          Vote on Songs
        </Text>
      </View>

      {/* Remaining Points Badge */}
      <View
        style={{
          backgroundColor: "#102A2A",
          borderWidth: 1,
          borderColor: pointsColor,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: pointsColor,
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          Points remaining: {remaining} / {upvotePointsPerRound}
        </Text>
      </View>

      {/* Vote Cards */}
      {submissions.map((sub) => {
        const currentPoints = votes[sub.id] ?? 0;

        return (
          <View
            key={sub.id}
            style={{
              backgroundColor: "#102A2A",
              borderWidth: 1,
              borderColor: "#164B49",
              borderRadius: 12,
              padding: 12,
            }}
          >
            {/* Track info row */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {sub.albumArtUrl ? (
                <Image
                  source={{ uri: sub.albumArtUrl }}
                  style={{ width: 48, height: 48, borderRadius: 8 }}
                />
              ) : (
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    backgroundColor: "#1A3A3A",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Music size={20} color="#8FA8A8" />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#DCE4E4" }}
                  numberOfLines={1}
                >
                  {sub.trackName}
                </Text>
                <Text
                  style={{ marginTop: 2, fontSize: 12, color: "#8FA8A8" }}
                  numberOfLines={1}
                >
                  {sub.artistName}
                </Text>
              </View>

              {/* Point stepper */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  marginLeft: 8,
                }}
              >
                <Pressable
                  onPress={() => handleDecrement(sub.id)}
                  disabled={currentPoints <= 0}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor:
                      currentPoints <= 0
                        ? "#1A3A3A"
                        : "rgba(80, 200, 120, 0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Minus
                    size={16}
                    color={currentPoints <= 0 ? "#8FA8A8" : "#50C878"}
                  />
                </Pressable>

                <Text
                  style={{
                    color: currentPoints > 0 ? "#DCE4E4" : "#8FA8A8",
                    fontSize: 16,
                    fontWeight: "700",
                    minWidth: 28,
                    textAlign: "center",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {currentPoints}
                </Text>

                <Pressable
                  onPress={() => handleIncrement(sub.id)}
                  disabled={remaining <= 0}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor:
                      remaining <= 0 ? "#1A3A3A" : "rgba(80, 200, 120, 0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus
                    size={16}
                    color={remaining <= 0 ? "#8FA8A8" : "#50C878"}
                  />
                </Pressable>
              </View>
            </View>

            {/* Comment input */}
            <TextInput
              placeholder="Add a comment..."
              placeholderTextColor="#8FA8A8"
              maxLength={280}
              value={comments[sub.id] ?? ""}
              onChangeText={(text) =>
                setComments((prev) => ({ ...prev, [sub.id]: text }))
              }
              style={{
                backgroundColor: "#0A1A1A",
                borderWidth: 1,
                borderColor: "#164B49",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginTop: 10,
                color: "#DCE4E4",
                fontSize: 13,
              }}
            />
          </View>
        );
      })}

      {/* Submit Votes Button */}
      <Pressable
        onPress={handleSubmit}
        disabled={!allPointsAllocated || submitVotesMutation.isPending}
        style={{
          backgroundColor: allPointsAllocated ? "#50C878" : "#1A3A3A",
          borderRadius: 12,
          paddingVertical: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          opacity: allPointsAllocated ? 1 : 0.5,
        }}
      >
        {submitVotesMutation.isPending ? (
          <ActivityIndicator size="small" color="#0A1A1A" />
        ) : (
          <>
            <Check
              size={20}
              color={allPointsAllocated ? "#0A1A1A" : "#8FA8A8"}
            />
            <Text
              style={{
                color: allPointsAllocated ? "#0A1A1A" : "#8FA8A8",
                fontSize: 16,
                fontWeight: "700",
                marginLeft: 8,
              }}
            >
              Submit Votes
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

/* ─── Results Phase Section ─── */

interface ResultSubmission {
  id: string;
  trackName: string;
  artistName: string;
  albumArtUrl: string | null;
  spotifyTrackId: string;
  submitter: { name: string | null; image: string | null } | null;
  totalPoints: number;
  votes: {
    voter: { name: string | null; image: string | null } | null;
    points: number;
  }[];
  comments: { user: { name: string | null } | null; text: string }[];
}

function ResultsPhaseSection({
  submissions,
}: {
  submissions: ResultSubmission[];
}) {
  const sorted = [...submissions].sort((a, b) => b.totalPoints - a.totalPoints);

  if (sorted.length === 0) {
    return (
      <View
        style={{
          backgroundColor: "#102A2A",
          borderWidth: 1,
          borderColor: "#164B49",
          borderRadius: 12,
          padding: 24,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 14, color: "#8FA8A8" }}>
          No results available
        </Text>
      </View>
    );
  }

  const winner = sorted[0];
  if (!winner) return null;
  const podium = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <View style={{ gap: 12, marginBottom: 16 }}>
      {/* Winner Announcement Banner */}
      <View
        style={{
          backgroundColor: "rgba(234,179,8,0.1)",
          borderWidth: 1,
          borderColor: "rgba(234,179,8,0.3)",
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Trophy size={20} color="#EAB308" />
        <Text
          style={{
            marginLeft: 10,
            flex: 1,
            fontSize: 14,
            fontWeight: "700",
            color: "#EAB308",
          }}
        >
          {winner.submitter?.name ?? "Unknown"} wins the round!
        </Text>
      </View>

      {/* Podium Cards */}
      {podium.map((sub, idx) => (
        <PodiumCard
          key={sub.id}
          submission={sub}
          rank={(idx + 1) as 1 | 2 | 3}
        />
      ))}

      {/* Remaining Results */}
      {rest.map((sub, idx) => (
        <CompactResultRow key={sub.id} submission={sub} rank={idx + 4} />
      ))}
    </View>
  );
}

/* ─── Podium Card ─── */

const PODIUM_STYLES = {
  1: {
    accentBg: "rgba(234,179,8,0.15)",
    accentBorder: "rgba(234,179,8,0.4)",
    pointColor: "#EAB308",
    artSize: 80,
  },
  2: {
    accentBg: "rgba(192,192,192,0.15)",
    accentBorder: "rgba(192,192,192,0.4)",
    pointColor: "#C0C0C0",
    artSize: 60,
  },
  3: {
    accentBg: "rgba(205,127,50,0.15)",
    accentBorder: "rgba(205,127,50,0.4)",
    pointColor: "#CD7F32",
    artSize: 60,
  },
} as const;

function PodiumCard({
  submission,
  rank,
}: {
  submission: ResultSubmission;
  rank: 1 | 2 | 3;
}) {
  const style = PODIUM_STYLES[rank];
  const [expanded, setExpanded] = useState(rank === 1);

  return (
    <View
      style={{
        backgroundColor: style.accentBg,
        borderWidth: 1,
        borderColor: style.accentBorder,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {/* Rank circle */}
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: style.pointColor,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Text style={{ color: "#0A1A1A", fontSize: 13, fontWeight: "800" }}>
            {rank}
          </Text>
        </View>

        {/* Album art */}
        {submission.albumArtUrl ? (
          <Image
            source={{ uri: submission.albumArtUrl }}
            style={{
              width: style.artSize,
              height: style.artSize,
              borderRadius: 8,
            }}
          />
        ) : (
          <View
            style={{
              width: style.artSize,
              height: style.artSize,
              borderRadius: 8,
              backgroundColor: "#1A3A3A",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Music size={style.artSize * 0.35} color="#8FA8A8" />
          </View>
        )}

        {/* Track info */}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              fontWeight: "700",
              color: "#DCE4E4",
              fontSize: rank === 1 ? 16 : 14,
            }}
            numberOfLines={1}
          >
            {submission.trackName}
          </Text>
          <Text
            style={{ marginTop: 2, fontSize: 12, color: "#8FA8A8" }}
            numberOfLines={1}
          >
            {submission.artistName}
          </Text>
          {submission.submitter && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              {submission.submitter.image ? (
                <Image
                  source={{ uri: submission.submitter.image }}
                  style={{ width: 16, height: 16, borderRadius: 8 }}
                />
              ) : (
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: "#1A3A3A",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: "#8FA8A8", fontSize: 8, fontWeight: "700" }}
                  >
                    {(submission.submitter.name ?? "?")[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
              <Text
                style={{ marginLeft: 4, fontSize: 12, color: "#8FA8A8" }}
                numberOfLines={1}
              >
                {submission.submitter.name ?? "Unknown"}
              </Text>
            </View>
          )}
        </View>

        {/* Points */}
        <Text
          style={{
            color: style.pointColor,
            fontSize: rank === 1 ? 22 : 18,
            fontWeight: "800",
            marginLeft: 8,
          }}
        >
          {submission.totalPoints}
        </Text>
      </View>

      {/* Expand/Collapse toggle */}
      <Pressable
        onPress={() => setExpanded((p) => !p)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 10,
          paddingVertical: 6,
        }}
      >
        {expanded ? (
          <ChevronUp size={14} color="#8FA8A8" />
        ) : (
          <ChevronDown size={14} color="#8FA8A8" />
        )}
        <Text style={{ marginLeft: 4, fontSize: 12, color: "#8FA8A8" }}>
          {expanded ? "Hide details" : "Show votes & comments"}
        </Text>
      </Pressable>

      {/* Vote & Comment Details */}
      {expanded && (
        <VoteCommentDetails
          votes={submission.votes}
          comments={submission.comments}
        />
      )}
    </View>
  );
}

/* ─── Compact Result Row ─── */

function CompactResultRow({
  submission,
  rank,
}: {
  submission: ResultSubmission;
  rank: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={{
        backgroundColor: "#102A2A",
        borderWidth: 1,
        borderColor: "#164B49",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <Pressable
        onPress={() => setExpanded((p) => !p)}
        style={{ flexDirection: "row", alignItems: "center" }}
      >
        {/* Rank */}
        <Text
          style={{
            color: "#8FA8A8",
            fontSize: 13,
            fontWeight: "700",
            width: 24,
            textAlign: "center",
          }}
        >
          {rank}
        </Text>

        {/* Album art */}
        {submission.albumArtUrl ? (
          <Image
            source={{ uri: submission.albumArtUrl }}
            style={{ width: 40, height: 40, borderRadius: 6, marginLeft: 8 }}
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 6,
              backgroundColor: "#1A3A3A",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 8,
            }}
          >
            <Music size={16} color="#8FA8A8" />
          </View>
        )}

        {/* Track info */}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            style={{ fontSize: 14, fontWeight: "600", color: "#DCE4E4" }}
            numberOfLines={1}
          >
            {submission.trackName}
          </Text>
          <Text
            style={{ marginTop: 1, fontSize: 12, color: "#8FA8A8" }}
            numberOfLines={1}
          >
            {submission.artistName}
            {submission.submitter?.name
              ? ` · ${submission.submitter.name}`
              : ""}
          </Text>
        </View>

        {/* Points */}
        <Text
          style={{
            color: "#DCE4E4",
            fontSize: 15,
            fontWeight: "700",
            marginLeft: 8,
          }}
        >
          {submission.totalPoints}
        </Text>

        {/* Expand indicator */}
        <View style={{ marginLeft: 6 }}>
          {expanded ? (
            <ChevronUp size={14} color="#8FA8A8" />
          ) : (
            <ChevronDown size={14} color="#8FA8A8" />
          )}
        </View>
      </Pressable>

      {expanded && (
        <View style={{ marginTop: 10 }}>
          <VoteCommentDetails
            votes={submission.votes}
            comments={submission.comments}
          />
        </View>
      )}
    </View>
  );
}

/* ─── Vote & Comment Details ─── */

function VoteCommentDetails({
  votes,
  comments,
}: {
  votes: ResultSubmission["votes"];
  comments: ResultSubmission["comments"];
}) {
  const sortedVotes = [...votes].sort((a, b) => b.points - a.points);

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: "rgba(22,75,73,0.5)",
        paddingTop: 10,
        gap: 8,
      }}
    >
      {/* Votes */}
      {sortedVotes.length > 0 ? (
        <View style={{ gap: 6 }}>
          {sortedVotes.map((vote, idx) => (
            <View
              key={idx}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              {/* Voter avatar */}
              {vote.voter?.image ? (
                <Image
                  source={{ uri: vote.voter.image }}
                  style={{ width: 20, height: 20, borderRadius: 10 }}
                />
              ) : (
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "#1A3A3A",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: "#8FA8A8", fontSize: 9, fontWeight: "700" }}
                  >
                    {(vote.voter?.name ?? "?")[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
              <Text
                style={{
                  marginLeft: 6,
                  flex: 1,
                  fontSize: 12,
                  color: "#DCE4E4",
                }}
                numberOfLines={1}
              >
                {vote.voter?.name ?? "Unknown"}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: vote.points >= 0 ? "#50C878" : "#EF4444",
                }}
              >
                {vote.points > 0 ? `+${vote.points}` : vote.points}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ fontSize: 12, color: "#8FA8A8" }}>
          No votes received
        </Text>
      )}

      {/* Comments */}
      {comments.length > 0 && (
        <View style={{ gap: 6, marginTop: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MessageCircle size={12} color="#8FA8A8" />
            <Text style={{ fontSize: 12, fontWeight: "500", color: "#8FA8A8" }}>
              Comments
            </Text>
          </View>
          {comments.map((comment, idx) => (
            <View key={idx} style={{ marginLeft: 4 }}>
              <Text style={{ fontSize: 12, color: "#DCE4E4" }}>
                <Text style={{ fontWeight: "600", color: "#8FA8A8" }}>
                  {comment.user?.name ?? "Unknown"}:{" "}
                </Text>
                {comment.text}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ─── Admin Controls ─── */

const PHASE_NEXT_LABELS: Record<string, string> = {
  SUBMISSION: "Listening",
  LISTENING: "Voting",
  VOTING: "Results",
  RESULTS: "Completed",
};

function AdminControls({
  roundId,
  status,
  playlistUrl: initialPlaylistUrl,
}: {
  roundId: string;
  status: string;
  playlistUrl: string | null;
}) {
  const queryClient = useQueryClient();
  const [playlistUrl, setPlaylistUrl] = useState(initialPlaylistUrl ?? "");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  const setPlaylistMutation = useMutation(
    trpc.musicLeague.setRoundPlaylistUrl.mutationOptions({
      onSuccess: async () => {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        await queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryFilter(),
        );
      },
    }),
  );

  const generatePlaylistMutation = useMutation(
    trpc.musicLeague.generateRoundPlaylist.mutationOptions({
      onSuccess: async (data) => {
        if (data.playlistUrl) {
          setPlaylistUrl(data.playlistUrl);
        }
        setGenerateSuccess(true);
        setTimeout(() => setGenerateSuccess(false), 2000);
        await queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryFilter(),
        );
      },
    }),
  );

  const advancePhaseMutation = useMutation(
    trpc.musicLeague.advanceRoundPhase.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryFilter(),
        );
      },
    }),
  );

  const handleSavePlaylist = async () => {
    try {
      await setPlaylistMutation.mutateAsync({ roundId, playlistUrl });
    } catch {
      Alert.alert("Error", "Failed to save playlist URL.");
    }
  };

  const handleGeneratePlaylist = async () => {
    try {
      await generatePlaylistMutation.mutateAsync({ roundId });
    } catch {
      Alert.alert("Error", "Failed to generate playlist.");
    }
  };

  const handleAdvancePhase = () => {
    const nextPhase = PHASE_NEXT_LABELS[status];
    Alert.alert(
      "Advance Phase?",
      `Move from ${status} to ${nextPhase ?? "next phase"}. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Advance",
          onPress: () => {
            void advancePhaseMutation.mutateAsync({ roundId }).catch(() => {
              Alert.alert("Error", "Failed to advance phase.");
            });
          },
        },
      ],
    );
  };

  return (
    <View
      style={{
        backgroundColor: "#102A2A",
        borderWidth: 1,
        borderColor: "#164B49",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        gap: 14,
      }}
    >
      {/* Header */}
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#DCE4E4" }}>
        Admin Controls
      </Text>

      {/* Playlist URL Input */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Link size={14} color="#8FA8A8" />
          <Text style={{ fontSize: 12, color: "#8FA8A8" }}>
            Spotify Playlist URL
          </Text>
        </View>
        <TextInput
          placeholder="https://open.spotify.com/playlist/..."
          placeholderTextColor="#8FA8A8"
          value={playlistUrl}
          onChangeText={setPlaylistUrl}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            backgroundColor: "#0A1A1A",
            borderWidth: 1,
            borderColor: "#164B49",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: "#DCE4E4",
            fontSize: 13,
          }}
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          {/* Save Button */}
          <Pressable
            onPress={handleSavePlaylist}
            disabled={setPlaylistMutation.isPending}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: saveSuccess ? "rgba(80,200,120,0.2)" : "#1A3A3A",
              borderRadius: 8,
              paddingVertical: 10,
              gap: 6,
            }}
          >
            {setPlaylistMutation.isPending ? (
              <ActivityIndicator size="small" color="#50C878" />
            ) : saveSuccess ? (
              <Check size={16} color="#50C878" />
            ) : (
              <Save size={16} color="#DCE4E4" />
            )}
            <Text
              style={{
                color: saveSuccess ? "#50C878" : "#DCE4E4",
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {saveSuccess ? "Saved" : "Save"}
            </Text>
          </Pressable>

          {/* Auto-generate Button */}
          <Pressable
            onPress={handleGeneratePlaylist}
            disabled={generatePlaylistMutation.isPending}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: generateSuccess
                ? "rgba(80,200,120,0.2)"
                : "#1A3A3A",
              borderRadius: 8,
              paddingVertical: 10,
              gap: 6,
            }}
          >
            {generatePlaylistMutation.isPending ? (
              <ActivityIndicator size="small" color="#50C878" />
            ) : generateSuccess ? (
              <Check size={16} color="#50C878" />
            ) : (
              <Sparkles size={16} color="#DCE4E4" />
            )}
            <Text
              style={{
                color: generateSuccess ? "#50C878" : "#DCE4E4",
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {generateSuccess ? "Generated" : "Auto-generate"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Advance Phase Button */}
      {status !== "COMPLETED" && (
        <Pressable
          onPress={handleAdvancePhase}
          disabled={advancePhaseMutation.isPending}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,165,0,0.15)",
            borderWidth: 1,
            borderColor: "rgba(255,165,0,0.3)",
            borderRadius: 8,
            paddingVertical: 12,
            gap: 8,
          }}
        >
          {advancePhaseMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFA500" />
          ) : (
            <>
              <Text
                style={{
                  color: "#FFA500",
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                Advance Phase
              </Text>
              <ChevronRight size={16} color="#FFA500" />
            </>
          )}
        </Pressable>
      )}

      {status !== "COMPLETED" && (
        <Text style={{ textAlign: "center", fontSize: 12, color: "#8FA8A8" }}>
          Move from {status} to {PHASE_NEXT_LABELS[status] ?? "next phase"}
        </Text>
      )}
    </View>
  );
}

/* ─── Member Status Board ─── */

function MemberStatusBoard({
  status,
  memberStatus,
}: {
  status: string;
  memberStatus: {
    id: string;
    name: string | null;
    image: string | null;
    hasSubmitted: boolean;
    hasVoted: boolean;
  }[];
}) {
  const isSubmission = status === "SUBMISSION";
  const completedCount = memberStatus.filter((m) =>
    isSubmission ? m.hasSubmitted : m.hasVoted,
  ).length;
  const totalCount = memberStatus.length;
  const summaryLabel = isSubmission
    ? `${completedCount}/${totalCount} submitted`
    : `${completedCount}/${totalCount} voted`;

  return (
    <View
      style={{
        backgroundColor: "#102A2A",
        borderWidth: 1,
        borderColor: "#164B49",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        gap: 12,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Users size={16} color="#8FA8A8" />
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#DCE4E4" }}>
          Member Status
        </Text>
      </View>

      {/* Member List */}
      <View style={{ gap: 8 }}>
        {memberStatus.map((member) => {
          const done = isSubmission ? member.hasSubmitted : member.hasVoted;
          return (
            <View
              key={member.id}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              {/* Avatar */}
              {member.image ? (
                <Image
                  source={{ uri: member.image }}
                  style={{ width: 32, height: 32, borderRadius: 16 }}
                />
              ) : (
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#1A3A3A",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#8FA8A8",
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {(member.name ?? "?")[0]?.toUpperCase()}
                  </Text>
                </View>
              )}

              {/* Name */}
              <Text
                style={{
                  flex: 1,
                  marginLeft: 10,
                  fontSize: 14,
                  color: "#DCE4E4",
                }}
                numberOfLines={1}
              >
                {member.name ?? "Unknown"}
              </Text>

              {/* Status Icon */}
              {done ? (
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "rgba(80,200,120,0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={14} color="#50C878" />
                </View>
              ) : (
                <Circle size={20} color="#8FA8A8" />
              )}
            </View>
          );
        })}
      </View>

      {/* Summary */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: "#164B49",
          paddingTop: 10,
        }}
      >
        <Text style={{ textAlign: "center", fontSize: 12, color: "#8FA8A8" }}>
          {summaryLabel}
        </Text>
      </View>
    </View>
  );
}
