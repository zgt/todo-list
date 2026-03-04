import { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { Pause, Play } from "lucide-react-native";

interface AudioPreviewPlayerProps {
  previewUrl: string;
}

export function AudioPreviewPlayer({ previewUrl }: AudioPreviewPlayerProps) {
  const player = useAudioPlayer(previewUrl, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  // Reset when previewUrl changes
  useEffect(() => {
    void player.seekTo(0);
  }, [previewUrl, player]);

  const handlePlayPause = () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const isLoading = !status.isLoaded;
  const currentTime = status.currentTime;
  const duration = status.duration;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Reset to beginning when playback finishes
  useEffect(() => {
    if (status.isLoaded && currentTime >= duration && duration > 0) {
      void player.seekTo(0);
    }
  }, [currentTime, duration, status.isLoaded, player]);

  return (
    <View className="mt-2 flex-row items-center gap-3">
      {/* Play/Pause Button */}
      <Pressable
        onPress={handlePlayPause}
        disabled={isLoading}
        className="h-8 w-8 items-center justify-center rounded-full bg-[#50C878]"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#0A1A1A" />
        ) : status.playing ? (
          <Pause size={14} color="#0A1A1A" fill="#0A1A1A" />
        ) : (
          <Play size={14} color="#0A1A1A" fill="#0A1A1A" />
        )}
      </Pressable>

      {/* Progress Bar */}
      <View className="h-1.5 flex-1 rounded-full bg-[#164B49]">
        <View
          className="h-full rounded-full bg-[#50C878]"
          style={{ width: `${progressPercent}%` }}
        />
      </View>

      {/* Time */}
      <Text className="w-10 text-right text-xs text-[#8FA8A8]">
        {duration > 0
          ? `0:${Math.floor(currentTime).toString().padStart(2, "0")}`
          : "0:00"}
      </Text>
    </View>
  );
}
