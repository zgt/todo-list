import { useCallback, useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Layers,
  MousePointerClick,
  RefreshCw,
  Square,
  Trash2,
  Undo2,
  X,
} from "lucide-react-native";

import { DemoCardStack, DemoListStack } from "~/components/DemoSwipeableCard";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const TOTAL_PAGES = 3;

// ── Shared UI components ────────────────────────────────────────────

function PaginationDots({
  currentPage,
  onPagePress,
}: {
  currentPage: number;
  onPagePress: (page: number) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
        <Pressable
          key={i}
          onPress={() => onPagePress(i)}
          hitSlop={8}
          style={{
            width: currentPage === i ? 24 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: currentPage === i ? "#50C878" : "#164B49",
          }}
        />
      ))}
    </View>
  );
}

function LegendRow({
  icon,
  color,
  label,
  description,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  description: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 6,
      }}
    >
      <View
        style={{
          backgroundColor: `${color}20`,
          height: 36,
          width: 36,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          flexShrink: 0,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#DCE4E4", fontSize: 14, fontWeight: "600" }}>
          {label}
        </Text>
        <Text style={{ color: "#8FA8A8", fontSize: 12, marginTop: 1 }}>
          {description}
        </Text>
      </View>
    </View>
  );
}

function LegendBox({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: "#102A2A",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#164B49",
      }}
    >
      {children}
    </View>
  );
}

/** Compact 2×2 direction legend for card view page */
function DirectionChip({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: "#102A2A",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#164B49",
      }}
    >
      <View
        style={{
          backgroundColor: `${color}20`,
          height: 28,
          width: 28,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
        }}
      >
        {icon}
      </View>
      <Text style={{ color: "#DCE4E4", fontSize: 12, fontWeight: "500" }}>
        {label}
      </Text>
    </View>
  );
}

// ── Page 1: List View ───────────────────────────────────────────────

function PageListView({
  onCardTouchStart,
  onCardTouchEnd,
}: {
  onCardTouchStart: () => void;
  onCardTouchEnd: () => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 24,
      }}
    >
      {/* Title section — fixed at top */}
      <View style={{ alignItems: "center", marginBottom: 4 }}>
        <Text
          style={{
            color: "#DCE4E4",
            fontSize: 24,
            fontWeight: "700",
            textAlign: "center",
            marginBottom: 2,
          }}
        >
          List View
        </Text>
        <Text
          style={{
            color: "#8FA8A8",
            fontSize: 14,
            textAlign: "center",
          }}
        >
          Swipe horizontally to manage tasks
        </Text>
      </View>

      {/* 3 interactive demo cards — disable scroll while touching */}
      <View
        onTouchStart={onCardTouchStart}
        onTouchEnd={onCardTouchEnd}
        onTouchCancel={onCardTouchEnd}
        style={{
          alignSelf: "center",
          marginBottom: 12,
        }}
      >
        <DemoListStack />
      </View>

      {/* Legend — 4 rows, pushed to bottom of remaining space */}
      <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: 8 }}>
        <LegendBox>
          <LegendRow
            icon={<ArrowLeft size={18} color="#50C878" />}
            color="#50C878"
            label="Swipe Left"
            description="Complete task (then delete)"
          />
          <LegendRow
            icon={<ArrowRight size={18} color="#3B82F6" />}
            color="#3B82F6"
            label="Swipe Right"
            description="Edit task (or undo complete)"
          />
          <LegendRow
            icon={<ChevronDown size={18} color="#8FA8A8" />}
            color="#8FA8A8"
            label="Tap"
            description="Expand to show subtasks and description"
          />
          <LegendRow
            icon={<MousePointerClick size={18} color="#3B82F6" />}
            color="#3B82F6"
            label="Double-Tap"
            description="Open edit form for the task"
          />
        </LegendBox>
      </View>
    </View>
  );
}

// ── Page 2: Card View ───────────────────────────────────────────────

