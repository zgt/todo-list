import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { CategoryFilter } from "~/app/_components/category-filter";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

interface CategoryWheelPickerProps {
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

export function CategoryWheelPicker({
  selectedCategoryId,
  onCategoryChange,
}: CategoryWheelPickerProps) {
  const { data: session } = authClient.useSession();
  const { data: categories, isLoading } = useQuery(
    trpc.category.all.queryOptions(undefined, {
      enabled: !!session,
    }),
  );

  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={[styles.pill, styles.loadingPill]}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Trigger UI (Pill)
  const trigger = (
    <View
      style={[
        styles.pill,
        selectedCategory
          ? {
              backgroundColor: `${selectedCategory.color}33`,
              borderColor: selectedCategory.color,
            }
          : styles.pillNone,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          selectedCategory
            ? { color: selectedCategory.color }
            : styles.textNone,
        ]}
        numberOfLines={1}
      >
        {selectedCategory ? selectedCategory.name : "None"}
      </Text>
    </View>
  );

  return (
    <CategoryFilter
      mode="select"
      selectedCategoryId={selectedCategoryId}
      onCategoryChange={onCategoryChange}
      trigger={trigger}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  pill: {
    paddingHorizontal: 16,
    height: 44,
    justifyContent: "center",
    borderRadius: 9999,
    borderWidth: 2,
    minWidth: 80,
    alignItems: "center",
  },
  pillNone: {
    backgroundColor: "rgba(143, 168, 168, 0.1)",
    borderColor: "#8FA8A8",
  },
  pillText: {
    fontSize: 14,
    fontWeight: "600",
  },
  textNone: {
    color: "#8FA8A8",
  },
  loadingPill: {
    backgroundColor: "rgba(143, 168, 168, 0.2)",
    borderColor: "#8FA8A8",
  },
  loadingText: {
    color: "#8FA8A8",
    fontSize: 14,
    fontWeight: "600",
  },
});
