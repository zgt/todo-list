import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

interface CustomTimePickerProps {
  isVisible: boolean;
  date: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// Generate arrays for hours (1-12), minutes (00-59), and periods (AM/PM)
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ["AM", "PM"];

export function CustomTimePicker({
  isVisible,
  date,
  onConfirm,
  onCancel,
}: CustomTimePickerProps) {
  // Convert 24-hour time to 12-hour format
  const getInitialHour = (date: Date) => {
    const hour24 = date.getHours();
    if (hour24 === 0) return 12;
    if (hour24 > 12) return hour24 - 12;
    return hour24;
  };

  const getInitialPeriod = (date: Date) => {
    return date.getHours() >= 12 ? "PM" : "AM";
  };

  const [selectedHour, setSelectedHour] = useState(getInitialHour(date));
  const [selectedMinute, setSelectedMinute] = useState(date.getMinutes());
  const [selectedPeriod, setSelectedPeriod] = useState(getInitialPeriod(date));

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);
  const periodScrollRef = useRef<ScrollView>(null);

  // Track if we're programmatically scrolling to prevent feedback loops
  const isScrollingProgrammatically = useRef(false);

  // Update internal state when modal opens
  useEffect(() => {
    if (isVisible) {
      const hour = getInitialHour(date);
      const minute = date.getMinutes();
      const period = getInitialPeriod(date);

      setSelectedHour(hour);
      setSelectedMinute(minute);
      setSelectedPeriod(period);

      // Scroll to initial positions after a short delay
      setTimeout(() => {
        isScrollingProgrammatically.current = true;
        hourScrollRef.current?.scrollTo({
          y: (hour - 1) * ITEM_HEIGHT,
          animated: false,
        });
        minuteScrollRef.current?.scrollTo({
          y: minute * ITEM_HEIGHT,
          animated: false,
        });
        periodScrollRef.current?.scrollTo({
          y: (period === "PM" ? 1 : 0) * ITEM_HEIGHT,
          animated: false,
        });
        setTimeout(() => {
          isScrollingProgrammatically.current = false;
        }, 100);
      }, 100);
    }
  }, [isVisible, date]);

  const handleHourScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isScrollingProgrammatically.current) return;
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const hour = HOURS[index];
    if (hour !== undefined) {
      setSelectedHour(hour);
    }
  };

  const handleMinuteScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (isScrollingProgrammatically.current) return;
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const minute = MINUTES[index];
    if (minute !== undefined) {
      setSelectedMinute(minute);
    }
  };

  const handlePeriodScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (isScrollingProgrammatically.current) return;
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const period = PERIODS[index];
    if (period !== undefined) {
      setSelectedPeriod(period);
    }
  };

  const handleConfirm = () => {
    // Convert 12-hour time to 24-hour
    let hour24 = selectedHour;
    if (selectedPeriod === "AM" && selectedHour === 12) {
      hour24 = 0;
    } else if (selectedPeriod === "PM" && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    }

    const newDate = new Date(date);
    newDate.setHours(hour24);
    newDate.setMinutes(selectedMinute);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);

    onConfirm(newDate);
  };

  const renderPickerColumn = (
    items: (number | string)[],
    selectedValue: number | string,
    scrollRef: React.RefObject<ScrollView>,
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void,
    formatValue?: (value: number | string) => string,
  ) => {
    return (
      <View style={styles.pickerColumn}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          scrollEnabled={true}
          nestedScrollEnabled={true}
          onMomentumScrollEnd={onScroll}
          contentContainerStyle={styles.pickerContent}
          style={styles.pickerScroll}
        >
          {items.map((item) => {
            const isSelected = item === selectedValue;
            const displayValue = formatValue ? formatValue(item) : String(item);

            return (
              <View key={item} style={styles.pickerItem}>
                <Text
                  style={[
                    styles.pickerItemText,
                    isSelected && styles.pickerItemTextSelected,
                  ]}
                >
                  {displayValue}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Select Time</Text>

          <View style={styles.pickerContainer}>
            {/* Selection indicator stripe */}
            <View style={styles.selectionStripe} />

            {/* Hour column */}
            {renderPickerColumn(HOURS, selectedHour, hourScrollRef, handleHourScroll)}

            {/* Minute column */}
            {renderPickerColumn(
              MINUTES,
              selectedMinute,
              minuteScrollRef,
              handleMinuteScroll,
              (value) => String(value).padStart(2, "0"),
            )}

            {/* AM/PM column */}
            {renderPickerColumn(
              PERIODS,
              selectedPeriod,
              periodScrollRef,
              handlePeriodScroll,
            )}
          </View>

          {/* Action buttons */}
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
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
    zIndex: -1,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerScroll: {
    height: PICKER_HEIGHT,
  },
  pickerContent: {
    paddingVertical: ITEM_HEIGHT * 2, // Padding to center the selection
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
