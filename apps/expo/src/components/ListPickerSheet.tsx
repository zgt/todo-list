import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useCallback, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Check } from "lucide-react-native";

interface TaskList {
  id: string;
  name: string;
  color: string | null;
}

interface ListPickerSheetProps {
  selectedListId: string | null;
  onListChange: (id: string | null) => void;
  lists: TaskList[];
}

export function ListPickerSheet({
  selectedListId,
  onListChange,
  lists,
}: ListPickerSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["60%"], []);

  const selectedList = lists.find((l) => l.id === selectedListId);

  const handleOpen = useCallback(() => {
    bottomSheetRef.current?.present();
  }, []);

  const handleSelect = useCallback(
    (id: string | null) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onListChange(id);
      bottomSheetRef.current?.dismiss();
    },
    [onListChange],
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

  const trigger = (
    <Pressable onPress={handleOpen}>
      <View
        style={[
          styles.pill,
          selectedList
            ? {
                backgroundColor: `${selectedList.color ?? "#50C878"}33`,
                borderColor: selectedList.color ?? "#50C878",
              }
            : styles.pillDefault,
        ]}
      >
        {selectedList?.color && (
          <View
            style={[styles.colorDot, { backgroundColor: selectedList.color }]}
          />
        )}
        {!selectedList && (
          <View style={[styles.colorDot, { backgroundColor: "#50C878" }]} />
        )}
        <Text
          style={[
            styles.pillText,
            selectedList
              ? { color: selectedList.color ?? "#50C878" }
              : styles.pillTextDefault,
          ]}
          numberOfLines={1}
        >
          {selectedList ? selectedList.name : "Personal"}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <>
      {trigger}

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select List</Text>
        </View>

        <BottomSheetScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Personal (null) option */}
          <Pressable onPress={() => handleSelect(null)}>
            <View
              style={[
                styles.row,
                selectedListId === null && styles.rowSelected,
              ]}
            >
              <View style={styles.rowLeft}>
                <View
                  style={[styles.colorDot, { backgroundColor: "#50C878" }]}
                />
                <Text style={styles.rowText}>Personal</Text>
              </View>
              {selectedListId === null && (
                <Check size={20} color="#50C878" strokeWidth={2.5} />
              )}
            </View>
          </Pressable>

          {/* List items */}
          {lists.map((list) => (
            <Pressable key={list.id} onPress={() => handleSelect(list.id)}>
              <View
                style={[
                  styles.row,
                  selectedListId === list.id && styles.rowSelected,
                ]}
              >
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: list.color ?? "#50C878" },
                    ]}
                  />
                  <Text style={styles.rowText}>{list.name}</Text>
                </View>
                {selectedListId === list.id && (
                  <Check size={20} color="#50C878" strokeWidth={2.5} />
                )}
              </View>
            </Pressable>
          ))}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  // Trigger pill
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 9999,
    borderWidth: 2,
    minWidth: 80,
    gap: 8,
  },
  pillDefault: {
    backgroundColor: "rgba(143, 168, 168, 0.1)",
    borderColor: "#8FA8A8",
  },
  pillText: {
    fontSize: 14,
    fontWeight: "600",
  },
  pillTextDefault: {
    color: "#8FA8A8",
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Sheet
  sheetBackground: {
    backgroundColor: "#102A2A",
  },
  handleIndicator: {
    backgroundColor: "#8FA8A8",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#164B49",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#DCE4E4",
    textAlign: "center",
  },
  scrollContent: {
    padding: 16,
    gap: 8,
  },

  // List rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#0A1A1A",
    borderWidth: 1,
    borderColor: "#164B49",
  },
  rowSelected: {
    borderColor: "#50C878",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#DCE4E4",
  },
});
