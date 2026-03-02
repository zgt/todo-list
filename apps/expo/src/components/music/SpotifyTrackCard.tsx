import { Image, Linking, Pressable, Text, View } from "react-native";
import { ExternalLink } from "lucide-react-native";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export interface SpotifyTrackCardProps {
  trackName: string;
  artistName: string;
  albumName: string;
  albumArtUrl: string | null;
  spotifyTrackId: string;
  trackDurationMs: number;
  previewUrl?: string | null;
  /** Size of album art thumbnail */
  imageSize?: number;
  /** Whether to show the "Open in Spotify" link */
  showSpotifyLink?: boolean;
  /** Called when the card is pressed */
  onPress?: () => void;
  /** Whether this card is currently selected */
  selected?: boolean;
  /** Extra content to render below track info (e.g. AudioPreviewPlayer) */
  children?: React.ReactNode;
}

export function SpotifyTrackCard({
  trackName,
  artistName,
  albumName,
  albumArtUrl,
  spotifyTrackId,
  trackDurationMs,
  imageSize = 48,
  showSpotifyLink = true,
  onPress,
  selected = false,
  children,
}: SpotifyTrackCardProps) {
  const handleOpenSpotify = () => {
    void Linking.openURL(`spotify:track:${spotifyTrackId}`).catch(() => {
      void Linking.openURL(`https://open.spotify.com/track/${spotifyTrackId}`);
    });
  };

  const content = (
    <View
      className={`rounded-lg border p-3 ${
        selected
          ? "border-[#50C878] bg-[#50C878]/10"
          : "border-[#164B49] bg-[#102A2A]"
      }`}
    >
      <View className="flex-row items-center gap-3">
        {/* Album Art */}
        {albumArtUrl ? (
          <Image
            source={{ uri: albumArtUrl }}
            style={{ width: imageSize, height: imageSize, borderRadius: 6 }}
            accessibilityLabel={`Album art for ${trackName} by ${artistName}`}
          />
        ) : (
          <View
            style={{
              width: imageSize,
              height: imageSize,
              borderRadius: 6,
              backgroundColor: "#0A1A1A",
            }}
          />
        )}

        {/* Track Info */}
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

        {/* Duration + Spotify Link */}
        <View className="items-end gap-1">
          <Text className="text-xs text-[#8FA8A8]">
            {formatDuration(trackDurationMs)}
          </Text>
          {showSpotifyLink && (
            <Pressable
              onPress={handleOpenSpotify}
              hitSlop={8}
              className="rounded-md bg-[#1DB954]/20 px-2 py-1"
              accessibilityLabel={`Open ${trackName} in Spotify`}
              accessibilityRole="link"
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

      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={{ opacity: 1 }}
        accessibilityLabel={`${trackName} by ${artistName}`}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return content;
}
