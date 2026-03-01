import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useRouter } from "expo-router";

import { trpc } from "~/utils/api";

export interface CreateLeagueSheetRef {
  present: () => void;
  dismiss: () => void;
}

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
    <View className="flex-row items-center justify-between rounded-2xl border border-[#164B49] bg-[#102A2A] px-4 py-3">
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

const SUBMISSION_WINDOW_PRESETS = [
  { label: "1 day", days: 1 },
  { label: "2 days", days: 2 },
  { label: "3 days", days: 3 },
  { label: "5 days", days: 5 },
  { label: "1 week", days: 7 },
];

const VOTING_WINDOW_PRESETS = [
  { label: "1 day", days: 1 },
  { label: "2 days", days: 2 },
  { label: "3 days", days: 3 },
  { label: "5 days", days: 5 },
];

export const CreateLeagueSheet = forwardRef<CreateLeagueSheetRef>(
  (_, ref) => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const router = useRouter();
    const queryClient = useQueryClient();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [songsPerRound, setSongsPerRound] = useState(1);
    const [upvotePoints, setUpvotePoints] = useState(5);
    const [allowDownvotes, setAllowDownvotes] = useState(false);
    const [downvotePoints, setDownvotePoints] = useState(3);
    const [submissionWindowDays, setSubmissionWindowDays] = useState(3);
    const [votingWindowDays, setVotingWindowDays] = useState(2);

    const snapPoints = useMemo(() => ["90%"], []);

    const resetForm = useCallback(() => {
      setName("");
      setDescription("");
      setSongsPerRound(1);
      setUpvotePoints(5);
      setAllowDownvotes(false);
      setDownvotePoints(3);
      setSubmissionWindowDays(3);
      setVotingWindowDays(2);
    }, []);

    useImperativeHandle(ref, () => ({
      present: () => {
        resetForm();
        bottomSheetRef.current?.present();
      },
      dismiss: () => bottomSheetRef.current?.dismiss(),
    }));

    const createMutation = useMutation(
      trpc.musicLeague.createLeague.mutationOptions({
        onSuccess: async (data) => {
          await queryClient.invalidateQueries(
            trpc.musicLeague.getAllLeagues.queryFilter(),
          );
          bottomSheetRef.current?.dismiss();
          router.push(`/music/league/${data.id}` as never);
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
        submissionWindowDays,
        votingWindowDays,
        downvotePointsPerRound: downvotePoints,
      });
    };

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.6}
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: "#102A2A", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: "#8FA8A8", width: 40 }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-6 text-xl font-bold text-[#DCE4E4]">
            Create League
          </Text>

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
              className="rounded-2xl border border-[#164B49] bg-[#0A1A1A] px-4 text-[#DCE4E4]"
              style={{ fontSize: 16, height: 48, textAlignVertical: "center" }}
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
              className="rounded-2xl border border-[#164B49] bg-[#0A1A1A] px-4 text-[#DCE4E4]"
              style={{ fontSize: 16, minHeight: 80, paddingVertical: 12, textAlignVertical: "top" }}
            />
          </View>

          {/* Round Windows */}
          <Text className="mb-3 text-lg font-bold text-[#DCE4E4]">
            Round Windows
          </Text>

          {/* Submission Window Presets */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
              Submission window
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SUBMISSION_WINDOW_PRESETS.map((preset) => (
                <Pressable
                  key={preset.days}
                  onPress={() => setSubmissionWindowDays(preset.days)}
                  className={`rounded-full px-4 py-2 ${
                    submissionWindowDays === preset.days
                      ? "border border-[#50C878] bg-[#50C878]/20"
                      : "border border-[#164B49] bg-[#0A1A1A]"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      submissionWindowDays === preset.days
                        ? "text-[#50C878]"
                        : "text-[#8FA8A8]"
                    }`}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Voting Window Presets */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
              Voting window (after submissions close)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {VOTING_WINDOW_PRESETS.map((preset) => (
                <Pressable
                  key={preset.days}
                  onPress={() => setVotingWindowDays(preset.days)}
                  className={`rounded-full px-4 py-2 ${
                    votingWindowDays === preset.days
                      ? "border border-[#50C878] bg-[#50C878]/20"
                      : "border border-[#164B49] bg-[#0A1A1A]"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      votingWindowDays === preset.days
                        ? "text-[#50C878]"
                        : "text-[#8FA8A8]"
                    }`}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              ))}
            </View>
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
            <View className="flex-row items-center justify-between rounded-2xl border border-[#164B49] bg-[#102A2A] px-4 py-3">
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

            {/* Downvote Points (only when downvotes enabled) */}
            {allowDownvotes && (
              <NumberStepper
                label="Downvote points per round"
                value={downvotePoints}
                onChange={setDownvotePoints}
                min={1}
                max={10}
              />
            )}
          </View>

          {/* Create Button */}
          <Pressable
            onPress={handleCreate}
            disabled={createMutation.isPending || !name.trim()}
            style={{
              alignItems: "center",
              borderRadius: 16,
              backgroundColor: "#50C878",
              paddingVertical: 16,
              marginTop: 16,
              opacity: createMutation.isPending || !name.trim() ? 0.5 : 1,
            }}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#0A1A1A" />
            ) : (
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#0A1A1A",
                }}
              >
                Create League
              </Text>
            )}
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

CreateLeagueSheet.displayName = "CreateLeagueSheet";
