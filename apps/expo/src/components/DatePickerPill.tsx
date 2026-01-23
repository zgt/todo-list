import type { SharedValue } from "react-native-reanimated";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

interface DatePickerPillProps {
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
}

const PILL_COLOR = "#8FA8A8";
const PILL_BG_COLOR = `${PILL_COLOR}33`;

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const MONTHS = [
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

interface WheelItem {
  value: number;
  label: string;
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<WheelItem>);

// Animated wheel item component
function WheelItem({
  item,
  index,
  scrollY,
}: {
  item: WheelItem;
  index: number;
  scrollY: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * ITEM_HEIGHT,
      index * ITEM_HEIGHT,
      (index + 1) * ITEM_HEIGHT,
    ];

    const scale = interpolate(
      scrollY.value,
      inputRange,
      [0.7, 1, 0.7],
      "clamp",
    );
    const opacity = interpolate(
      scrollY.value,
      inputRange,
      [0.3, 1, 0.3],
      "clamp",
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.wheelItem, animatedStyle]}>
      <Text style={styles.wheelItemText}>{item.label}</Text>
    </Animated.View>
  );
}

// Wheel picker component
function WheelPicker({
  items,
  selectedValue,
  onValueChange,
  width,
}: {
  items: WheelItem[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  width: number;
}) {
  const flatListRef = useRef<FlatList<WheelItem>>(null);
  const scrollY = useSharedValue(0);
  const isScrolling = useRef(false);

  const initialIndex = useMemo(() => {
    const idx = items.findIndex((item) => item.value === selectedValue);
    return idx === -1 ? 0 : idx;
  }, [items, selectedValue]);

  useEffect(() => {
    if (!isScrolling.current && flatListRef.current) {
      const idx = items.findIndex((item) => item.value === selectedValue);
      if (idx !== -1) {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({
            offset: idx * ITEM_HEIGHT,
            animated: false,
          });
        }, 50);
      }
    }
  }, [selectedValue, items]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
    onBeginDrag: () => {
      isScrolling.current = true;
    },
  });

  const handleMomentumScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      isScrolling.current = false;
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      const item = items[clampedIndex];

      if (item && item.value !== selectedValue) {
        onValueChange(item.value);
      }
    },
    [items, selectedValue, onValueChange],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: WheelItem; index: number }) => {
      return <WheelItem item={item} index={index} scrollY={scrollY} />;
    },
    [scrollY],
  );

  const paddingVertical = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2;

  return (
    <View style={[styles.wheelContainer, { width }]}>
      {/* Selection indicator */}
      <View style={styles.selectionIndicator} pointerEvents="none" />

      <AnimatedFlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.value}`}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical }}
        onScroll={scrollHandler}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
}

export function DatePickerPill({
  selectedDate,
  onDateChange,
}: DatePickerPillProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const formatDate = (date: Date | null): string => {
    if (!date) return "No date";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) {
      return "Today";
    }
    if (dateOnly.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    }

    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = date.getDate();
    const year = date.getFullYear();
    const currentYear = new Date().getFullYear();

    if (year === currentYear) {
      return `${month} ${day}`;
    }
    return `${month} ${day}, ${year}`;
  };

  const handlePress = () => {
    setTempDate(selectedDate ?? new Date());
    setShowPicker(true);
  };

  const handleClear = () => {
    onDateChange(null);
    setShowPicker(false);
  };

  const handleDone = () => {
    onDateChange(tempDate);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
  };

  // Generate items for wheels
  const monthItems = useMemo<WheelItem[]>(
    () =>
      MONTHS.map((month, index) => ({
        value: index,
        label: month,
      })),
    [],
  );

  const dayItems = useMemo<WheelItem[]>(() => {
    const daysInMonth = new Date(
      tempDate.getFullYear(),
      tempDate.getMonth() + 1,
      0,
    ).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      value: i + 1,
      label: `${i + 1}`,
    }));
  }, [tempDate]);

  const yearItems = useMemo<WheelItem[]>(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => ({
      value: currentYear + i,
      label: `${currentYear + i}`,
    }));
  }, []);

  const handleMonthChange = (month: number) => {
    const newDate = new Date(tempDate);
    newDate.setMonth(month);
    // Adjust day if it exceeds the new month's days
    const daysInNewMonth = new Date(
      newDate.getFullYear(),
      month + 1,
      0,
    ).getDate();
    if (newDate.getDate() > daysInNewMonth) {
      newDate.setDate(daysInNewMonth);
    }
    setTempDate(newDate);
  };

  const handleDayChange = (day: number) => {
    const newDate = new Date(tempDate);
    newDate.setDate(day);
    setTempDate(newDate);
  };

  const handleYearChange = (year: number) => {
    const newDate = new Date(tempDate);
    newDate.setFullYear(year);
    // Adjust for leap year
    const daysInNewMonth = new Date(year, newDate.getMonth() + 1, 0).getDate();
    if (newDate.getDate() > daysInNewMonth) {
      newDate.setDate(daysInNewMonth);
    }
    setTempDate(newDate);
  };

  return (
    <View>
      <Pressable onPress={handlePress} style={styles.pill}>
        <Text style={styles.pillText}>{formatDate(selectedDate)}</Text>
      </Pressable>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Pressable onPress={handleClear} hitSlop={8}>
                <Text style={styles.headerButtonText}>Clear</Text>
              </Pressable>
              <Text style={styles.modalTitle}>Select Date</Text>
              <Pressable onPress={handleDone} hitSlop={8}>
                <Text style={[styles.headerButtonText, styles.doneButton]}>
                  Done
                </Text>
              </Pressable>
            </View>

            {/* Wheel pickers */}
            <View style={styles.wheelsContainer}>
              <WheelPicker
                items={monthItems}
                selectedValue={tempDate.getMonth()}
                onValueChange={handleMonthChange}
                width={120}
              />
              <WheelPicker
                items={dayItems}
                selectedValue={tempDate.getDate()}
                onValueChange={handleDayChange}
                width={60}
              />
              <WheelPicker
                items={yearItems}
                selectedValue={tempDate.getFullYear()}
                onValueChange={handleYearChange}
                width={80}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: PILL_COLOR,
    backgroundColor: PILL_BG_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: {
    fontSize: 14,
    fontWeight: "600",
    color: PILL_COLOR,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1A2A2A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#164B49",
    width: 300,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#164B49",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DCE4E4",
  },
  headerButtonText: {
    fontSize: 16,
    color: "#8FA8A8",
  },
  doneButton: {
    color: "#50C878",
    fontWeight: "600",
  },
  wheelsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 8,
    gap: 4,
  },
  wheelContainer: {
    height: CONTAINER_HEIGHT,
    overflow: "hidden",
  },
  selectionIndicator: {
    position: "absolute",
    top: (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2,
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    backgroundColor: "rgba(80, 200, 120, 0.15)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(80, 200, 120, 0.3)",
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  wheelItemText: {
    fontSize: 18,
    color: "#DCE4E4",
    fontWeight: "500",
  },
});
