import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useMutation } from "@tanstack/react-query";
import { Flag } from "lucide-react-native";

import { trpc } from "~/utils/api";

type ContentType = "TASK" | "USER" | "COMMENT";
type Reason = "SPAM" | "OFFENSIVE" | "HARASSMENT" | "OTHER";

export interface ReportSheetRef {
  present: (params: {
    contentType: ContentType;
    contentId: string;
    reportedUserId?: string;
  }) => void;
  dismiss: () => void;
}

const REASON_OPTIONS: { value: Reason; label: string }[] = [
  { value: "SPAM", label: "Spam" },
  { value: "OFFENSIVE", label: "Offensive Content" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "OTHER", label: "Other" },
];

export const ReportSheet = forwardRef<ReportSheetRef>((_props, ref) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [contentType, setContentType] = useState<ContentType>("USER");
  const [contentId, setContentId] = useState("");
  const [reportedUserId, setReportedUserId] = useState<string | undefined>();
  const [selectedReason, setSelectedReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");

  const reportMutation = useMutation(
    trpc.moderation.reportContent.mutationOptions(),
  );

  useImperativeHandle(ref, () => ({
    present: (params) => {
      setContentType(params.contentType);
      setContentId(params.contentId);
      setReportedUserId(params.reportedUserId);
      setSelectedReason(null);
      setDetails("");
      bottomSheetRef.current?.present();
    },
    dismiss: () => bottomSheetRef.current?.dismiss(),
  }));

  const handleSubmit = useCallback(() => {
    if (!selectedReason) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    reportMutation.mutate(
      {
        contentType,
        contentId,
        reportedUserId,
        reason: selectedReason,
        details: details.trim() || undefined,
      },
      {
        onSuccess: () => {
          bottomSheetRef.current?.dismiss();
          Alert.alert(
            "Report Submitted",
            "Thank you for your report. We will review it shortly.",
          );
        },
        onError: (error) => {
          Alert.alert("Error", error.message || "Failed to submit report.");
        },
      },
    );
  }, [
    selectedReason,
    contentType,
    contentId,
    reportedUserId,
    details,
    reportMutation,
    bottomSheetRef,
  ]);

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
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: "#0A1A1A",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      handleIndicatorStyle={{ backgroundColor: "#164B49", width: 40 }}
    >
      <BottomSheetScrollView
        style={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <Flag size={22} color="#E57373" />
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#DCE4E4" }}>
            Report
          </Text>
        </View>

        {/* Reason picker */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: "#8FA8A8",
            marginBottom: 10,
          }}
        >
          Reason
        </Text>
        <View style={{ gap: 8, marginBottom: 16 }}>
          {REASON_OPTIONS.map((option) => {
            const isSelected = selectedReason === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedReason(option.value);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isSelected
                    ? "rgba(80, 200, 120, 0.1)"
                    : "#102A2A",
                  borderWidth: 1,
                  borderColor: isSelected ? "#50C878" : "#164B49",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: isSelected ? "#50C878" : "#164B49",
                    backgroundColor: isSelected ? "#50C878" : "transparent",
                    marginRight: 12,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isSelected && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#0A1A1A",
                      }}
                    />
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "500",
                    color: "#DCE4E4",
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Details input */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: "#8FA8A8",
            marginBottom: 8,
          }}
        >
          Additional details (optional)
        </Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          placeholder="Describe the issue..."
          placeholderTextColor="#8FA8A8"
          multiline
          maxLength={1000}
          style={{
            backgroundColor: "#102A2A",
            borderWidth: 1,
            borderColor: "#164B49",
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 14,
            color: "#DCE4E4",
            minHeight: 80,
            textAlignVertical: "top",
            marginBottom: 20,
          }}
        />

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={!selectedReason || reportMutation.isPending}
          style={{
            backgroundColor:
              selectedReason && !reportMutation.isPending
                ? "#E57373"
                : "#4A2020",
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            opacity: !selectedReason || reportMutation.isPending ? 0.5 : 1,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#DCE4E4",
            }}
          >
            {reportMutation.isPending ? "Submitting..." : "Submit Report"}
          </Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

ReportSheet.displayName = "ReportSheet";
