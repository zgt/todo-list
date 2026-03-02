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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, ShieldAlert } from "lucide-react-native";

import { trpc } from "~/utils/api";

export interface ReportSheetRef {
  present: (params: {
    contentType: "LEAGUE" | "SUBMISSION" | "TASK" | "USER" | "COMMENT" | "ROUND";
    contentId: string;
    contentLabel?: string;
    reportedUserId?: string;
  }) => void;
  dismiss: () => void;
}

const REASONS = [
  { key: "SPAM" as const, label: "Spam", description: "Unwanted or repetitive content" },
  { key: "OFFENSIVE" as const, label: "Offensive", description: "Inappropriate or harmful content" },
  { key: "HARASSMENT" as const, label: "Harassment", description: "Bullying or targeted abuse" },
  { key: "OTHER" as const, label: "Other", description: "Something else" },
];

export const ReportSheet = forwardRef<ReportSheetRef>((_, ref) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["70%"], []);
  const queryClient = useQueryClient();

  const [contentType, setContentType] = useState<
    "LEAGUE" | "SUBMISSION" | "TASK" | "USER" | "COMMENT" | "ROUND"
  >("LEAGUE");
  const [contentId, setContentId] = useState("");
  const [contentLabel, setContentLabel] = useState("");
  const [reportedUserId, setReportedUserId] = useState<string | undefined>();
  const [selectedReason, setSelectedReason] = useState<
    "SPAM" | "OFFENSIVE" | "HARASSMENT" | "OTHER" | null
  >(null);
  const [details, setDetails] = useState("");

  const resetForm = () => {
    setSelectedReason(null);
    setDetails("");
  };

  useImperativeHandle(ref, () => ({
    present: (params) => {
      resetForm();
      setContentType(params.contentType);
      setContentId(params.contentId);
      setContentLabel(params.contentLabel ?? "");
      setReportedUserId(params.reportedUserId);
      bottomSheetRef.current?.present();
    },
    dismiss: () => bottomSheetRef.current?.dismiss(),
  }));

  const reportMutation = useMutation(
    trpc.moderation.reportContent.mutationOptions({
      onSuccess: () => {
        bottomSheetRef.current?.dismiss();
        Alert.alert(
          "Report Submitted",
          "Thank you for helping keep our community safe. We'll review this report.",
        );
      },
      onError: (error) => {
        Alert.alert("Failed to submit report", error.message);
      },
    }),
  );

  const blockMutation = useMutation(
    trpc.moderation.blockUser.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.moderation.getBlockedUserIds.queryFilter(),
        );
        bottomSheetRef.current?.dismiss();
        Alert.alert(
          "User Blocked",
          "You won't see content from this user anymore.",
        );
      },
      onError: (error) => {
        Alert.alert("Failed to block user", error.message);
      },
    }),
  );

  const handleSubmitReport = () => {
    if (!selectedReason) {
      Alert.alert("Select a reason", "Please select a reason for your report.");
      return;
    }
    reportMutation.mutate({
      contentType,
      contentId,
      reportedUserId,
      reason: selectedReason,
      details: details.trim() || undefined,
    });
  };

  const handleBlockUser = () => {
    if (!reportedUserId) return;
    Alert.alert(
      "Block User",
      "You won't see this user's content. You can unblock them later in Settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => blockMutation.mutate({ blockedUserId: reportedUserId }),
        },
      ],
    );
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

  const isPending = reportMutation.isPending || blockMutation.isPending;

  return (
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
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Flag size={22} color="#ef4444" />
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#DCE4E4" }}>
              Report Content
            </Text>
            {contentLabel ? (
              <Text style={{ fontSize: 13, color: "#8FA8A8", marginTop: 2 }}>
                {contentLabel}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Reason Selection */}
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#8FA8A8", marginBottom: 10 }}>
          Why are you reporting this?
        </Text>
        <View style={{ gap: 8, marginBottom: 20 }}>
          {REASONS.map((reason) => (
            <Pressable
              key={reason.key}
              onPress={() => setSelectedReason(reason.key)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor:
                  selectedReason === reason.key ? "#50C878" : "#164B49",
                backgroundColor:
                  selectedReason === reason.key
                    ? "rgba(80, 200, 120, 0.1)"
                    : "transparent",
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor:
                    selectedReason === reason.key ? "#50C878" : "#164B49",
                  backgroundColor:
                    selectedReason === reason.key ? "#50C878" : "transparent",
                  marginRight: 12,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#DCE4E4" }}>
                  {reason.label}
                </Text>
                <Text style={{ fontSize: 12, color: "#8FA8A8", marginTop: 1 }}>
                  {reason.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Optional Details */}
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#8FA8A8", marginBottom: 8 }}>
          Additional details (optional)
        </Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          placeholder="Provide more context..."
          placeholderTextColor="#4B6B6B"
          multiline
          numberOfLines={3}
          maxLength={1000}
          style={{
            backgroundColor: "#0A1A1A",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#164B49",
            padding: 14,
            fontSize: 15,
            color: "#DCE4E4",
            minHeight: 80,
            textAlignVertical: "top",
            marginBottom: 20,
          }}
        />

        {/* Submit Report */}
        <Pressable
          onPress={handleSubmitReport}
          disabled={!selectedReason || isPending}
          style={{
            alignItems: "center",
            borderRadius: 12,
            backgroundColor: "#50C878",
            paddingVertical: 16,
            opacity: !selectedReason || isPending ? 0.5 : 1,
            marginBottom: 12,
          }}
        >
          {reportMutation.isPending ? (
            <ActivityIndicator color="#0A1A1A" size="small" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#0A1A1A" }}>
              Submit Report
            </Text>
          )}
        </Pressable>

        {/* Block User (only if there's a reported user) */}
        {reportedUserId && (
          <Pressable
            onPress={handleBlockUser}
            disabled={isPending}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(239, 68, 68, 0.3)",
              backgroundColor: pressed
                ? "rgba(239, 68, 68, 0.2)"
                : "rgba(239, 68, 68, 0.1)",
              paddingVertical: 14,
              opacity: isPending ? 0.5 : 1,
            })}
          >
            <ShieldAlert size={18} color="#ef4444" />
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#f87171" }}>
              Block This User
            </Text>
          </Pressable>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

ReportSheet.displayName = "ReportSheet";
