import { useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text as RNText,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeOut,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { desc, eq, isNull, sql } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

import type { LocalTask } from "~/db/client";
import { db } from "~/db/client";
import { localCategory, localTask } from "~/db/schema";
import { syncManager } from "~/sync/manager";
import { authClient } from "~/utils/auth";
import { RefreshCw } from "lucide-react-native";
import { CategoryPill } from "../components/CategoryPill";
import { FAB } from "../components/FAB";
import { GradientBackground } from "../components/GradientBackground";
import { SwipeableCardStack } from "../components/SwipeableCardStack";
import CreateTask from "./_components/create-task";

function Header() {
  const { data: session } = authClient.useSession();
  return (
    <View className="mb-6 flex-row items-center justify-between px-4 pt-2">
      <RNText className="text-foreground text-4xl font-bold">
        Todo <RNText className="text-primary">list</RNText>
      </RNText>
      <View className="h-10 w-10 overflow-hidden rounded-full border-2 border-white/20">
        {session?.user.image ? (
          <Image
            source={{ uri: session.user.image }}
            className="h-full w-full"
          />
        ) : (
          <View className="bg-muted h-full w-full items-center justify-center">
            <RNText className="text-muted-foreground font-bold">
              {session?.user.name.charAt(0) ?? "?"}
            </RNText>
          </View>
        )}
      </View>
    </View>
  );
}

function Categories() {
  const categories = ["All", "Work", "Chores", "Groceries"];
  const [active, setActive] = useState("All");

  return (
    <View className="flex-row flex-wrap gap-3">
      {categories.map((cat) => (
        <CategoryPill
          key={cat}
          label={cat}
          active={active === cat}
          onPress={() => setActive(cat)}
        />
      ))}
    </View>
  );
}

function RefreshButton({
  onPress,
  isRefreshing,
}: {
  onPress: () => void;
  isRefreshing: boolean;
}) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isRefreshing) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      rotation.value = withTiming(0, { duration: 200 });
    }
  }, [isRefreshing, rotation]);

  return (
    <Pressable
      onPress={onPress}
      disabled={isRefreshing}
      accessibilityRole="button"
      accessibilityLabel={
        isRefreshing ? "Refreshing tasks" : "Refresh tasks"
      }
    >
      <Animated.View
        className="h-12 w-12 items-center justify-center rounded-full border-2 border-border bg-surface"
        style={[isRefreshing && { opacity: 0.6 }]}
      >
        <Animated.View style={{ transform: [{ rotate: `${rotation.value}deg` }] }}>
          <RefreshCw size={24} color="#DCE4E4" />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default function Index() {
  // const { data: session } = authClient.useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Separate live queries to ensure reactivity triggers correctly (joins can sometimes be flaky with listeners)
  const { data: rawTasks } = useLiveQuery(
    db
      .select()
      .from(localTask)
      .where(isNull(localTask.deletedAt))
      .orderBy(desc(localTask.createdAt)),
  );

  const { data: categories } = useLiveQuery(db.select().from(localCategory));

  const formattedTasks = useMemo(() => {
    // Add safety checks for loading states
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!rawTasks) return [];

    console.log(rawTasks);
    return rawTasks.map((task) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const category = categories?.find((c) => c.id === task.categoryId);
      if (category) {
        return {
          ...task,
          category: { name: category.name, color: category.color },
        };
      }
      return { ...task, category: null };
    });
  }, [rawTasks, categories]);

  // Register sync completion callback to refresh UI
  useEffect(() => {
    const unsubscribe = syncManager.onSyncComplete(() => {
      console.log("Sync completed, refreshing UI...");
      // Trigger a state update to ensure UI refreshes
      setRefreshTrigger((prev) => prev + 1);
    });

    return () => unsubscribe();
  }, []);

  // Sync formatted tasks from live query to local state
  useEffect(() => {
    setTasks(formattedTasks);
  }, [formattedTasks, refreshTrigger]);

  const handleToggle = async (id: string, completed: boolean) => {
    try {
      // 1. Optimistically update local state for immediate visual feedback
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === id ? { ...task, completed, updatedAt: new Date() } : task,
        ),
      );

      // 2. Update local DB
      await db
        .update(localTask)
        .set({
          completed,
          updatedAt: new Date(),
          syncStatus: "pending",
          localVersion: sql`${localTask.localVersion} + 1`,
        })
        .where(eq(localTask.id, id));

      // 3. Queue for sync
      await syncManager.queueOperation("task", id, "update", { completed });
    } catch (error) {
      console.error("Failed to toggle task:", error);
      // Revert optimistic update on error
      setTasks(formattedTasks);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // 1. Optimistically update local state for immediate visual feedback
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));

      // 2. Update local DB (hard delete to remove from UI instantly)
      await db.delete(localTask).where(eq(localTask.id, id));

      // 3. Queue for sync
      await syncManager.queueOperation("task", id, "delete", {});
    } catch (error) {
      console.error("Failed to delete task:", error);
      // Revert optimistic update on error
      setTasks(formattedTasks);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncManager.fullSync();
      // UI updates automatically via onSyncComplete callback
    } catch (error) {
      console.error("Manual refresh failed:", error);
      // Silent failure acceptable - background sync will retry
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        <Header />

        {tasks.length > 0 ? (
          <SwipeableCardStack
            tasks={tasks}
            onToggle={handleToggle}
            onComplete={(id) => handleToggle(id, true)}
            onDelete={handleDelete}
          />
        ) : (
          <View className="mt-10 items-center">
            <RNText className="text-muted-foreground text-center italic">
              No tasks yet. Tap + to create one!
            </RNText>
          </View>
        )}

        {/* Temporary: Show CreateTask when creating is true, or just put it at bottom */}
        {isCreating && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="absolute inset-0 z-50 items-end justify-end bg-black/20 p-4"
          >
            <Animated.View
              entering={ZoomIn.duration(250)}
              exiting={FadeOut}
              className="bg-background mr-2 mb-20 w-full max-w-[300px] rounded-2xl p-6 shadow-2xl"
            >
              <CreateTask onSuccess={() => setIsCreating(false)} />
            </Animated.View>
          </KeyboardAvoidingView>
        )}
        <View className="flex-row items-center gap-4 px-4 pb-4">
          <View className="flex-1">
            <Categories />
          </View>
          <RefreshButton onPress={handleRefresh} isRefreshing={isRefreshing} />
          <FAB onPress={() => setIsCreating(!isCreating)} />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}
