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
  Modal,
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
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react-native";

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
  downvotePointsPerRound: number;
  submissionWindowDays: number;
  votingWindowDays: number;
  isOwner?: boolean;
  onDeleteLeague?: () => void;
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

function DeleteConfirmModal({
  visible,
  leagueName,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  visible: boolean;
  leagueName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View className="w-full max-w-sm rounded-2xl border border-[#164B49] bg-[#102A2A] p-6">
          {/* Warning Icon */}
          <View className="mb-4 items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
              <AlertTriangle size={28} color="#ef4444" />
            </View>
          </View>

          {/* Title */}
          <Text className="mb-2 text-center text-lg font-bold text-[#DCE4E4]">
            Delete League
          </Text>

          {/* Description */}
          <Text className="mb-1 text-center text-sm text-[#8FA8A8]">
            Are you sure you want to delete
          </Text>
          <Text className="mb-3 text-center text-base font-semibold text-[#50C878]">
            {leagueName}
          </Text>
          <Text className="mb-6 text-center text-sm text-[#8FA8A8]">
            This will permanently delete all rounds, submissions, and votes.
            This action cannot be undone.
          </Text>

          {/* Buttons */}
          <View className="gap-3">
            <Pressable
              onPress={onConfirm}
              disabled={isDeleting}
              className="items-center rounded-xl bg-red-500 py-3.5 active:bg-red-600"
              style={isDeleting ? { opacity: 0.6 } : undefined}
            >
              {isDeleting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-bold text-white">
                  Delete League
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={onCancel}
              disabled={isDeleting}
              className="items-center rounded-xl border border-[#164B49] py-3.5 active:bg-[#164B49]/50"
            >
              <Text className="text-base font-medium text-[#DCE4E4]">
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
      downvotePointsPerRound,
      submissionWindowDays,
      votingWindowDays,
      isOwner,
      onDeleteLeague,
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
    const [editDownvotePoints, setEditDownvotePoints] = useState(
      downvotePointsPerRound,
    );
    const [editSubmissionWindowDays, setEditSubmissionWindowDays] =
      useState(submissionWindowDays);
    const [editVotingWindowDays, setEditVotingWindowDays] =
      useState(votingWindowDays);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const snapPoints = useMemo(() => ["85%"], []);

    const updateMutation = useMutation(
      trpc.musicLeague.updateLeagueSettings.mutationOptions({}),
    );

    const resetToProps = useCallback(() => {
      setEditName(name);
      setEditDescription(description ?? "");
      setEditSongsPerRound(songsPerRound);
      setEditUpvotePoints(upvotePointsPerRound);
      setEditAllowDownvotes(allowDownvotes);
      setEditDownvotePoints(downvotePointsPerRound);
      setEditSubmissionWindowDays(submissionWindowDays);
      setEditVotingWindowDays(votingWindowDays);
    }, [
      name,
      description,
      songsPerRound,
      upvotePointsPerRound,
      allowDownvotes,
      downvotePointsPerRound,
      submissionWindowDays,
      votingWindowDays,
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
          downvotePointsPerRound: editDownvotePoints,
          submissionWindowDays: editSubmissionWindowDays,
          votingWindowDays: editVotingWindowDays,
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

    const handleDeleteConfirm = () => {
      setIsDeleting(true);
      onDeleteLeague?.();
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
      <>
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
                    onPress={() => setEditSubmissionWindowDays(preset.days)}
                    className={`rounded-full px-4 py-2 ${
                      editSubmissionWindowDays === preset.days
                        ? "border border-[#50C878] bg-[#50C878]/20"
                        : "border border-[#164B49] bg-[#0A1A1A]"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        editSubmissionWindowDays === preset.days
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
                    onPress={() => setEditVotingWindowDays(preset.days)}
                    className={`rounded-full px-4 py-2 ${
                      editVotingWindowDays === preset.days
                        ? "border border-[#50C878] bg-[#50C878]/20"
                        : "border border-[#164B49] bg-[#0A1A1A]"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        editVotingWindowDays === preset.days
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

              {editAllowDownvotes && (
                <SettingsStepper
                  label="Downvote points"
                  value={editDownvotePoints}
                  onChange={setEditDownvotePoints}
                  min={1}
                  max={10}
                />
              )}
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              disabled={updateMutation.isPending || !editName.trim()}
              style={{
                alignItems: "center",
                borderRadius: 12,
                backgroundColor: "#50C878",
                paddingVertical: 16,
                opacity: updateMutation.isPending || !editName.trim() ? 0.5 : 1,
              }}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator color="#0A1A1A" />
              ) : (
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#0A1A1A",
                  }}
                >
                  Save Changes
                </Text>
              )}
            </Pressable>

            {/* Delete League */}
            {isOwner && onDeleteLeague && (
              <Pressable
                onPress={() => setDeleteModalVisible(true)}
                className="mt-6 flex-row items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3 active:bg-red-500/20"
              >
                <Trash2 size={18} color="#ef4444" />
                <Text className="font-semibold text-red-400">
                  Delete League
                </Text>
              </Pressable>
            )}
          </BottomSheetScrollView>
        </BottomSheetModal>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          visible={deleteModalVisible}
          leagueName={name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModalVisible(false)}
          isDeleting={isDeleting}
        />
      </>
    );
  },
);

LeagueSettingsSheet.displayName = "LeagueSettingsSheet";
