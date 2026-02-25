import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

interface CustomDatePickerProps {
  isVisible: boolean;
  date: Date;
  minimumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isBeforeDay(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return d1 < d2;
}

export function CustomDatePicker({
  isVisible,
  date,
  minimumDate,
  onConfirm,
  onCancel,
}: CustomDatePickerProps) {
  const [selectedDate, setSelectedDate] = useState(date);
  const [viewMonth, setViewMonth] = useState(date.getMonth());
  const [viewYear, setViewYear] = useState(date.getFullYear());
  const [prevDate, setPrevDate] = useState(date);
  const [prevVisible, setPrevVisible] = useState(isVisible);

  // Update internal state when prop changes (render-time adjustment)
  if (isVisible && (date !== prevDate || isVisible !== prevVisible)) {
    setPrevDate(date);
    setPrevVisible(isVisible);
    setSelectedDate(date);
    setViewMonth(date.getMonth());
    setViewYear(date.getFullYear());
  } else if (isVisible !== prevVisible) {
    setPrevVisible(isVisible);
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDayPress = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);

    // Check if before minimum date
    if (minimumDate && isBeforeDay(newDate, minimumDate)) {
      return;
    }

    // Preserve time from original selected date
    newDate.setHours(selectedDate.getHours());
    newDate.setMinutes(selectedDate.getMinutes());
    newDate.setSeconds(selectedDate.getSeconds());
    newDate.setMilliseconds(selectedDate.getMilliseconds());

    setSelectedDate(newDate);
  };

  const handleConfirm = () => {
    onConfirm(selectedDate);
  };

  // Generate calendar grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = new Date();

  const calendarDays: (number | null)[] = [];

  // Add empty cells for days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Pad to fill the last week (ensure each week has exactly 7 cells)
  const totalCells = calendarDays.length;
  const cellsNeeded = Math.ceil(totalCells / 7) * 7;
  for (let i = totalCells; i < cellsNeeded; i++) {
    calendarDays.push(null);
  }

  // Group into weeks (now each week will have exactly 7 cells)
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

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
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={handlePrevMonth}
              hitSlop={12}
              style={({ pressed }) => [
                styles.navButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <ChevronLeft size={24} color="#DCE4E4" />
            </Pressable>

            <Text style={styles.headerText}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>

            <Pressable
              onPress={handleNextMonth}
              hitSlop={12}
              style={({ pressed }) => [
                styles.navButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <ChevronRight size={24} color="#DCE4E4" />
            </Pressable>
          </View>

          {/* Day labels */}
          <View style={styles.dayLabelsRow}>
            {DAY_LABELS.map((label) => (
              <View key={label} style={styles.dayLabelCell}>
                <Text style={styles.dayLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <ScrollView
            style={styles.calendarScroll}
            contentContainerStyle={styles.calendarContent}
            showsVerticalScrollIndicator={false}
          >
            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return (
                      <View key={`empty-${dayIndex}`} style={styles.dayCell} />
                    );
                  }

                  const dayDate = new Date(viewYear, viewMonth, day);
                  const isSelected = isSameDay(dayDate, selectedDate);
                  const isToday = isSameDay(dayDate, today);
                  const isDisabled =
                    minimumDate && isBeforeDay(dayDate, minimumDate);

                  return (
                    <Pressable
                      key={day}
                      onPress={() => handleDayPress(day)}
                      disabled={isDisabled}
                      style={({ pressed }) => [
                        styles.dayCell,
                        { opacity: pressed && !isDisabled ? 0.7 : 1 },
                      ]}
                    >
                      <View
                        style={[
                          styles.dayCircle,
                          isSelected && styles.dayCircleSelected,
                          isToday && !isSelected && styles.dayCircleToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isSelected && styles.dayTextSelected,
                            isDisabled && styles.dayTextDisabled,
                            isToday && !isSelected && styles.dayTextToday,
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>

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
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  navButton: {
    padding: 4,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#DCE4E4",
  },
  dayLabelsRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8FA8A8",
  },
  calendarScroll: {
    maxHeight: 320,
  },
  calendarContent: {
    paddingBottom: 8,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayCircleSelected: {
    backgroundColor: "#50C878",
    borderColor: "#50C878",
  },
  dayCircleToday: {
    borderColor: "#50C878",
    backgroundColor: "transparent",
  },
  dayText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#DCE4E4",
  },
  dayTextSelected: {
    color: "#0A1A1A",
    fontWeight: "700",
  },
  dayTextDisabled: {
    color: "#4A6A6A",
  },
  dayTextToday: {
    color: "#50C878",
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
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
