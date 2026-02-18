import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import { trpc } from "~/utils/api";

function NumberStepper({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-3">
      <Text className="text-base font-medium text-[#DCE4E4]">{label}</Text>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-9 w-9 items-center justify-center rounded-lg bg-[#164B49] active:bg-[#21716C]"
          style={value <= min ? { opacity: 0.4 } : undefined}
        >
          <ChevronDown size={20} color="#DCE4E4" />
        </Pressable>
        <Text className="w-8 text-center text-lg font-bold text-[#50C878]">
          {value}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="h-9 w-9 items-center justify-center rounded-lg bg-[#164B49] active:bg-[#21716C]"
          style={value >= max ? { opacity: 0.4 } : undefined}
        >
          <ChevronUp size={20} color="#DCE4E4" />
        </Pressable>
      </View>
    </View>
  );
}

export default function CreateLeague() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [songsPerRound, setSongsPerRound] = useState(1);
  const [upvotePoints, setUpvotePoints] = useState(10);
  const [allowDownvotes, setAllowDownvotes] = useState(false);

  const createMutation = useMutation(
    trpc.musicLeague.createLeague.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getAllLeagues.queryFilter(),
        );
        router.replace(`/music/league/${data.id}` as never);
      },
      onError: (error) => {
        Alert.alert("Failed to create league", error.message);
      },
    }),
  );

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter a league name.");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      songsPerRound,
      upvotePointsPerRound: upvotePoints,
      allowDownvotes,
    });
  };

  return (
    <GradientBackground>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4">
          <Pressable onPress={() => router.back()} className="rounded-full bg-[#164B49] p-2">
            <ArrowLeft color="#DCE4E4" size={24} />
          </Pressable>
          <Text className="text-xl font-bold text-[#DCE4E4]">
            Create League
          </Text>
          <View className="w-10" />
        </View>

        <View style={{ flex: 1, backgroundColor: 'rgba(255,0,0,0.2)' }}>
          <View style={{ backgroundColor: 'blue', padding: 10, margin: 10 }}>
            <Text className="text-white font-bold">DEBUG: Form should be below</Text>
          </View>
        <FlatList
          data={[{ key: 'form' }]}
          renderItem={() => null}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          ListHeaderComponent={
            <View>
              {/* Name */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
                  League Name *
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Friday Vibes"
                  placeholderTextColor="#8FA8A8"
                  maxLength={100}
                  className="rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-3 text-base text-[#DCE4E4]"
                />
              </View>

              {/* Description */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What's this league about?"
                  placeholderTextColor="#8FA8A8"
                  maxLength={500}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="min-h-[80px] rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-3 text-base text-[#DCE4E4]"
                />
              </View>

              {/* Settings */}
              <Text className="mb-3 text-lg font-bold text-[#DCE4E4]">
                Settings
              </Text>

              <View className="mb-4 gap-3">
                <NumberStepper
                  label="Songs per round"
                  value={songsPerRound}
                  onChange={setSongsPerRound}
                  min={1}
                  max={5}
                />

                <NumberStepper
                  label="Upvote points per round"
                  value={upvotePoints}
                  onChange={setUpvotePoints}
                  min={1}
                  max={20}
                />

                {/* Allow Downvotes Toggle */}
                <View className="flex-row items-center justify-between rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-3">
                  <View className="flex-1">
                    <Text className="text-base font-medium text-[#DCE4E4]">
                      Allow downvotes
                    </Text>
                    <Text className="mt-0.5 text-xs text-[#8FA8A8]">
                      Members can spend points to downvote songs
                    </Text>
                  </View>
                  <Switch
                    value={allowDownvotes}
                    onValueChange={setAllowDownvotes}
                    trackColor={{ false: "#164B49", true: "#50C878" }}
                    thumbColor={allowDownvotes ? "#0A1A1A" : "#8FA8A8"}
                  />
                </View>
              </View>

              {/* Create Button */}
              <Pressable
                onPress={handleCreate}
                disabled={createMutation.isPending || !name.trim()}
                className="mt-4 mb-8 items-center rounded-xl bg-[#50C878] py-4 active:bg-[#66D99A]"
                style={
                  createMutation.isPending || !name.trim()
                    ? { opacity: 0.5 }
                    : undefined
                }
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#0A1A1A" />
                ) : (
                  <Text className="text-lg font-bold text-[#0A1A1A]">
                    Create League
                  </Text>
                )}
              </Pressable>
            </View>
          }
        />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}
