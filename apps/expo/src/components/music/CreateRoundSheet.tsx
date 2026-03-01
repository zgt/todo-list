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
  Text,
  TextInput,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Info, Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";

import type { ThemeTemplatePickerRef } from "~/components/music/ThemeTemplatePicker";
import { ThemeTemplatePicker } from "~/components/music/ThemeTemplatePicker";
import { trpc } from "~/utils/api";

export interface CreateRoundSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface CreateRoundSheetProps {
  leagueId: string;
}

export const CreateRoundSheet = forwardRef<
  CreateRoundSheetRef,
  CreateRoundSheetProps
>(({ leagueId }, ref) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const themePickerRef = useRef<ThemeTemplatePickerRef>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [themeName, setThemeName] = useState("");
  const [themeDescription, setThemeDescription] = useState("");

  const snapPoints = useMemo(() => ["90%"], []);

  const { data: league } = useQuery(
    trpc.musicLeague.getLeagueById.queryOptions(
      { id: leagueId },
      { enabled: !!leagueId },
    ),
  );

  const hasUnfinishedRound = league?.rounds.some(
    (r: { status: string }) =>
      r.status !== "COMPLETED" && r.status !== "PENDING",
  );

  const resetForm = useCallback(() => {
    setThemeName("");
    setThemeDescription("");
  }, []);

  useImperativeHandle(ref, () => ({
    present: () => {
      resetForm();
      bottomSheetRef.current?.present();
    },
    dismiss: () => bottomSheetRef.current?.dismiss(),
  }));

  const createRoundMutation = useMutation(
    trpc.musicLeague.createRound.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getLeagueById.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.musicLeague.getAllLeagues.queryFilter(),
        );
        bottomSheetRef.current?.dismiss();
        if (data?.id) {
          router.push(`/music/round/${data.id}` as never);
        }
      },
      onError: (error) => {
        Alert.alert("Failed to create round", error.message);
      },
    }),
  );

  const handleCreate = () => {
    if (!themeName.trim()) {
      Alert.alert(
        "Theme required",
        "Please enter a theme name for the round.",
      );
      return;
    }
    if (!leagueId) {
      Alert.alert("Error", "Missing league ID.");
      return;
    }

    createRoundMutation.mutate({
      leagueId,
      themeName: themeName.trim(),
      themeDescription: themeDescription.trim() || undefined,
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
    <>
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: "#102A2A",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{ backgroundColor: "#8FA8A8", width: 40 }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-6 text-xl font-bold text-[#DCE4E4]">
            Create Round
          </Text>

          {/* Theme Name */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
              Theme Name *
            </Text>
            <TextInput
              value={themeName}
              onChangeText={setThemeName}
              placeholder="e.g. Songs That Define You"
              placeholderTextColor="#8FA8A8"
              maxLength={200}
              className="rounded-2xl border border-[#164B49] bg-[#0A1A1A] px-4 text-[#DCE4E4]"
              style={{
                fontSize: 16,
                height: 48,
                textAlignVertical: "center",
              }}
            />
          </View>

          {/* Browse Themes Button */}
          <Pressable
            onPress={() => themePickerRef.current?.present()}
            className="mb-4 flex-row items-center justify-center gap-2 rounded-2xl border border-[#164B49] bg-[#0A1A1A] py-3 active:bg-[#164B49]"
          >
            <Sparkles size={18} color="#50C878" />
            <Text className="font-semibold text-[#50C878]">
              Browse Themes
            </Text>
          </Pressable>

          {/* Theme Description */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium text-[#8FA8A8]">
              Description (optional)
            </Text>
            <TextInput
              value={themeDescription}
              onChangeText={setThemeDescription}
              placeholder="Add some context or rules for this round..."
              placeholderTextColor="#8FA8A8"
              maxLength={500}
              multiline
              numberOfLines={3}
              className="rounded-2xl border border-[#164B49] bg-[#0A1A1A] px-4 text-[#DCE4E4]"
              style={{
                fontSize: 16,
                minHeight: 80,
                paddingVertical: 12,
                textAlignVertical: "top",
              }}
            />
          </View>

          {/* League Defaults Summary */}
          <View className="mb-6 rounded-2xl border border-[#164B49] bg-[#0A1A1A]/60 p-4">
            <Text className="mb-3 text-sm font-bold text-[#DCE4E4]">
              Round Schedule
            </Text>
            {league ? (
              <>
                <View className="mb-2 flex-row items-center gap-2">
                  <Calendar size={14} color="#50C878" />
                  <Text className="text-sm text-[#8FA8A8]">
                    {league.submissionWindowDays} day
                    {league.submissionWindowDays !== 1 ? "s" : ""} for
                    submissions
                  </Text>
                </View>
                <View className="mb-2 flex-row items-center gap-2">
                  <Clock size={14} color="#50C878" />
                  <Text className="text-sm text-[#8FA8A8]">
                    {league.votingWindowDays} day
                    {league.votingWindowDays !== 1 ? "s" : ""} for voting
                  </Text>
                </View>
                {hasUnfinishedRound && (
                  <View className="mt-2 flex-row items-start gap-2 rounded-lg bg-[#FFA500]/10 p-3">
                    <Info
                      size={14}
                      color="#FFA500"
                      style={{ marginTop: 1 }}
                    />
                    <Text className="flex-1 text-xs text-[#FFA500]">
                      This round will start after the current round ends
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <ActivityIndicator size="small" color="#50C878" />
            )}
          </View>

          {/* Create Button */}
          <Pressable
            onPress={handleCreate}
            disabled={createRoundMutation.isPending || !themeName.trim()}
            style={{
              alignItems: "center",
              borderRadius: 16,
              backgroundColor: "#50C878",
              paddingVertical: 16,
              opacity:
                createRoundMutation.isPending || !themeName.trim() ? 0.5 : 1,
            }}
          >
            {createRoundMutation.isPending ? (
              <ActivityIndicator color="#0A1A1A" />
            ) : (
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#0A1A1A",
                }}
              >
                {hasUnfinishedRound ? "Queue Round" : "Create Round"}
              </Text>
            )}
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <ThemeTemplatePicker
        ref={themePickerRef}
        onSelectTheme={setThemeName}
      />
    </>
  );
});

CreateRoundSheet.displayName = "CreateRoundSheet";
