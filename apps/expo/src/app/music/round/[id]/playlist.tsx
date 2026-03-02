import { useCallback, useRef, useState } from "react";
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
    triggerRipple();
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch, triggerRipple]);

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
        <SafeAreaView
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Stack.Screen options={{ headerShown: false }} />
          <ActivityIndicator size="large" color="#50C878" />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground rippleTrigger={rippleTrigger}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              borderRadius: 9999,
              backgroundColor: "#164B49",
              padding: 8,
            }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ArrowLeft color="#DCE4E4" size={24} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#DCE4E4" }}>
              Playlist
            </Text>
            {playlist && (
              <Text style={{ fontSize: 12, color: "#8FA8A8" }}>
                Round {playlist.roundNumber}
              </Text>
            )}
          </View>
          <View style={{ width: 40 }} />
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
            <View style={{ marginBottom: 16 }}>
              {/* Theme & Track Count */}
              <View
                style={{
                  marginBottom: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#164B49",
                  backgroundColor: "#102A2A",
                  padding: 16,
                }}
              >
                <Text
                  style={{
                    marginBottom: 4,
                    fontSize: 12,
                    fontWeight: "700",
                    letterSpacing: 0.5,
                    color: "#50C878",
                    textTransform: "uppercase",
                  }}
                >
                  Theme
                </Text>
                <Text
                  style={{ fontSize: 24, fontWeight: "700", color: "#DCE4E4" }}
                >
                  {playlist?.themeName ?? "Playlist"}
                </Text>
                <Text style={{ marginTop: 8, fontSize: 14, color: "#8FA8A8" }}>
                  {playlist?.tracks.length ?? 0} track
                  {(playlist?.tracks.length ?? 0) !== 1 ? "s" : ""}
                </Text>
              </View>

              {/* Playlist Link */}
              {playlist?.playlistUrl && (
                <Pressable
                  onPress={handleOpenPlaylist}
                  style={{
                    marginBottom: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(29, 185, 84, 0.3)",
                    backgroundColor: "rgba(29, 185, 84, 0.1)",
                    paddingVertical: 12,
                  }}
                  accessibilityLabel="Open playlist in Spotify"
                  accessibilityRole="link"
                >
                  <ExternalLink size={18} color="#1DB954" />
                  <Text
                    style={{
                      fontWeight: "600",
                      color: "#1DB954",
                    }}
                  >
                    Open in Spotify
                  </Text>
                </Pressable>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 64 }}>
              <View
                style={{
                  marginBottom: 16,
                  width: 64,
                  height: 64,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 9999,
                  backgroundColor: "#164B49",
                }}
              >
                <ListMusic size={28} color="#8FA8A8" />
              </View>
              <Text style={{ fontSize: 16, color: "#8FA8A8" }}>
                No tracks in this playlist yet
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </GradientBackground>
  );
}
