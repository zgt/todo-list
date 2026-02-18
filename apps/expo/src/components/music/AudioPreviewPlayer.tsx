import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Audio } from "expo-av";
import { Pause, Play } from "lucide-react-native";

interface AudioPreviewPlayerProps {
  previewUrl: string;
}

export function AudioPreviewPlayer({ previewUrl }: AudioPreviewPlayerProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
    };
  }, []);

  // Reset when previewUrl changes
  useEffect(() => {
    const cleanup = async () => {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setIsPlaying(false);
      setProgress(0);
      setDuration(0);
    };
    void cleanup();
  }, [previewUrl]);

  const handlePlayPause = async () => {
    if (isPlaying && soundRef.current) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
      return;
    }

    if (soundRef.current) {
      await soundRef.current.playAsync();
      setIsPlaying(true);
      return;
    }

    // Load and play
    setIsLoading(true);
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setProgress(status.positionMillis);
          setDuration(status.durationMillis ?? 0);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setProgress(0);
            void soundRef.current?.setPositionAsync(0);
          }
        },
      );

      soundRef.current = sound;
      setIsPlaying(true);
    } catch {
      // Audio load failed silently
    } finally {
      setIsLoading(false);
    }
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

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
        ) : isPlaying ? (
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
          ? `0:${Math.floor(progress / 1000)
              .toString()
              .padStart(2, "0")}`
          : "0:00"}
      </Text>
    </View>
  );
}
