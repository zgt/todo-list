import type {
  BottomSheetBackdropProps,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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
  BottomSheetView,
  BottomSheetModal as BSModal,
} from "@gorhom/bottom-sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, CopyPlus, Filter, X } from "lucide-react-native";
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

export function CategoryFilter() {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["50%", "90%"], []);

  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [parentId, setParentId] = useState<string | null>(null);
  const [isParentSelectOpen, setIsParentSelectOpen] = useState(false);

  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isCreating) {
      bottomSheetRef.current?.snapToPosition("90%");
    }
  }, [isCreating]);

  const { data: categories } = useQuery(
    trpc.category.all.queryOptions(undefined, {
      enabled: !!session,
    }),
  );
  const { selectedCategoryIds, setSelectedCategoryIds } = useCategoryFilter();

  const tree = useMemo(() => {
    if (!categories) return [];
    return buildTree(categories);
  }, [categories]);

  const selectedParentName = useMemo(() => {
    if (!parentId || !categories) return null;
    return categories.find((c) => c.id === parentId)?.name;
  }, [parentId, categories]);

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

  const resetCreateForm = () => {
    setIsCreating(false);
    setNewCategoryName("");
    setSelectedColor(DEFAULT_COLOR);
    setParentId(null);
    setIsParentSelectOpen(false);
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
      parentId: parentId ?? undefined,
    });
  };

  const toggleCategory = useCallback(
    (id: string) => {
      setSelectedCategoryIds(
        selectedCategoryIds.includes(id)
          ? selectedCategoryIds.filter((cid) => cid !== id)
          : [...selectedCategoryIds, id],
      );
    },
    [selectedCategoryIds, setSelectedCategoryIds],
  );

  const toggleParentSelection = useCallback((id: string) => {
    setParentId((prev) => (prev === id ? null : id));
  }, []);

  const handleOpenSheet = useCallback(() => {
    bottomSheetRef.current?.present();
  }, []);

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

  if (!categories || categories.length === 0) return null;

  return (
    <>
      {/* Trigger Button */}
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

      {/* Bottom Sheet */}
      <BSModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Filter by Category</Text>
              {selectedCategoryIds.length > 0 && (
                <Pressable onPress={() => setSelectedCategoryIds([])}>
                  <Text style={styles.clearText}>Clear all</Text>
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

          {/* Create Category Form */}
          {isCreating ? (
            <BottomSheetScrollView
              style={styles.createForm}
              contentContainerStyle={styles.createFormContent}
            >
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
                  <View style={styles.parentList}>
                    {tree.map((node) => (
                      <CategoryTreeItem
                        key={node.id}
                        node={node}
                        depth={0}
                        selectedIds={parentId ? [parentId] : []}
                        onToggle={toggleParentSelection}
                      />
                    ))}
                  </View>
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
            </BottomSheetScrollView>
          ) : (
            /* Category Tree (Filter Mode) */
            <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
              {tree.map((node) => (
                <CategoryTreeItem
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedIds={selectedCategoryIds}
                  onToggle={toggleCategory}
                />
              ))}
            </BottomSheetScrollView>
          )}
        </BottomSheetView>
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
    flex: 1,
    backgroundColor: "#0A1A1A",
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#164B49",
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