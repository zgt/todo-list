import { useState } from "react";
import { Image, Text, TextInput, View } from "react-native";
import { MessageSquare, Music } from "lucide-react-native";

import { PointStepper } from "./PointStepper";

interface VoteCardProps {
  submissionId: string;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArtUrl: string | null;
  points: number;
  maxPoints: number;
  comment: string;
  onPointsChange: (submissionId: string, points: number) => void;
  onCommentChange: (submissionId: string, comment: string) => void;
}

export function VoteCard({
  submissionId,
  trackName,
  artistName,
  albumName,
  albumArtUrl,
  points,
  maxPoints,
  comment,
  onPointsChange,
  onCommentChange,
}: VoteCardProps) {
  const [showComment, setShowComment] = useState(comment.length > 0);

  return (
    <View className="rounded-xl border border-[#164B49] bg-[#102A2A] p-4">
      {/* Track Info */}
      <View className="flex-row items-center gap-3">
        {albumArtUrl ? (
          <Image
            source={{ uri: albumArtUrl }}
            style={{ width: 56, height: 56, borderRadius: 8 }}
          />
        ) : (
          <View className="h-14 w-14 items-center justify-center rounded-lg bg-[#0A1A1A]">
            <Music size={24} color="#8FA8A8" />
          </View>
        )}

        <View className="flex-1">
          <Text className="font-semibold text-[#DCE4E4]" numberOfLines={1}>
            {trackName}
          </Text>
          <Text className="text-xs text-[#8FA8A8]" numberOfLines={1}>
            {artistName}
          </Text>
          <Text className="text-xs text-[#8FA8A8]" numberOfLines={1}>
            {albumName}
          </Text>
        </View>

        {/* Point Stepper */}
        <PointStepper
          value={points}
          max={maxPoints}
          onChange={(val) => onPointsChange(submissionId, val)}
        />
      </View>

      {/* Comment Section */}
      <View className="mt-3 border-t border-[#164B49] pt-3">
        {!showComment ? (
          <Text
            onPress={() => setShowComment(true)}
            className="text-xs text-[#8FA8A8]"
          >
            <MessageSquare size={10} color="#8FA8A8" /> Add a comment...
          </Text>
        ) : (
          <View>
            <TextInput
              value={comment}
              onChangeText={(text) => onCommentChange(submissionId, text)}
              placeholder="Leave a comment (optional)"
              placeholderTextColor="#8FA8A8"
              maxLength={280}
              multiline
              numberOfLines={2}
              className="rounded-lg border border-[#164B49] bg-[#0A1A1A] px-3 py-2 text-sm text-[#DCE4E4]"
              style={{ textAlignVertical: "top", minHeight: 48 }}
            />
            <Text className="mt-1 text-right text-[10px] text-[#8FA8A8]">
              {comment.length}/280
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
