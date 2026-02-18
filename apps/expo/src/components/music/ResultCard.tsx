import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Music,
  Trophy,
} from "lucide-react-native";

interface VoteBreakdown {
  voter: { name: string | null; image: string | null } | null;
  points: number;
}

interface CommentItem {
  user: { name: string | null } | null;
  text: string;
}

interface ResultCardProps {
  rank: number;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArtUrl: string | null;
  submitterName: string | null;
  totalPoints: number;
  votes: VoteBreakdown[];
  comments: CommentItem[];
}

export function ResultCard({
  rank,
  trackName,
  artistName,
  albumName,
  albumArtUrl,
  submitterName,
  totalPoints,
  votes,
  comments,
}: ResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isWinner = rank === 1;
  const votesWithPoints = votes.filter((v) => v.points > 0);

  return (
    <View
      className={`rounded-xl border p-4 ${
        isWinner
          ? "border-[#FFD700]/50 bg-[#FFD700]/5"
          : "border-[#164B49] bg-[#102A2A]"
      }`}
    >
      {/* Main row */}
      <View className="flex-row items-center gap-3">
        {/* Rank badge */}
        <View
          className={`h-9 w-9 items-center justify-center rounded-full ${
            isWinner ? "bg-[#FFD700]/20" : "bg-[#0A1A1A]"
          }`}
        >
          {isWinner ? (
            <Trophy size={18} color="#FFD700" />
          ) : (
            <Text
              className={`font-bold ${
                rank <= 3 ? "text-[#DCE4E4]" : "text-[#8FA8A8]"
              }`}
            >
              {rank}
            </Text>
          )}
        </View>

        {/* Album art */}
        {albumArtUrl ? (
          <Image
            source={{ uri: albumArtUrl }}
            style={{ width: 52, height: 52, borderRadius: 8 }}
          />
        ) : (
          <View className="h-[52px] w-[52px] items-center justify-center rounded-lg bg-[#0A1A1A]">
            <Music size={22} color="#8FA8A8" />
          </View>
        )}

        {/* Track info */}
        <View className="flex-1">
          <Text
            className={`font-semibold ${
              isWinner ? "text-[#FFD700]" : "text-[#DCE4E4]"
            }`}
            numberOfLines={1}
          >
            {trackName}
          </Text>
          <Text className="text-xs text-[#8FA8A8]" numberOfLines={1}>
            {artistName} — {albumName}
          </Text>
          {submitterName && (
            <Text className="mt-0.5 text-xs text-[#50C878]">
              by {submitterName}
            </Text>
          )}
        </View>

        {/* Points */}
        <View className="items-end">
          <Text
            className={`text-xl font-bold ${
              isWinner ? "text-[#FFD700]" : "text-[#50C878]"
            }`}
          >
            {totalPoints}
          </Text>
          <Text className="text-[10px] text-[#8FA8A8]">pts</Text>
        </View>
      </View>

      {/* Expand toggle for vote breakdown */}
      {(votesWithPoints.length > 0 || comments.length > 0) && (
        <Pressable
          onPress={() => setExpanded(!expanded)}
          className="mt-3 flex-row items-center justify-center gap-1 border-t border-[#164B49] pt-3"
        >
          <Text className="text-xs text-[#8FA8A8]">
            {votesWithPoints.length} vote{votesWithPoints.length !== 1 && "s"}
            {comments.length > 0 &&
              ` · ${comments.length} comment${comments.length !== 1 ? "s" : ""}`}
          </Text>
          {expanded ? (
            <ChevronUp size={14} color="#8FA8A8" />
          ) : (
            <ChevronDown size={14} color="#8FA8A8" />
          )}
        </Pressable>
      )}

      {/* Expanded vote breakdown */}
      {expanded && (
        <View className="mt-3 gap-2">
          {/* Individual votes */}
          {votesWithPoints.length > 0 && (
            <View className="gap-1.5">
              {votesWithPoints
                .sort((a, b) => b.points - a.points)
                .map((vote, idx) => (
                  <View
                    key={idx}
                    className="flex-row items-center justify-between rounded-lg bg-[#0A1A1A]/60 px-3 py-2"
                  >
                    <View className="flex-row items-center gap-2">
                      {vote.voter?.image ? (
                        <Image
                          source={{ uri: vote.voter.image }}
                          style={{ width: 20, height: 20, borderRadius: 10 }}
                        />
                      ) : (
                        <View className="h-5 w-5 items-center justify-center rounded-full bg-[#164B49]">
                          <Text className="text-[8px] text-[#8FA8A8]">
                            {(vote.voter?.name ?? "?")[0]?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text className="text-xs text-[#DCE4E4]">
                        {vote.voter?.name ?? "Anonymous"}
                      </Text>
                    </View>
                    <Text className="text-xs font-bold text-[#50C878]">
                      +{vote.points}
                    </Text>
                  </View>
                ))}
            </View>
          )}

          {/* Comments */}
          {comments.length > 0 && (
            <View className="mt-1 gap-1.5">
              {comments.map((comment, idx) => (
                <View
                  key={idx}
                  className="flex-row gap-2 rounded-lg bg-[#0A1A1A]/60 px-3 py-2"
                >
                  <MessageSquare size={12} color="#8FA8A8" className="mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-xs font-medium text-[#8FA8A8]">
                      {comment.user?.name ?? "Anonymous"}
                    </Text>
                    <Text className="text-xs text-[#DCE4E4]">
                      {comment.text}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
