import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CopyPlus, Trash2, X } from "lucide-react-native";

import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

interface Category {
  id: string;
  name: string;
  color: string;
}

export interface CategoryManagementSheetRef {
  present: () => void;
  dismiss: () => void;
}

const PRESET_COLORS = [
  "#50C878", // Emerald green (primary)
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
];

export const CategoryManagementSheet = forwardRef<CategoryManagementSheetRef>(
  (_, ref) => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]!);

    const { data: session } = authClient.useSession();
    const queryClient = useQueryClient();

    const snapPoints = useMemo(() => ["50%", "90%"], []);

    // Snap to 90% when creating a new category
    useEffect(() => {
      if (isCreating) {
        bottomSheetRef.current?.snapToPosition("90%");
      }
    }, [isCreating]);

    const { data: categories, isLoading } = useQuery(
      trpc.category.all.queryOptions(undefined, {
        enabled: !!session,
      }),
    );

    const createCategory = useMutation(
      trpc.category.create.mutationOptions({
        onSuccess: async () => {
          await queryClient.invalidateQueries(trpc.category.all.queryFilter());
          resetCreateForm();
        },
        onError: (err) => {
          Alert.alert(
            "Error",
            err.message || "Failed to create category. Please try again.",
          );
        },
      }),
    );

    const deleteCategory = useMutation(
      trpc.category.delete.mutationOptions({
        onSuccess: async () => {
          await queryClient.invalidateQueries(trpc.category.all.queryFilter());
        },
        onError: () => {
          Alert.alert("Error", "Failed to delete category. Please try again.");
        },
      }),
    );

    useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.present(),
      dismiss: () => bottomSheetRef.current?.dismiss(),
    }));

    const resetCreateForm = () => {
      setIsCreating(false);
      setNewCategoryName("");
      setSelectedColor(PRESET_COLORS[0]!);
    };

    const handleCreateCategory = () => {
      const trimmedName = newCategoryName.trim();
      if (!trimmedName) {
        Alert.alert("Error", "Please enter a category name");
        return;
      }

      createCategory.mutate({
        name: trimmedName,
        color: selectedColor,
      });
    };

    const handleDeleteCategory = (category: Category) => {
      Alert.alert(
        "Delete Category",
        `Are you sure you want to delete "${category.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteCategory.mutate(category.id),
          },
        ],
      );
    };

    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.6}
        />
      ),
      [],
    );

    const renderCategoryItem = useCallback(
      ({ item }: { item: Category }) => (
        <View style={styles.categoryItem}>
          <View style={styles.categoryInfo}>
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <Text style={styles.categoryName}>{item.name}</Text>
          </View>
          <Pressable
            onPress={() => handleDeleteCategory(item)}
            style={styles.deleteButton}
            accessibilityLabel={`Delete ${item.name}`}
            accessibilityRole="button"
          >
            <Trash2 size={18} color="#EF4444" />
          </Pressable>
        </View>
      ),
      [deleteCategory],
    );

    const ListEmptyComponent = useCallback(
      () => (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No categories yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Tap the + button to create your first category
          </Text>
        </View>
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Categories</Text>
            <Pressable
              onPress={() => setIsCreating(true)}
              style={styles.addButton}
              accessibilityLabel="Add new category"
              accessibilityRole="button"
            >
              <CopyPlus size={22} color="#50C878" />
            </Pressable>
          </View>

          {/* Create Category Form */}
          {isCreating && (
            <View style={styles.createForm}>
              <View style={styles.createFormHeader}>
                <Text style={styles.createFormTitle}>New Category</Text>
                <Pressable
                  onPress={resetCreateForm}
                  style={styles.closeButton}
                  accessibilityLabel="Cancel"
                  accessibilityRole="button"
                >
                  <X size={18} color="#8FA8A8" />
                </Pressable>
              </View>

              <TextInput
                style={styles.input}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="Category name"
                placeholderTextColor="#52525B"
                selectionColor="#50C878"
                maxLength={100}
                autoFocus
              />

              <View style={styles.colorPicker}>
                {PRESET_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => setSelectedColor(color)}
                    style={[
                      styles.colorOption,
                      selectedColor === color && {
                        borderColor: color,
                        borderWidth: 2,
                      },
                    ]}
                    accessibilityLabel={`Select color ${color}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedColor === color }}
                  >
                    <View
                      style={[styles.colorSwatch, { backgroundColor: color }]}
                    />
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={handleCreateCategory}
                disabled={createCategory.isPending || !newCategoryName.trim()}
                style={[
                  styles.createButton,
                  (!newCategoryName.trim() || createCategory.isPending) &&
                    styles.createButtonDisabled,
                ]}
                accessibilityLabel="Create category"
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.createButtonText,
                    (!newCategoryName.trim() || createCategory.isPending) &&
                      styles.createButtonTextDisabled,
                  ]}
                >
                  {createCategory.isPending ? "Creating..." : "Create"}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Category List */}
          <BottomSheetFlatList<Category>
            data={categories ?? []}
            keyExtractor={(item: Category) => item.id}
            renderItem={renderCategoryItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={isLoading ? null : ListEmptyComponent}
            showsVerticalScrollIndicator={false}
          />
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

CategoryManagementSheet.displayName = "CategoryManagementSheet";

const styles = StyleSheet.create({
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
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#164B49",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#DCE4E4",
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
  },
  createForm: {
    backgroundColor: "#0A1A1A",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#164B49",
  },
  createFormHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  createFormTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DCE4E4",
  },
  closeButton: {
    padding: 4,
  },
  input: {
    backgroundColor: "#102A2A",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#DCE4E4",
    borderWidth: 1,
    borderColor: "#164B49",
    marginBottom: 12,
  },
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  colorOption: {
    padding: 3,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 9999,
  },
  createButton: {
    backgroundColor: "#50C878",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  createButtonDisabled: {
    backgroundColor: "#27272A",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0A1A1A",
  },
  createButtonTextDisabled: {
    color: "#52525B",
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "#0A1A1A",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#164B49",
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: "#DCE4E4",
    fontWeight: "500",
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#DCE4E4",
    fontWeight: "500",
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#8FA8A8",
  },
});
