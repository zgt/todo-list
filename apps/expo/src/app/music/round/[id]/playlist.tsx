import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, ListMusic } from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import { SpotifyTrackCard } from "~/components/music/SpotifyTrackCard";
import { trpc } from "~/utils/api";

interface Track {
  id: string;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArtUrl: string | null;
  spotifyTrackId: string;
  trackDurationMs: number;
}

export default function PlaylistView() {
  const { id: roundId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: playlist,
    isLoading,
    refetch,
  } = useQuery(
    trpc.musicLeague.getPlaylistTracks.queryOptions(
      { roundId },
      { enabled: !!roundId },
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

  const handleOpenPlaylist = () => {
    if (playlist?.playlistUrl) {
      void Linking.openURL(playlist.playlistUrl);
    }
  };

  const renderTrack = useCallback(
    ({ item }: { item: Track }) => (
      <SpotifyTrackCard
        trackName={item.trackName}
        artistName={item.artistName}
        albumName={item.albumName}
        albumArtUrl={item.albumArtUrl}
        spotifyTrackId={item.spotifyTrackId}
        trackDurationMs={item.trackDurationMs}
        showSpotifyLink={true}
      />
    ),
    [],
  );

  if (isLoading) {
    return (
      <GradientBackground>
        <SafeAreaView className="flex-1 items-center justify-center">
          <Stack.Screen options={{ headerShown: false }} />
          <ActivityIndicator size="large" color="#50C878" />
          <Text className="mt-3 text-[#8FA8A8]">Loading playlist...</Text>
        </SafeAreaView>
      </GradientBackground>
    );
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
          <View className="flex-1 items-center">
            <Text className="text-xl font-bold text-[#DCE4E4]">Playlist</Text>
            {playlist && (
              <Text className="text-xs text-[#8FA8A8]">
                Round {playlist.roundNumber}
              </Text>
            )}
          </View>
          <View className="w-10" />
        </View>

        <FlatList
          data={playlist?.tracks ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderTrack}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#50C878"
            />
          }
          ListHeaderComponent={
            <View className="mb-4">
              {/* Theme & Track Count */}
              <View className="mb-4 rounded-xl border border-[#164B49] bg-[#102A2A] p-4">
                <Text className="mb-1 text-xs font-bold tracking-wide text-[#50C878] uppercase">
                  Theme
                </Text>
                <Text className="text-2xl font-bold text-[#DCE4E4]">
                  {playlist?.themeName ?? "Playlist"}
                </Text>
                <Text className="mt-2 text-sm text-[#8FA8A8]">
                  {playlist?.tracks.length ?? 0} track
                  {(playlist?.tracks.length ?? 0) !== 1 ? "s" : ""}
                </Text>
              </View>

              {/* Playlist Link */}
              {playlist?.playlistUrl && (
                <Pressable
                  onPress={handleOpenPlaylist}
                  className="mb-4 flex-row items-center justify-center gap-2 rounded-xl border border-[#1DB954]/30 bg-[#1DB954]/10 py-3 active:bg-[#1DB954]/20"
                >
                  <ExternalLink size={18} color="#1DB954" />
                  <Text className="font-semibold text-[#1DB954]">
                    Open in Spotify
                  </Text>
                </Pressable>
              )}
            </View>
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-[#164B49]">
                <ListMusic size={28} color="#8FA8A8" />
              </View>
              <Text className="text-base text-[#8FA8A8]">
                No tracks in this playlist yet
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </GradientBackground>
  );
}
