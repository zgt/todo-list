import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Link as LinkIcon } from "lucide-react-native";

import { PHASE_LABELS } from "~/components/music/roundDetailTypes";
import { trpc } from "~/utils/api";

interface RoundAdminControlsProps {
  status: string;
  currentPlaylistUrl: string | null;
  roundId: string;
}

export function RoundAdminControls({
  status,
  currentPlaylistUrl,
  roundId,
}: RoundAdminControlsProps) {
  const queryClient = useQueryClient();
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [showPlaylistInput, setShowPlaylistInput] = useState(false);

  const canAdvance = status !== "COMPLETED";

  const advancePhaseMutation = useMutation(
    trpc.musicLeague.advanceRoundPhase.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.musicLeague.getLeagueById.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.musicLeague.getAllLeagues.queryFilter(),
        );
      },
      onError: (error) => {
        Alert.alert("Failed to advance phase", error.message);
      },
    }),
  );

  const setPlaylistUrlMutation = useMutation(
    trpc.musicLeague.setRoundPlaylistUrl.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getRoundById.queryFilter(),
        );
        setShowPlaylistInput(false);
        setPlaylistUrl("");
        Alert.alert("Saved", "Playlist URL has been set.");
      },
      onError: (error) => {
        Alert.alert("Failed to set playlist URL", error.message);
      },
    }),
  );

  const handleAdvancePhase = () => {
    const nextPhase = PHASE_LABELS[status] ?? "next phase";
    Alert.alert(
      "Advance Phase",
      `Are you sure you want to advance this round to "${nextPhase}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Advance",
          onPress: () => advancePhaseMutation.mutate({ roundId }),
        },
      ],
    );
  };

  const handleSetPlaylistUrl = () => {
    const url = playlistUrl.trim();
    if (!url) {
      Alert.alert("URL required", "Please enter a playlist URL.");
      return;
    }
    setPlaylistUrlMutation.mutate({ roundId, playlistUrl: url });
  };

  return (
    <View className="mb-6 gap-3">
      {/* Advance Phase */}
      {canAdvance && (
        <Pressable
          onPress={handleAdvancePhase}
          disabled={advancePhaseMutation.isPending}
          className="flex-row items-center justify-center gap-2 rounded-xl border py-3"
          style={({ pressed }) => [
            {
              borderColor: "rgba(80,200,120,0.3)",
              backgroundColor: pressed
                ? "rgba(80,200,120,0.2)"
                : "rgba(80,200,120,0.1)",
            },
            advancePhaseMutation.isPending && { opacity: 0.5 },
          ]}
        >
          {advancePhaseMutation.isPending ? (
            <ActivityIndicator color="#50C878" size="small" />
          ) : (
            <>
              <ChevronRight size={18} color="#50C878" />
              <Text className="font-semibold text-[#50C878]">
                Advance to {PHASE_LABELS[status] ?? "Next"}
              </Text>
            </>
          )}
        </Pressable>
      )}

      {/* Set Playlist URL */}
      {!showPlaylistInput ? (
        <Pressable
          onPress={() => setShowPlaylistInput(true)}
          className="flex-row items-center justify-center gap-2 rounded-xl border border-[#164B49] bg-[#102A2A] py-3 active:bg-[#164B49]"
        >
          <LinkIcon size={16} color="#8FA8A8" />
          <Text className="font-medium text-[#8FA8A8]">
            {currentPlaylistUrl ? "Update Playlist URL" : "Set Playlist URL"}
          </Text>
        </Pressable>
      ) : (
        <View className="gap-2 rounded-xl border border-[#164B49] bg-[#102A2A] p-3">
          <TextInput
            value={playlistUrl}
            onChangeText={setPlaylistUrl}
            placeholder="https://open.spotify.com/playlist/..."
            placeholderTextColor="#8FA8A8"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            className="rounded-lg border border-[#164B49] bg-[#0A1A1A] px-3 py-2.5 text-sm text-[#DCE4E4]"
          />
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => {
                setShowPlaylistInput(false);
                setPlaylistUrl("");
              }}
              className="flex-1 items-center rounded-lg border border-[#164B49] py-2.5 active:bg-[#164B49]"
            >
              <Text className="text-sm font-medium text-[#8FA8A8]">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSetPlaylistUrl}
              disabled={setPlaylistUrlMutation.isPending || !playlistUrl.trim()}
              className="flex-1 items-center rounded-lg bg-[#50C878] py-2.5 active:bg-[#66D99A]"
              style={
                setPlaylistUrlMutation.isPending || !playlistUrl.trim()
                  ? { opacity: 0.5 }
                  : undefined
              }
            >
              {setPlaylistUrlMutation.isPending ? (
                <ActivityIndicator color="#0A1A1A" size="small" />
              ) : (
                <Text className="text-sm font-bold text-[#0A1A1A]">Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Show current playlist URL if set */}
      {currentPlaylistUrl && !showPlaylistInput && (
        <View
          className="rounded-lg border px-3 py-2"
          style={{
            borderColor: "rgba(22,75,73,0.5)",
            backgroundColor: "rgba(10,26,26,0.5)",
          }}
        >
          <Text className="text-xs text-[#8FA8A8]">Current playlist:</Text>
          <Text className="text-xs text-[#50C878]" numberOfLines={1}>
            {currentPlaylistUrl}
          </Text>
        </View>
      )}
    </View>
  );
}
