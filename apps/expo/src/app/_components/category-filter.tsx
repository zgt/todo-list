import type { BottomSheetBackdropProps, BottomSheetModal } from "@gorhom/bottom-sheet";
import { useCallback, useMemo, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal as BSModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react-native";

import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";
import { useCategoryFilter } from "./category-filter-context";
import type { CategoryNode } from "./category-tree-item";
import { CategoryTreeItem } from "./category-tree-item";

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
  const snapPoints = useMemo(() => ["50%", "75%"], []);

  const { data: session } = authClient.useSession();
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

  if (!categories || categories.length === 0) return null;

  return (
    <>
      {/* Trigger Button */}
      <Pressable
        onPress={handleOpenSheet}
        className={`h-11 flex-row items-center gap-1 rounded-full border-2 px-4 ${
          selectedCategoryIds.length > 0
            ? "border-emerald-400 bg-[#102A2A]"
            : "border-[#164B49] bg-transparent"
        }`}
      >
        <Filter size={16} color="#8FA8A8" />
        <Text className="ml-1 text-sm font-medium text-[#DCE4E4]">
          Category
        </Text>
        {selectedCategoryIds.length > 0 && (
          <View className="ml-1 h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
            <Text className="text-[10px] font-bold text-[#0A1A1A]">
              {selectedCategoryIds.length}
            </Text>
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
        backgroundStyle={{
          backgroundColor: "#102A2A",
        }}
        handleIndicatorStyle={{
          backgroundColor: "#8FA8A8",
        }}
      >
        <View className="px-4 pb-2">
          <Text className="text-lg font-semibold text-[#DCE4E4]">
            Filter by Category
          </Text>
          {selectedCategoryIds.length > 0 && (
            <Pressable
              onPress={() => setSelectedCategoryIds([])}
              className="mt-2"
            >
              <Text className="text-sm text-emerald-400">Clear all</Text>
            </Pressable>
          )}
        </View>
        <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
          <View className="gap-0.5">
            {tree.map((node) => (
              <CategoryTreeItem
                key={node.id}
                node={node}
                depth={0}
                selectedIds={selectedCategoryIds}
                onToggle={toggleCategory}
              />
            ))}
          </View>
        </BottomSheetScrollView>
      </BSModal>
    </>
  );
}