function PageCardView({
  onCardTouchStart,
  onCardTouchEnd,
}: {
  onCardTouchStart: () => void;
  onCardTouchEnd: () => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
      }}
    >
      <Text
        style={{
          color: "#DCE4E4",
          fontSize: 24,
          fontWeight: "700",
          textAlign: "center",
          marginBottom: 4,
        }}
      >
        Card View
      </Text>
      <Text
        style={{
          color: "#8FA8A8",
          fontSize: 14,
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        Swipe in all 4 directions
      </Text>

      {/* Card stack demo — disable scroll while touching */}
      <View
        onTouchStart={onCardTouchStart}
        onTouchEnd={onCardTouchEnd}
        onTouchCancel={onCardTouchEnd}
        style={{ marginBottom: 10 }}
      >
        <DemoCardStack />
      </View>

      {/* Compact 2×2 direction legend */}
      <View style={{ alignSelf: "stretch", gap: 6 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <DirectionChip
            icon={<ArrowUp size={14} color="#50C878" />}
            label="Complete"
            color="#50C878"
          />
          <DirectionChip
            icon={<ArrowDown size={14} color="#3B82F6" />}
            label="Edit"
            color="#3B82F6"
          />
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <DirectionChip
            icon={<ArrowLeft size={14} color="#8FA8A8" />}
            label="Next card"
            color="#8FA8A8"
          />
          <DirectionChip
            icon={<ArrowRight size={14} color="#8FA8A8" />}
            label="Previous"
            color="#8FA8A8"
          />
        </View>
      </View>
    </View>
  );
}

// ── Page 3: Tips & Tricks ───────────────────────────────────────────

function PageTips() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
      }}
    >
      <Text
        style={{
          color: "#DCE4E4",
          fontSize: 24,
          fontWeight: "700",
          textAlign: "center",
          marginBottom: 4,
        }}
      >
        Tips & Tricks
      </Text>
      <Text
        style={{
          color: "#8FA8A8",
          fontSize: 14,
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        Get the most out of Tokilist
      </Text>

      <View style={{ alignSelf: "stretch" }}>
        <LegendBox>
          <LegendRow
            icon={<RefreshCw size={18} color="#50C878" />}
            color="#50C878"
            label="Pull to Refresh"
            description="Pull down on the task list to sync"
          />
          <LegendRow
            icon={<Edit3 size={18} color="#3B82F6" />}
            color="#3B82F6"
            label="Double-Tap to Edit"
            description="Double-tap a task in list view to edit"
          />
          <LegendRow
            icon={<Square size={18} color="#50C878" />}
            color="#50C878"
            label="Tap Checkbox"
            description="Tap the checkbox to toggle completion"
          />
          <LegendRow
            icon={<Trash2 size={18} color="#EF4444" />}
            color="#EF4444"
            label="Delete Flow"
            description="Complete → swipe again for delete → confirm"
          />
          <LegendRow
            icon={<Undo2 size={18} color="#F59E0B" />}
            color="#F59E0B"
            label="Undo Actions"
            description="Swipe opposite direction to undo or cancel"
          />
          <LegendRow
            icon={<Layers size={18} color="#8FA8A8" />}
            color="#8FA8A8"
            label="View Toggle"
            description="Switch between list, card, and calendar views"
          />
          <LegendRow
            icon={<Eye size={18} color="#8FA8A8" />}
            color="#8FA8A8"
            label="Expand Details"
            description="Tap a task in list view to show subtasks"
          />
        </LegendBox>
      </View>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────

export default function SwipeTutorialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const [contentHeight, setContentHeight] = useState(SCREEN_HEIGHT - 200);
  const isLastPage = currentPage === TOTAL_PAGES - 1;

  const goToPage = useCallback((page: number) => {
    const clamped = Math.max(0, Math.min(TOTAL_PAGES - 1, page));
    scrollRef.current?.scrollTo({
      x: clamped * SCREEN_WIDTH,
      animated: true,
    });
    setCurrentPage(clamped);
  }, []);

  // Disable scroll imperatively (no re-render) so card gestures get priority
  const handleCardTouchStart = useCallback(() => {
    (scrollRef.current as any)?.setNativeProps?.({ scrollEnabled: false });
  }, []);
  const handleCardTouchEnd = useCallback(() => {
    (scrollRef.current as any)?.setNativeProps?.({ scrollEnabled: true });
  }, []);

  const dismiss = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0A1A1A",
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingBottom: 4,
        }}
      >
        <Text style={{ color: "#8FA8A8", fontSize: 14, fontWeight: "500" }}>
          {currentPage + 1} / {TOTAL_PAGES}
        </Text>
        <Pressable
          onPress={dismiss}
          hitSlop={12}
          style={{
            height: 40,
            width: 40,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 20,
            backgroundColor: "#102A2A",
          }}
        >
          <X size={20} color="#DCE4E4" />
        </Pressable>
      </View>

      {/* Horizontal paging content */}
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const page = Math.round(
              e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
            );
            setCurrentPage(page);
          }}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          <View style={{ width: SCREEN_WIDTH, height: contentHeight }}>
            <PageListView
              onCardTouchStart={handleCardTouchStart}
              onCardTouchEnd={handleCardTouchEnd}
            />
          </View>
          <View style={{ width: SCREEN_WIDTH, height: contentHeight }}>
            <PageCardView
              onCardTouchStart={handleCardTouchStart}
              onCardTouchEnd={handleCardTouchEnd}
            />
          </View>
          <View style={{ width: SCREEN_WIDTH, height: contentHeight }}>
            <PageTips />
          </View>
        </ScrollView>
      </View>

      {/* Navigation footer */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        <Pressable
          onPress={() => currentPage > 0 && goToPage(currentPage - 1)}
          hitSlop={12}
          style={{
            opacity: currentPage > 0 ? 1 : 0.3,
            height: 44,
            width: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronLeft size={24} color="#DCE4E4" />
        </Pressable>

        <PaginationDots currentPage={currentPage} onPagePress={goToPage} />

        {isLastPage ? (
          <Pressable
            onPress={dismiss}
            style={{
              backgroundColor: "#50C878",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 9999,
            }}
          >
            <Text style={{ color: "#0A1A1A", fontWeight: "700", fontSize: 14 }}>
              Done
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => goToPage(currentPage + 1)}
            hitSlop={12}
            style={{
              height: 44,
              width: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronRight size={24} color="#DCE4E4" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
