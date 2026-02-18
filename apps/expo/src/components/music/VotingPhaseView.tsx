import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Edit3, Send } from "lucide-react-native";

import type { SubmissionItem } from "~/components/music/roundDetailTypes";
import { RemainingPointsBadge } from "~/components/music/RemainingPointsBadge";
import { SubmissionListItem } from "~/components/music/SubmissionListItem";
import { VoteCard } from "~/components/music/VoteCard";
import { trpc } from "~/utils/api";

interface VotingPhaseViewProps {
  submissions: SubmissionItem[];
  upvotePointsPerRound: number;
  roundId: string;
}

export function VotingPhaseView({
  submissions,
  upvotePointsPerRound,
  roundId,
}: VotingPhaseViewProps) {
  const queryClient = useQueryClient();
  const [voteAllocations, setVoteAllocations] = useState<
    Record<string, number>
  >({});
  const [voteComments, setVoteComments] = useState<Record<string, string>>({});
  const [hasSubmittedVotes, setHasSubmittedVotes] = useState(false);

  const votableSubmissions = submissions.filter((s) => !s.isOwn);
  const totalBudget = upvotePointsPerRound;
  const usedPoints = Object.values(voteAllocations).reduce(
    (sum, pts) => sum + pts,
    0,
  );
  const remainingPoints = totalBudget - usedPoints;

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

    submitVotesMutation.mutate({ roundId, votes, comments });
  };

  const handleEditVotes = () => {
    setHasSubmittedVotes(false);
    setVoteAllocations({});
    setVoteComments({});
  };

  if (hasSubmittedVotes) {
    return (
      <View className="gap-3">
        <View
          className="items-center gap-2 rounded-xl border p-4"
          style={{
            borderColor: "rgba(80,200,120,0.3)",
            backgroundColor: "rgba(80,200,120,0.1)",
          }}
        >
          <Check size={24} color="#50C878" />
          <Text className="text-base font-semibold text-[#50C878]">
            Votes Submitted
          </Text>
          <Text className="text-center text-sm text-[#8FA8A8]">
            Your votes have been recorded. You can edit them before voting
            closes.
          </Text>
          <Pressable
            onPress={handleEditVotes}
            className="mt-2 flex-row items-center gap-2 rounded-lg border px-4 py-2"
            style={({ pressed }) => [
              { borderColor: "rgba(80,200,120,0.3)" },
              pressed && { backgroundColor: "rgba(80,200,120,0.1)" },
            ]}
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
        {submissions.map((sub) => (
          <SubmissionListItem key={sub.id} submission={sub} />
        ))}
      </View>
    );
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-bold text-[#DCE4E4]">
          Cast Your Votes
        </Text>
        <RemainingPointsBadge remaining={remainingPoints} total={totalBudget} />
      </View>
      <Text className="text-sm text-[#8FA8A8]">
        Distribute {totalBudget} points across submissions. Tap + to add points.
      </Text>

      {votableSubmissions.length === 0 ? (
        <Text className="py-8 text-center text-[#8FA8A8] italic">
          No other submissions to vote on yet.
        </Text>
      ) : (
        <>
          {votableSubmissions.map((sub) => (
            <VoteCard
              key={sub.id}
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
          ))}

          <View className="mt-4 gap-3">
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
        </>
      )}
    </View>
  );
}
