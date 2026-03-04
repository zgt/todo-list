import type {
  BottomSheetBackdropProps,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { runOnJS } from "react-native-reanimated";
import {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetModal as BSModal,
} from "@gorhom/bottom-sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  CopyPlus,
  Filter,
  X,
} from "lucide-react-native";
import ColorPicker, {
  HueSlider,
  Panel1,
  Preview,
} from "reanimated-color-picker";

import type { CategoryNode } from "./category-tree-item";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";
import { useCategoryFilter } from "./category-filter-context";
import { CategoryTreeItem } from "./category-tree-item";

const DEFAULT_COLOR = "#50C878";

function buildTree(
  categories: {
    id: string;
    name: string;
    color: string;
    icon: string | null;
    parentId: string | null;
    sortOrder: number;
  }[],
): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of categories) {
    const node = map.get(cat.id);
    if (!node) continue;
    if (cat.parentId) {
      const parent = map.get(cat.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  const sortFn = (a: CategoryNode, b: CategoryNode) =>
    a.sortOrder - b.sortOrder;
  roots.sort(sortFn);
  for (const node of map.values()) {
    node.children.sort(sortFn);
  }

  return roots;
}

export interface CategoryFilterProps {
  mode?: "filter" | "select";
  selectedCategoryId?: string | null;
  onCategoryChange?: (categoryId: string | null) => void;
  trigger?: ReactNode;
}

export function CategoryFilter({
  mode = "filter",
  selectedCategoryId,
  onCategoryChange,
  trigger,
}: CategoryFilterProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [parentId, setParentId] = useState<string | null>(null);
  const [isParentSelectOpen, setIsParentSelectOpen] = useState(false);

  const snapPoints = useMemo(() => ["50%", "100%"], []);

  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isCreating) {
      bottomSheetRef.current?.expand();
    }
  }, [isCreating]);

  const { data: categories } = useQuery(
    trpc.category.all.queryOptions(undefined, {
      enabled: !!session,
    }),
  );
  const { selectedCategoryIds, setSelectedCategoryIds } = useCategoryFilter();

  const effectiveSelectedIds = useMemo(() => {
    if (mode === "select") {
      return selectedCategoryId ? [selectedCategoryId] : [];
    }
    return selectedCategoryIds;
  }, [mode, selectedCategoryId, selectedCategoryIds]);

  const tree = useMemo(() => {
    if (!categories) return [];
    return buildTree(categories);
  }, [categories]);

  const selectedParentName = useMemo(() => {
    if (!parentId || !categories) return null;
    return categories.find((c) => c.id === parentId)?.name;
  }, [parentId, categories]);

  const resetCreateForm = useCallback(() => {
    setIsCreating(false);
    setNewCategoryName("");
    setSelectedColor(DEFAULT_COLOR);
    setParentId(null);
    setIsParentSelectOpen(false);
  }, []);

  const createCategory = useMutation(trpc.category.create.mutationOptions());

  const handleMutationSuccess = useCallback(
    (newCategory: { id: string }) => {
      void queryClient.invalidateQueries(trpc.category.all.queryFilter());
      resetCreateForm();
      if (mode === "select" && onCategoryChange) {
        onCategoryChange(newCategory.id);
        bottomSheetRef.current?.dismiss();
      }
    },
    [queryClient, mode, onCategoryChange, resetCreateForm],
  );

  const handleMutationError = useCallback((err: { message?: string }) => {
    Alert.alert(
      "Error",
      err.message ?? "Failed to create category. Please try again.",
    );
  }, []);

  const handleCreateCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }
    createCategory.mutate(
      {
        name: trimmedName,
        color: selectedColor,
        parentId: parentId ?? undefined,
      },
      {
        onSuccess: handleMutationSuccess,
        onError: handleMutationError,
      },
    );
  };

  const toggleCategory = useCallback(
    (id: string) => {
      if (mode === "select") {
        onCategoryChange?.(id);
        bottomSheetRef.current?.dismiss();
      } else {
        setSelectedCategoryIds(
          selectedCategoryIds.includes(id)
            ? selectedCategoryIds.filter((cid) => cid !== id)
            : [...selectedCategoryIds, id],
        );
      }
    },
    [mode, onCategoryChange, selectedCategoryIds, setSelectedCategoryIds],
  );

  const handleClear = () => {
    if (mode === "select") {
      onCategoryChange?.(null);
      bottomSheetRef.current?.dismiss();
    } else {
      setSelectedCategoryIds([]);
    }
  };

  const toggleParentSelection = useCallback((id: string) => {
    setParentId((prev) => (prev === id ? null : id));
  }, []);

  const handleOpenSheet = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetRef.current?.present();
  }, []);

  const handleDismiss = useCallback(() => {
    if (isCreating) {
      resetCreateForm();
    }
  }, [isCreating, resetCreateForm]);

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

  const onSelectColor = ({ hex }: { hex: string }) => {
    console.log("🎨 Color selected:", hex);
    try {
      setSelectedColor(hex);
    } catch (error) {
      console.error("❌ Error setting color:", error);
    }
  };

  const handleColorSelect = (res: { hex: string }) => {
    "worklet";
    runOnJS(onSelectColor)(res);
  };

  if (!categories) return null;

  return (
    <>
      {/* Trigger Button */}
      {trigger ? (
        <Pressable onPress={handleOpenSheet}>{trigger}</Pressable>
      ) : (
        <Pressable
          onPress={handleOpenSheet}
          style={[
            styles.triggerButton,
            selectedCategoryIds.length > 0 && styles.triggerButtonActive,
          ]}
        >
          <Filter size={16} color="#8FA8A8" />
          <Text style={styles.triggerText}>Category</Text>
          {selectedCategoryIds.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{selectedCategoryIds.length}</Text>
            </View>
          )}
        </Pressable>
      )}

      {/* Bottom Sheet */}
      <BSModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        onDismiss={handleDismiss}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        {/* Create Category Form */}
        {isCreating ? (
          <BottomSheetScrollView
            style={styles.contentContainer}
            contentContainerStyle={styles.createFormContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>
                  {mode === "select" ? "Select Category" : "Filter by Category"}
                </Text>
              </View>
              <Pressable
                onPress={() => setIsCreating(true)}
                style={styles.addButton}
                accessibilityLabel="Add new category"
                accessibilityRole="button"
              >
                <CopyPlus size={22} color="#50C878" />
              </Pressable>
            </View>

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
                autoCorrect={true}
                autoCapitalize="words"
                autoFocus
              />

              {/* Parent Category Selector */}
              <View style={styles.parentSelectorContainer}>
                <Pressable
                  style={styles.parentSelectorButton}
                  onPress={() => setIsParentSelectOpen(!isParentSelectOpen)}
                >
                  <Text style={styles.parentSelectorLabel}>
                    {selectedParentName
                      ? `Parent: ${selectedParentName}`
                      : "Select Parent Category (Optional)"}
                  </Text>
                  {isParentSelectOpen ? (
                    <ChevronUp size={16} color="#8FA8A8" />
                  ) : (
                    <ChevronDown size={16} color="#8FA8A8" />
                  )}
                </Pressable>

                {isParentSelectOpen && (
                  <BottomSheetScrollView
                    style={styles.parentList}
                    nestedScrollEnabled
                  >
                    {tree.map((node) => (
                      <CategoryTreeItem
                        key={node.id}
                        node={node}
                        depth={0}
                        selectedIds={parentId ? [parentId] : []}
                        onToggle={toggleParentSelection}
                      />
                    ))}
                  </BottomSheetScrollView>
                )}
              </View>

              <View style={styles.colorPickerContainer}>
                <ColorPicker
                  style={styles.colorPicker}
                  value={selectedColor}
                  onComplete={handleColorSelect}
                >
                  <Preview hideInitialColor style={styles.colorPreview} />
                  <Panel1 style={styles.colorPanel} />
                  <HueSlider style={styles.hueSlider} />
                </ColorPicker>
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
          </BottomSheetScrollView>
        ) : (
          /* Category Tree (Filter Mode) */
          <BottomSheetScrollView
            style={styles.contentContainer}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>
                  {mode === "select" ? "Select Category" : "Filter by Category"}
                </Text>
                {(mode === "filter"
                  ? selectedCategoryIds.length > 0
                  : true) && (
                  <Pressable onPress={handleClear}>
                    <Text style={styles.clearText}>
                      {mode === "select" ? "None" : "Clear all"}
                    </Text>
                  </Pressable>
                )}
              </View>
              <Pressable
                onPress={() => setIsCreating(true)}
                style={styles.addButton}
                accessibilityLabel="Add new category"
                accessibilityRole="button"
              >
                <CopyPlus size={22} color="#50C878" />
              </Pressable>
            </View>

            {tree.map((node) => (
              <CategoryTreeItem
                key={node.id}
                node={node}
                depth={0}
                selectedIds={effectiveSelectedIds}
                onToggle={toggleCategory}
              />
            ))}
          </BottomSheetScrollView>
        )}
      </BSModal>
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
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#164B49",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#DCE4E4",
  },
  clearText: {
    fontSize: 14,
    color: "#50C878",
    marginTop: 4,
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
  },
  createForm: {
    backgroundColor: "#0A1A1A",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  createFormContent: {
    padding: 16,
    paddingBottom: 40,
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
  parentSelectorContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#164B49",
    borderRadius: 8,
    backgroundColor: "#102A2A",
    overflow: "hidden",
  },
  parentSelectorButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  parentSelectorLabel: {
    color: "#DCE4E4",
    fontSize: 14,
  },
  parentList: {
    maxHeight: 200,
    borderTopWidth: 1,
    borderTopColor: "#164B49",
    padding: 8,
  },
  colorPickerContainer: {
    marginBottom: 24,
  },
  colorPicker: {
    gap: 12,
  },
  colorPreview: {
    height: 40,
    borderRadius: 8,
    marginBottom: 8,
  },
  colorPanel: {
    height: 150,
    borderRadius: 8,
  },
  hueSlider: {
    height: 24,
    borderRadius: 8,
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
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 24,
  },
});
