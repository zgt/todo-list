import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

interface CustomTimePickerProps {
  isVisible: boolean;
  date: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ["AM", "PM"] as const;

export function CustomTimePicker({
  isVisible,
  date,
  onConfirm,
  onCancel,
}: CustomTimePickerProps) {
  const getInitialHour = (d: Date) => {
    const h = d.getHours();
    if (h === 0) return 12;
    if (h > 12) return h - 12;
    return h;
  };
  const getInitialPeriod = (d: Date) => (d.getHours() >= 12 ? "PM" : "AM");

  const [selectedHour, setSelectedHour] = useState(getInitialHour(date));
  const [selectedMinute, setSelectedMinute] = useState(date.getMinutes());
  const [selectedPeriod, setSelectedPeriod] = useState(getInitialPeriod(date));

  const hourRef = useRef<ScrollView>(null);
  const minuteRef = useRef<ScrollView>(null);
  const periodRef = useRef<ScrollView>(null);
  const programmatic = useRef(false);

  useEffect(() => {
    if (isVisible) {
      const h = getInitialHour(date);
      const m = date.getMinutes();
      const p = getInitialPeriod(date);
      setSelectedHour(h);
      setSelectedMinute(m);
      setSelectedPeriod(p);

      setTimeout(() => {
        programmatic.current = true;
        hourRef.current?.scrollTo({
          y: (h - 1) * ITEM_HEIGHT,
          animated: false,
        });
        minuteRef.current?.scrollTo({ y: m * ITEM_HEIGHT, animated: false });
        periodRef.current?.scrollTo({
          y: (p === "PM" ? 1 : 0) * ITEM_HEIGHT,
          animated: false,
        });
        setTimeout(() => {
          programmatic.current = false;
        }, 100);
      }, 100);
    }
  }, [isVisible, date]);

  // Update selection live during scroll
  const lastHourIdx = useRef(-1);
  const lastMinuteIdx = useRef(-1);
  const lastPeriodIdx = useRef(-1);

  const handleHourScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (programmatic.current) return;
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const h = HOURS[idx];
      if (h !== undefined) {
        if (idx !== lastHourIdx.current) {
          lastHourIdx.current = idx;
          void Haptics.selectionAsync();
        }
        setSelectedHour(h);
      }
    },
    [],
  );

  const handleMinuteScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (programmatic.current) return;
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const m = MINUTES[idx];
      if (m !== undefined) {
        if (idx !== lastMinuteIdx.current) {
          lastMinuteIdx.current = idx;
          void Haptics.selectionAsync();
        }
        setSelectedMinute(m);
      }
    },
    [],
  );

  const handlePeriodScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (programmatic.current) return;
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const p = PERIODS[idx];
      if (p !== undefined) {
        if (idx !== lastPeriodIdx.current) {
          lastPeriodIdx.current = idx;
          void Haptics.selectionAsync();
        }
        setSelectedPeriod(p);
      }
    },
    [],
  );

  const handleConfirm = () => {
    let hour24 = selectedHour;
    if (selectedPeriod === "AM" && selectedHour === 12) hour24 = 0;
    else if (selectedPeriod === "PM" && selectedHour !== 12)
      hour24 = selectedHour + 12;

    const newDate = new Date(date);
    newDate.setHours(hour24);
    newDate.setMinutes(selectedMinute);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    onConfirm(newDate);
  };

  const scrollToIndex = (
    ref: React.RefObject<ScrollView | null>,
    index: number,
  ) => {
    ref.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
  };

  const renderColumn = (
    items: readonly (number | string)[],
    selectedValue: number | string,
    scrollRef: React.RefObject<ScrollView | null>,
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void,
    onTap: (index: number) => void,
    formatValue?: (value: number | string) => string,
  ) => (
    <View style={styles.pickerColumn}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onScroll}
        contentContainerStyle={styles.pickerContent}
        style={styles.pickerScroll}
      >
        {items.map((item, index) => {
          const isSelected = item === selectedValue;
          const display = formatValue ? formatValue(item) : String(item);
          return (
            <Pressable
              key={item}
              onPress={() => onTap(index)}
              style={styles.pickerItem}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  isSelected && styles.pickerItemTextSelected,
                ]}
              >
                {display}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  if (!isVisible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouchable} onPress={onCancel} />

        <View style={styles.card}>
          <Text style={styles.title}>Select Time</Text>

          {/* eslint-disable react-hooks/refs -- refs are only accessed in onPress callbacks, not during render */}
          <View style={styles.pickerContainer}>
            {/* Green selection stripe */}
            <View style={styles.selectionStripe} pointerEvents="none" />

            {renderColumn(
              HOURS,
              selectedHour,
              hourRef,
              handleHourScroll,
              (i) => {
                const h = HOURS[i];
                if (h !== undefined) {
                  setSelectedHour(h);
                  scrollToIndex(hourRef, i);
                }
              },
            )}

            {renderColumn(
              MINUTES,
              selectedMinute,
              minuteRef,
              handleMinuteScroll,
              (i) => {
                const m = MINUTES[i];
                if (m !== undefined) {
                  setSelectedMinute(m);
                  scrollToIndex(minuteRef, i);
                }
              },
              (v) => String(v).padStart(2, "0"),
            )}

            {renderColumn(
              PERIODS,
              selectedPeriod,
              periodRef,
              handlePeriodScroll,
              (i) => {
                const p = PERIODS[i];
                if (p !== undefined) {
                  setSelectedPeriod(p);
                  scrollToIndex(periodRef, i);
                }
              },
            )}
          </View>
          {/* eslint-enable react-hooks/refs */}

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.button,
                styles.confirmButton,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  backdropTouchable: {
    flex: 1,
  },
  card: {
    backgroundColor: "#0F2626",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#DCE4E4",
    textAlign: "center",
    marginBottom: 24,
  },
  pickerContainer: {
    flexDirection: "row",
    height: PICKER_HEIGHT,
    marginBottom: 24,
    position: "relative",
  },
  selectionStripe: {
    position: "absolute",
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: "rgba(80, 200, 120, 0.15)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#50C878",
    zIndex: 1,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerScroll: {
    height: PICKER_HEIGHT,
  },
  pickerContent: {
    paddingVertical: ITEM_HEIGHT * 2,
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerItemText: {
    fontSize: 20,
    color: "#4A6A6A",
    fontWeight: "500",
  },
  pickerItemTextSelected: {
    fontSize: 24,
    color: "#DCE4E4",
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#102A2A",
    borderWidth: 1,
    borderColor: "#164B49",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8FA8A8",
  },
  confirmButton: {
    backgroundColor: "#50C878",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0A1A1A",
  },
});
