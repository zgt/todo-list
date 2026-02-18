import { Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Check, Music } from "lucide-react-native";

import type { SubmissionItem } from "~/components/music/roundDetailTypes";
import { SubmissionListItem } from "~/components/music/SubmissionListItem";

interface SubmissionPhaseViewProps {
  submissions: SubmissionItem[];
  submissionCount: number;
  memberCount: number;
  songsPerRound: number;
  roundId: string;
}

export function SubmissionPhaseView({
  submissions,
  submissionCount,
  memberCount,
  songsPerRound,
  roundId,
}: SubmissionPhaseViewProps) {
  const router = useRouter();
  const mySubmissions = submissions.filter((s) => s.isOwn);
  const canSubmitMore = mySubmissions.length < songsPerRound;

  return (
    <View className="gap-3">
      {/* Submission Progress */}
      <View className="flex-row items-center justify-between rounded-lg border border-[#164B49] bg-[#102A2A] px-4 py-3">
        <Text className="text-sm font-medium text-[#8FA8A8]">
          Submission progress
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-bold text-[#DCE4E4]">
            {submissionCount}/{memberCount} songs
          </Text>
          <View className="h-2 w-16 overflow-hidden rounded-full bg-[#164B49]">
            <View
              className="h-full rounded-full bg-[#50C878]"
              style={{
                width: `${Math.min(100, (submissionCount / Math.max(1, memberCount)) * 100)}%`,
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
              Your submissions ({mySubmissions.length}/{songsPerRound})
            </Text>
          </View>
          {mySubmissions.map((sub) => (
            <View
              key={sub.id}
              className="flex-row items-center gap-3 rounded-lg border p-3"
              style={{
                borderColor: "rgba(80,200,120,0.3)",
                backgroundColor: "rgba(80,200,120,0.05)",
              }}
            >
              {sub.albumArtUrl ? (
                <Image
                  source={{ uri: sub.albumArtUrl }}
                  style={{ width: 40, height: 40, borderRadius: 6 }}
                />
              ) : (
                <View className="h-10 w-10 items-center justify-center rounded bg-[#0A1A1A]">
                  <Music size={16} color="#8FA8A8" />
                </View>
              )}
              <View className="flex-1">
                <Text className="font-medium text-[#DCE4E4]" numberOfLines={1}>
                  {sub.trackName}
                </Text>
                <Text className="text-xs text-[#8FA8A8]" numberOfLines={1}>
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
          onPress={() => router.push(`/music/round/${roundId}/submit` as never)}
          className="flex-row items-center justify-center gap-2 rounded-lg bg-[#50C878] py-4 active:bg-[#66D99A]"
        >
          <Music size={20} color="#0A1A1A" />
          <Text className="text-base font-bold text-[#0A1A1A]">
            Submit a Song
          </Text>
        </Pressable>
      )}

      {/* All Submissions */}
      <Text className="mt-3 text-xl font-bold text-[#DCE4E4]">
        Submissions ({submissions.length})
      </Text>

      {submissions.length === 0 ? (
        <Text className="py-8 text-center text-[#8FA8A8] italic">
          No submissions yet. Be the first!
        </Text>
      ) : (
        <View className="gap-3">
          {submissions.map((sub) => (
            <SubmissionListItem key={sub.id} submission={sub} />
          ))}
        </View>
      )}
    </View>
  );
}
