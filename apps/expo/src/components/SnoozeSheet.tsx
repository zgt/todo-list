import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Pressable, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { AlarmClock, Calendar, Clock, Moon, Sun } from "lucide-react-native";

import { CustomDatePicker } from "./CustomDatePicker";
import { CustomTimePicker } from "./CustomTimePicker";

export interface SnoozeSheetRef {
  present: (taskId: string) => void;
  dismiss: () => void;
}

interface SnoozeSheetProps {
  onSnooze: (taskId: string, snoozedUntil: Date) => void;
}

function getNextMondayAt9am(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(monday.getDate() + daysUntilMonday);
  monday.setHours(9, 0, 0, 0);
  return monday;
}

function getTomorrowAt9am(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow;
}

function getLaterToday(): Date {
  const later = new Date();
  later.setHours(later.getHours() + 4);
  later.setMinutes(0, 0, 0);
  return later;
}

function formatSnoozeDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (diffDays === 0) return `Today at ${time}`;
  if (diffDays === 1) return `Tomorrow at ${time}`;

  return `${date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} at ${time}`;
}

const SNOOZE_OPTIONS = [
  {
    label: "Later Today",
    sublabel: () => formatSnoozeDate(getLaterToday()),
    icon: Clock,
    getDate: getLaterToday,
  },
  {
    label: "Tomorrow",
    sublabel: () => formatSnoozeDate(getTomorrowAt9am()),
    icon: Sun,
    getDate: getTomorrowAt9am,
  },
  {
    label: "Next Week",
    sublabel: () => formatSnoozeDate(getNextMondayAt9am()),
    icon: Moon,
    getDate: getNextMondayAt9am,
  },
];

export const SnoozeSheet = forwardRef<SnoozeSheetRef, SnoozeSheetProps>(
  ({ onSnooze }, ref) => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [pendingDate, setPendingDate] = useState<Date | null>(null);

    useImperativeHandle(ref, () => ({
      present: (id: string) => {
        setTaskId(id);
        setShowDatePicker(false);
        setShowTimePicker(false);
        setPendingDate(null);
        bottomSheetRef.current?.present();
      },
      dismiss: () => bottomSheetRef.current?.dismiss(),
    }));

    const handleSnooze = useCallback(
      (date: Date) => {
        if (!taskId) return;
        onSnooze(taskId, date);
        bottomSheetRef.current?.dismiss();
      },
      [taskId, onSnooze],
    );

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
          <BottomSheetView style={{ padding: 20, paddingBottom: 40 }}>
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <AlarmClock size={22} color="#50C878" />
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#DCE4E4" }}
              >
                Snooze Task
              </Text>
            </View>

            {/* Preset options */}
            <View style={{ gap: 8 }}>
              {SNOOZE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() => {
                      void Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light,
                      );
                      handleSnooze(option.getDate());
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                      backgroundColor: "#102A2A",
                      borderWidth: 1,
                      borderColor: "#164B49",
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                    }}
                  >
                    <Icon size={20} color="#50C878" />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "600",
                          color: "#DCE4E4",
                        }}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#8FA8A8",
                          marginTop: 2,
                        }}
                      >
                        {option.sublabel()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}

              {/* Pick Date option */}
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  bottomSheetRef.current?.dismiss();
                  setPendingDate(getTomorrowAt9am());
                  setShowDatePicker(true);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  backgroundColor: "#102A2A",
                  borderWidth: 1,
                  borderColor: "#164B49",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <Calendar size={20} color="#50C878" />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: "#DCE4E4",
                    }}
                  >
                    Pick a Date
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#8FA8A8",
                      marginTop: 2,
                    }}
                  >
                    Choose a specific date and time
                  </Text>
                </View>
              </Pressable>
            </View>
          </BottomSheetView>
        </BottomSheetModal>

        {/* Custom Date Picker */}
        <CustomDatePicker
          isVisible={showDatePicker}
          date={pendingDate ?? getTomorrowAt9am()}
          minimumDate={new Date()}
          onConfirm={(date) => {
            setPendingDate(date);
            setShowDatePicker(false);
            setShowTimePicker(true);
          }}
          onCancel={() => setShowDatePicker(false)}
        />

        {/* Custom Time Picker */}
        <CustomTimePicker
          isVisible={showTimePicker}
          date={pendingDate ?? new Date()}
          onConfirm={(time) => {
            if (pendingDate) {
              const combined = new Date(pendingDate);
              combined.setHours(time.getHours());
              combined.setMinutes(time.getMinutes());
              handleSnooze(combined);
            }
            setShowTimePicker(false);
          }}
          onCancel={() => setShowTimePicker(false)}
        />
      </>
    );
  },
);

SnoozeSheet.displayName = "SnoozeSheet";
