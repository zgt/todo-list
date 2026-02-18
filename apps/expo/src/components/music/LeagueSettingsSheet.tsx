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

import { trpc } from "~/utils/api";

export interface LeagueSettingsSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface LeagueSettings {
  leagueId: string;
  name: string;
  description: string | null;
  songsPerRound: number;
  upvotePointsPerRound: number;
  allowDownvotes: boolean;
}

function SettingsStepper({
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
    <View className="flex-row items-center justify-between rounded-xl border border-[#164B49] bg-[#0A1A1A] px-4 py-3">
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

export const LeagueSettingsSheet = forwardRef<
  LeagueSettingsSheetRef,
  LeagueSettings
>(
  (
    {
      leagueId,
      name,
      description,
      songsPerRound,
      upvotePointsPerRound,
      allowDownvotes,
    },
    ref,
  ) => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const queryClient = useQueryClient();

    const [editName, setEditName] = useState(name);
    const [editDescription, setEditDescription] = useState(description ?? "");
    const [editSongsPerRound, setEditSongsPerRound] = useState(songsPerRound);
    const [editUpvotePoints, setEditUpvotePoints] =
      useState(upvotePointsPerRound);
    const [editAllowDownvotes, setEditAllowDownvotes] =
      useState(allowDownvotes);

    const snapPoints = useMemo(() => ["75%"], []);

    const updateMutation = useMutation(
      trpc.musicLeague.updateLeagueSettings.mutationOptions({}),
    );

    const resetToProps = useCallback(() => {
      setEditName(name);
      setEditDescription(description ?? "");
      setEditSongsPerRound(songsPerRound);
      setEditUpvotePoints(upvotePointsPerRound);
      setEditAllowDownvotes(allowDownvotes);
    }, [
      name,
      description,
      songsPerRound,
      upvotePointsPerRound,
      allowDownvotes,
    ]);

    useImperativeHandle(ref, () => ({
      present: () => {
        resetToProps();
        bottomSheetRef.current?.present();
      },
      dismiss: () => bottomSheetRef.current?.dismiss(),
    }));

    const handleSave = () => {
      if (!editName.trim()) {
        Alert.alert("Name required", "Please enter a league name.");
        return;
      }
      updateMutation.mutate(
        {
          leagueId,
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          songsPerRound: editSongsPerRound,
          upvotePointsPerRound: editUpvotePoints,
          allowDownvotes: editAllowDownvotes,
        },
        {
          onSuccess: () => {
            void queryClient.invalidateQueries(
              trpc.musicLeague.getLeagueById.queryFilter(),
            );
            bottomSheetRef.current?.dismiss();
          },
          onError: (error) => {
            Alert.alert("Failed to save", error.message);
          },
        },
      );
    };

    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: "#102A2A" }}
        handleIndicatorStyle={{ backgroundColor: "#8FA8A8" }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          <Text className="mb-6 text-xl font-bold text-[#DCE4E4]">
            League Settings
          </Text>

          {/* Name */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
              League Name
            </Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="League name"
              placeholderTextColor="#8FA8A8"
              maxLength={100}
              className="rounded-xl border border-[#164B49] bg-[#0A1A1A] px-4 py-3 text-base text-[#DCE4E4]"
            />
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
              Description
            </Text>
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="What's this league about?"
              placeholderTextColor="#8FA8A8"
              maxLength={500}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="min-h-[80px] rounded-xl border border-[#164B49] bg-[#0A1A1A] px-4 py-3 text-base text-[#DCE4E4]"
            />
          </View>

          {/* Settings */}
          <Text className="mb-3 text-lg font-bold text-[#DCE4E4]">
            Settings
          </Text>

          <View className="mb-6 gap-3">
            <SettingsStepper
              label="Songs per round"
              value={editSongsPerRound}
              onChange={setEditSongsPerRound}
              min={1}
              max={5}
            />

            <SettingsStepper
              label="Upvote points"
              value={editUpvotePoints}
              onChange={setEditUpvotePoints}
              min={1}
              max={20}
            />

            <View className="flex-row items-center justify-between rounded-xl border border-[#164B49] bg-[#0A1A1A] px-4 py-3">
              <View className="flex-1">
                <Text className="text-base font-medium text-[#DCE4E4]">
                  Allow downvotes
                </Text>
                <Text className="mt-0.5 text-xs text-[#8FA8A8]">
                  Members can spend points to downvote songs
                </Text>
              </View>
              <Switch
                value={editAllowDownvotes}
                onValueChange={setEditAllowDownvotes}
                trackColor={{ false: "#164B49", true: "#50C878" }}
                thumbColor={editAllowDownvotes ? "#0A1A1A" : "#8FA8A8"}
              />
            </View>
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            disabled={updateMutation.isPending || !editName.trim()}
            className="items-center rounded-xl bg-[#50C878] py-4 active:bg-[#66D99A]"
            style={
              updateMutation.isPending || !editName.trim()
                ? { opacity: 0.5 }
                : undefined
            }
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#0A1A1A" />
            ) : (
              <Text className="text-lg font-bold text-[#0A1A1A]">
                Save Changes
              </Text>
            )}
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

LeagueSettingsSheet.displayName = "LeagueSettingsSheet";
