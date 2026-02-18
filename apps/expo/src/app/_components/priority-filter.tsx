import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Filter } from "lucide-react-native";

import type { PriorityLevel } from "~/components/priority-config";
import { PRIORITY_CONFIG } from "~/components/priority-config";

interface PriorityFilterProps {
  selectedPriorities: PriorityLevel[];
  onChange: (priorities: PriorityLevel[]) => void;
}

export function PriorityFilter({
  selectedPriorities,
  onChange,
}: PriorityFilterProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["35%"], []);

  const handleOpen = () => {
    bottomSheetRef.current?.present();
  };

  const handleToggle = (priority: PriorityLevel) => {
    if (selectedPriorities.includes(priority)) {
      onChange(selectedPriorities.filter((p) => p !== priority));
    } else {
      onChange([...selectedPriorities, priority]);
    }
  };

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.6}
    />
  );

  return (
    <>
      <Pressable
        onPress={handleOpen}
        style={[
          styles.triggerButton,
          selectedPriorities.length > 0 && styles.triggerButtonActive,
        ]}
      >
        <Filter size={16} color="#8FA8A8" />
        <Text style={styles.triggerText}>Priority</Text>
        {selectedPriorities.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{selectedPriorities.length}</Text>
          </View>
        )}
      </Pressable>

      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Filter by Priority</Text>
            {selectedPriorities.length > 0 && (
              <Pressable onPress={() => onChange([])}>
                <Text style={styles.clearText}>Clear all</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.pillsContainer}>
            {(["high", "medium", "low", null] as const).map((p) => {
              const config = PRIORITY_CONFIG[p ?? "none"];
              if (!config) return null;
              const isSelected = selectedPriorities.includes(p);
              const Icon = config.Icon;

              return (
                <Pressable
                  key={p ?? "null"}
                  onPress={() => handleToggle(p)}
                  style={[
                    styles.pill,
                    isSelected ? styles.pillActive : styles.pillInactive,
                    isSelected && {
                      borderColor: config.color,
                      backgroundColor: `${config.color}20`,
                    },
                  ]}
                >
                  <Icon
                    size={16}
                    color={isSelected ? config.color : "#8FA8A8"}
                  />
                  <Text
                    style={[
                      styles.pillText,
                      isSelected
                        ? { color: config.color }
                        : { color: "#8FA8A8" },
                    ]}
                  >
                    {config.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: "#164B49",
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  triggerButtonActive: {
    borderColor: "#50C878",
    backgroundColor: "#102A2A",
  },
  triggerText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#DCE4E4",
  },
  badge: {
    marginLeft: 4,
    height: 20,
    width: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#50C878",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0A1A1A",
  },
  sheetBackground: {
    backgroundColor: "#102A2A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: "#8FA8A8",
    width: 40,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#DCE4E4",
  },
  clearText: {
    fontSize: 14,
    color: "#50C878",
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1.5,
  },
  pillInactive: {
    borderColor: "#164B49",
    backgroundColor: "transparent",
  },
  pillActive: {
    // Overridden in inline styles based on color
  },
  pillText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
