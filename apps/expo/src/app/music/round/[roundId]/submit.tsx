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

import { AudioPreviewPlayer } from "~/components/music/AudioPreviewPlayer";
import { SpotifyTrackCard } from "~/components/music/SpotifyTrackCard";
import { GradientBackground } from "~/components/GradientBackground";
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
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
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
      { query: debouncedQuery, limit: 15 },
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
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          {/* Header */}
          <View className="flex-row items-center gap-3 px-4 py-4">
            <Pressable
              onPress={() => router.back()}
              className="rounded-full bg-[#164B49] p-2"
            >
              <ArrowLeft color="#DCE4E4" size={24} />
            </Pressable>
            <View className="flex-1">
              <Text className="text-xl font-bold text-[#DCE4E4]">
                Submit a Song
              </Text>
              {round && (
                <Text className="text-xs text-[#8FA8A8]">
                  {round.themeName} &middot; {remainingSlots} of {maxSongs}{" "}
                  remaining
                </Text>
              )}
            </View>
          </View>

          {/* Search Input */}
          <View className="px-4 pb-3">
            <View className="flex-row items-center rounded-xl border border-[#164B49] bg-[#102A2A] px-3">
              <Search size={18} color="#8FA8A8" />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search Spotify..."
                placeholderTextColor="#8FA8A8"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                className="flex-1 py-3 pl-2 text-base text-[#DCE4E4]"
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
            <View className="mx-4 mb-3 rounded-xl border border-[#50C878] bg-[#102A2A] p-4">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-bold uppercase text-[#50C878]">
                  Selected Track
                </Text>
                <Pressable onPress={handleClearSelection} hitSlop={8}>
                  <X size={16} color="#8FA8A8" />
                </Pressable>
              </View>

              <View className="flex-row items-center gap-4">
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

                <View className="flex-1">
                  <Text
                    className="text-lg font-bold text-[#DCE4E4]"
                    numberOfLines={2}
                  >
                    {selectedTrack.trackName}
                  </Text>
                  <Text
                    className="mt-1 text-sm text-[#8FA8A8]"
                    numberOfLines={1}
                  >
                    {selectedTrack.artistName}
                  </Text>
                  <Text
                    className="text-xs text-[#8FA8A8]"
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
                className="mt-4 items-center rounded-lg bg-[#50C878] py-3 active:bg-[#66D99A]"
                style={
                  submitMutation.isPending || remainingSlots <= 0
                    ? { opacity: 0.5 }
                    : undefined
                }
              >
                {submitMutation.isPending ? (
                  <ActivityIndicator color="#0A1A1A" size="small" />
                ) : (
                  <Text className="text-base font-bold text-[#0A1A1A]">
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
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-[#8FA8A8]">
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
                <View className="items-center py-16">
                  <Search size={48} color="#164B49" />
                  <Text className="mt-4 text-center text-base text-[#8FA8A8]">
                    Search for a song to submit
                  </Text>
                  {round && (
                    <Text className="mt-1 text-center text-sm text-[#8FA8A8]">
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
