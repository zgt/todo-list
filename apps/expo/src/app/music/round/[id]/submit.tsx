import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, X } from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import { AudioPreviewPlayer } from "~/components/music/AudioPreviewPlayer";
import { SpotifyTrackCard } from "~/components/music/SpotifyTrackCard";
import { trpc } from "~/utils/api";

interface SpotifyTrack {
  spotifyTrackId: string;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArtUrl: string | null;
  previewUrl: string | null;
  trackDurationMs: number;
}

export default function SubmitSong() {
  const { id: roundId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(searchText.trim());
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchText]);

  // Spotify search query
  const {
    data: searchResults,
    isLoading: isSearching,
    isFetching,
  } = useQuery(
    trpc.musicLeague.searchSpotify.queryOptions(
      { query: debouncedQuery, limit: 10 },
      { enabled: debouncedQuery.length > 0 },
    ),
  );

  // Get round info for context
  const { data: round } = useQuery(
    trpc.musicLeague.getRoundById.queryOptions(
      { roundId },
      { enabled: !!roundId },
    ),
  );

  // Submit mutation
  const submitMutation = useMutation(
    trpc.musicLeague.createSubmission.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.musicLeague.getAllLeagues.queryFilter(),
        );
        Alert.alert("Submitted!", "Your song has been submitted.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      },
      onError: (error) => {
        Alert.alert("Submission failed", error.message);
      },
    }),
  );

  const handleSubmit = () => {
    if (!selectedTrack) return;

    submitMutation.mutate({
      roundId,
      spotifyTrackId: selectedTrack.spotifyTrackId,
      trackName: selectedTrack.trackName,
      artistName: selectedTrack.artistName,
      albumName: selectedTrack.albumName,
      albumArtUrl: selectedTrack.albumArtUrl ?? "",
      previewUrl: selectedTrack.previewUrl,
      trackDurationMs: selectedTrack.trackDurationMs,
    });
  };

  const handleSelectTrack = useCallback((track: SpotifyTrack) => {
    setSelectedTrack(track);
  }, []);

  const handleClearSelection = () => {
    setSelectedTrack(null);
  };

  const renderSearchResult = useCallback(
    ({ item }: { item: SpotifyTrack }) => (
      <SpotifyTrackCard
        trackName={item.trackName}
        artistName={item.artistName}
        albumName={item.albumName}
        albumArtUrl={item.albumArtUrl}
        spotifyTrackId={item.spotifyTrackId}
        trackDurationMs={item.trackDurationMs}
        showSpotifyLink={false}
        onPress={() => handleSelectTrack(item)}
        selected={selectedTrack?.spotifyTrackId === item.spotifyTrackId}
      />
    ),
    [handleSelectTrack, selectedTrack?.spotifyTrackId],
  );

  const mySubmissionCount =
    round?.submissions.filter((s: { isOwn: boolean }) => s.isOwn).length ?? 0;
  const maxSongs = round?.songsPerRound ?? 1;
  const remainingSlots = maxSongs - mySubmissionCount;

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
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
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#DCE4E4",
                }}
              >
                Submit a Song
              </Text>
              {round && (
                <Text
                  style={{
                    fontSize: 12,
                    color: "#8FA8A8",
                    marginTop: 2,
                  }}
                >
                  {round.themeName} · {remainingSlots} of {maxSongs} remaining
                </Text>
              )}
            </View>
          </View>

          {/* Search Input */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#164B49",
                backgroundColor: "#102A2A",
                paddingHorizontal: 12,
              }}
            >
              <Search size={18} color="#8FA8A8" />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search Spotify..."
                placeholderTextColor="#8FA8A8"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingLeft: 8,
                  fontSize: 16,
                  color: "#DCE4E4",
                }}
              />
              {searchText.length > 0 && (
                <Pressable
                  onPress={() => {
                    setSearchText("");
                    setDebouncedQuery("");
                  }}
                  hitSlop={8}
                >
                  <X size={18} color="#8FA8A8" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Selected Track Preview */}
          {selectedTrack && (
            <View
              style={{
                marginHorizontal: 16,
                marginBottom: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#50C878",
                backgroundColor: "#102A2A",
                padding: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#50C878",
                    textTransform: "uppercase",
                  }}
                >
                  Selected Track
                </Text>
                <Pressable onPress={handleClearSelection} hitSlop={8}>
                  <X size={16} color="#8FA8A8" />
                </Pressable>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                {/* Larger album art */}
                {selectedTrack.albumArtUrl ? (
                  <Image
                    source={{ uri: selectedTrack.albumArtUrl }}
                    style={{ width: 120, height: 120, borderRadius: 8 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 8,
                      backgroundColor: "#0A1A1A",
                    }}
                  />
                )}

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: "#DCE4E4",
                    }}
                    numberOfLines={2}
                  >
                    {selectedTrack.trackName}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#8FA8A8",
                      marginTop: 4,
                    }}
                    numberOfLines={1}
                  >
                    {selectedTrack.artistName}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#8FA8A8",
                    }}
                    numberOfLines={1}
                  >
                    {selectedTrack.albumName}
                  </Text>
                </View>
              </View>

              {/* Audio Preview */}
              {selectedTrack.previewUrl && (
                <AudioPreviewPlayer previewUrl={selectedTrack.previewUrl} />
              )}

              {/* Submit Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={submitMutation.isPending || remainingSlots <= 0}
                style={{
                  marginTop: 16,
                  alignItems: "center",
                  borderRadius: 8,
                  backgroundColor: "#50C878",
                  paddingVertical: 12,
                  opacity:
                    submitMutation.isPending || remainingSlots <= 0 ? 0.5 : 1,
                }}
                accessibilityLabel="Submit song"
                accessibilityRole="button"
              >
                {submitMutation.isPending ? (
                  <ActivityIndicator color="#0A1A1A" size="small" />
                ) : (
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#0A1A1A",
                    }}
                  >
                    {remainingSlots <= 0
                      ? "Submission limit reached"
                      : "Submit Song"}
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Search Results */}
          <FlatList
            data={(searchResults as SpotifyTrack[] | undefined) ?? []}
            keyExtractor={(item) => item.spotifyTrackId}
            renderItem={renderSearchResult}
            contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              debouncedQuery.length > 0 ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: "#8FA8A8",
                    }}
                  >
                    {isSearching || isFetching
                      ? "Searching..."
                      : searchResults && searchResults.length > 0
                        ? `${searchResults.length} results`
                        : "No results found"}
                  </Text>
                  {(isSearching || isFetching) && (
                    <ActivityIndicator size="small" color="#50C878" />
                  )}
                </View>
              ) : null
            }
            ListEmptyComponent={
              debouncedQuery.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 64 }}>
                  <Search size={48} color="#8FA8A8" />
                  <Text
                    style={{
                      marginTop: 16,
                      textAlign: "center",
                      fontSize: 16,
                      color: "#8FA8A8",
                    }}
                  >
                    Search for a song to submit
                  </Text>
                  {round && (
                    <Text
                      style={{
                        marginTop: 4,
                        textAlign: "center",
                        fontSize: 14,
                        color: "#8FA8A8",
                      }}
                    >
                      Theme: {round.themeName}
                    </Text>
                  )}
                </View>
              ) : null
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}
