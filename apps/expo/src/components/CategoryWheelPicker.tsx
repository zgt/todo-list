import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CategoryWheelPickerProps {
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 1;
const VISIBLE_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const DRAG_EXTENSION = 40; // Extra invisible drag area above and below
const TOUCH_AREA_HEIGHT = VISIBLE_HEIGHT + DRAG_EXTENSION * 2;
const VERTICAL_PADDING = DRAG_EXTENSION;

interface CategoryItem {
  id: string | null;
  name: string;
  color: string;
}

const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList<CategoryItem>,
);

// Separate component for animated pill items
function CategoryPillItem({
  item,
  index,
  scrollY,
}: {
  item: CategoryItem;
  index: number;
  scrollY: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [
        (index - 1) * ITEM_HEIGHT,
        index * ITEM_HEIGHT,
        (index + 1) * ITEM_HEIGHT,
      ],
      [0.8, 1, 0.8],
      "clamp",
    );

    const opacity = interpolate(
      scrollY.value,
      [
        (index - 0.5) * ITEM_HEIGHT,
        index * ITEM_HEIGHT,
        (index + 0.5) * ITEM_HEIGHT,
      ],
      [0, 1, 0],
      "clamp",
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Calculate lighter background color (20% opacity)
  const bgColor = `${item.color}33`; // 33 = 20% opacity in hex

  return (
    <Animated.View style={[styles.itemContainer, animatedStyle]}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: bgColor,
            borderColor: item.color,
          },
        ]}
      >
        <Text
          style={[styles.pillText, { color: item.color }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </View>
    </Animated.View>
  );
}

export function CategoryWheelPicker({
  selectedCategoryId,
  onCategoryChange,
}: CategoryWheelPickerProps) {
  const { data: session } = authClient.useSession();
  const flatListRef = useRef<FlatList<CategoryItem>>(null);
  const scrollY = useSharedValue(0);

  const { data: categories, isLoading } = useQuery(
    trpc.category.all.queryOptions(undefined, {
      enabled: !!session,
    }),
  );

  // Memoize items array with "None" option at the beginning
  const items = useMemo<CategoryItem[]>(
    () => [
      { id: null, name: "None", color: "#8FA8A8" },
      ...(categories?.map((c: Category) => ({
        id: c.id,
        name: c.name,
        color: c.color,
      })) ?? []),
    ],
    [categories],
  );

  // Find initial index based on selectedCategoryId
  const getInitialIndex = useCallback(() => {
    if (selectedCategoryId === null) return 0;
    const index = items.findIndex((item) => item.id === selectedCategoryId);
    return index === -1 ? 0 : index;
  }, [selectedCategoryId, items]);

  // Scroll to initial selection when categories load
  useEffect(() => {
    if (!isLoading && categories && flatListRef.current) {
      const initialIndex = getInitialIndex();
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: initialIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
  }, [isLoading, categories, getInitialIndex]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      const selectedItem = items[clampedIndex];

      if (selectedItem && selectedItem.id !== selectedCategoryId) {
        console.log(selectedItem.id);
        onCategoryChange(selectedItem.id);
      }
    },
    [items, selectedCategoryId, onCategoryChange],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CategoryItem; index: number }) => {
      return <CategoryPillItem item={item} index={index} scrollY={scrollY} />;
    },
    [scrollY],
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={[styles.pill, styles.loadingPill]}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AnimatedFlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id ?? "none"}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{
          paddingVertical: VERTICAL_PADDING,
        }}
        onScroll={scrollHandler}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: TOUCH_AREA_HEIGHT,
    marginVertical: -DRAG_EXTENSION,
  },
  loadingContainer: {
    height: VISIBLE_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 8,
  },
  itemContainer: {
    height: ITEM_HEIGHT,
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
  pillText: {
    fontSize: 14,
    fontWeight: "600",
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
