import { Image, Linking, Pressable, Text, View } from "react-native";
import { ExternalLink, Music } from "lucide-react-native";

import type { SubmissionItem } from "~/components/music/roundDetailTypes";

interface SubmissionListItemProps {
  submission: SubmissionItem;
}

export function SubmissionListItem({
  submission: sub,
}: SubmissionListItemProps) {
  const handleOpenSpotify = () => {
    void Linking.openURL(`spotify:track:${sub.spotifyTrackId}`).catch(() => {
      void Linking.openURL(
        `https://open.spotify.com/track/${sub.spotifyTrackId}`,
      );
    });
  };

  return (
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
            onPress={handleOpenSpotify}
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
}
