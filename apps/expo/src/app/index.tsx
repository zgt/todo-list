import { useEffect, useMemo, useState } from "react";
import { Keyboard, Pressable, Text as RNText, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { desc, eq, isNull, sql } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { RefreshCw } from "lucide-react-native";

import type { LocalTask } from "~/db/client";
import { db } from "~/db/client";
import { localCategory, localTask } from "~/db/schema";
import { syncManager } from "~/sync/manager";
import { authClient } from "~/utils/auth";
import { generateUUID } from "~/utils/uuid";
import { CategoryPill } from "../components/CategoryPill";
import { FAB } from "../components/FAB";
import { GradientBackground } from "../components/GradientBackground";
import { ProfileButton } from "../components/ProfileButton";
import { ProfileMenu } from "../components/ProfileMenu";
import { SignInButton } from "../components/SignInButton";
import { SwipeableCardStack } from "../components/SwipeableCardStack";
import CreateTask from "./_components/create-task";

function Header({ onProfilePress }: { onProfilePress: () => void }) {
  const { data: session } = authClient.useSession();
  return (
    <View className="mb-6 flex-row items-center justify-between px-4 pt-2">
      <RNText className="text-foreground text-4xl font-bold">
        Todo <RNText className="text-primary">list</RNText>
      </RNText>
      {session ? (
        <ProfileButton user={session.user} onPress={onProfilePress} />
      ) : (
        <SignInButton />
      )}
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
      accessibilityLabel={isRefreshing ? "Refreshing tasks" : "Refresh tasks"}
    >
      <Animated.View
        className="border-border bg-surface h-12 w-12 items-center justify-center rounded-full border-2"
        style={[isRefreshing && { opacity: 0.6 }]}
      >
        <Animated.View
          style={{ transform: [{ rotate: `${rotation.value}deg` }] }}
        >
          <RefreshCw size={24} color="#DCE4E4" />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default function Index() {
  const { data: session, isPending } = authClient.useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const sheetBottom = useSharedValue(0);

  // Separate live queries to ensure reactivity triggers correctly (joins can sometimes be flaky with listeners)
  const { data: rawTasks } = useLiveQuery(
    db
      .select()
      .from(localTask)
      .where(isNull(localTask.deletedAt))
      .orderBy(desc(localTask.createdAt)),
  );

  const { data: categories } = useLiveQuery(db.select().from(localCategory));

  const tasks = useMemo(() => {
    // Add safety checks for loading states
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!rawTasks) return [];

    console.log("📊 Raw tasks from DB:", rawTasks.length);
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
  }, [rawTasks, categories, refreshTrigger]);

  // Debug logging
  useEffect(() => {
    console.log("🔍 Index component render:", {
      sessionExists: !!session,
      isPending,
      tasksCount: tasks.length,
      rawTasksCount: rawTasks?.length ?? 0,
    });
  }, [session, isPending, tasks, rawTasks]);

  // Track keyboard height and animate sheet position
  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardWillShow", (e) => {
      const height = e.endCoordinates.height;
      sheetBottom.value = withSpring(height, {
        damping: 50,
        stiffness: 400,
      });
    });
    const hideSubscription = Keyboard.addListener("keyboardWillHide", () => {
      sheetBottom.value = withSpring(0, {
        damping: 50,
        stiffness: 400,
      });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [sheetBottom]);

  // Register sync completion callback to refresh UI
  useEffect(() => {
    const unsubscribe = syncManager.onSyncComplete(() => {
      console.log("Sync completed, triggering UI refresh...");
      // Trigger a re-computation of tasks memoization
      setRefreshTrigger((prev) => prev + 1);
    });

    return () => unsubscribe();
  }, []);

  const handleToggle = async (id: string, completed: boolean) => {
    try {
      // Update local DB - live query will automatically update UI
      await db
        .update(localTask)
        .set({
          completed,
          updatedAt: new Date(),
          syncStatus: "pending",
          localVersion: sql`${localTask.localVersion} + 1`,
        })
        .where(eq(localTask.id, id));

      // Queue for sync
      await syncManager.queueOperation("task", id, "update", { completed });
    } catch (error) {
      console.error("Failed to toggle task:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Update local DB (hard delete to remove from UI instantly) - live query will update UI
      await db.delete(localTask).where(eq(localTask.id, id));

      // Queue for sync
      await syncManager.queueOperation("task", id, "delete", {});
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const handleCreate = async (title: string, description: string) => {
    if (!session?.user) {
      throw new Error("User not authenticated");
    }

    const newTaskId = generateUUID();
    const now = new Date();

    const newTask: LocalTask = {
      id: newTaskId,
      userId: session.user.id,
      title: title.trim(),
      description: description.trim() || null,
      completed: false,
      createdAt: now,
      completedAt: null,
      archivedAt: null,
      updatedAt: now,
      deletedAt: null,
      syncStatus: "pending",
      lastSyncedAt: null,
      localVersion: 1,
      serverVersion: 0,
      categoryId: null,
      dueDate: null,
      orderIndex: 0,
    };

    try {
      // Insert into local DB - live query will automatically update UI
      await db.insert(localTask).values(newTask);

      // Queue for sync
      await syncManager.queueOperation("task", newTaskId, "create", {
        id: newTaskId,
        title: title.trim(),
        description: description.trim() || null,
      });
    } catch (error) {
      console.error("Failed to create task:", error);
      throw error;
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

  // Animated style for sheet position
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    bottom: sheetBottom.value,
  }));

  // Show loading state while session is pending
  if (isPending) {
    return (
      <GradientBackground>
        <SafeAreaView className="flex-1" edges={["top"]}>
          <View className="flex-1 items-center justify-center">
            <RNText className="text-foreground text-lg">Loading...</RNText>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Guard against no session (shouldn't happen due to _layout guard, but defensive)
  if (!session) {
    return (
      <GradientBackground>
        <SafeAreaView className="flex-1" edges={["top"]}>
          <View className="flex-1 items-center justify-center">
            <RNText className="text-foreground text-lg">Please sign in</RNText>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        <Header onProfilePress={() => setShowProfileMenu(true)} />

        <View className="px-4">
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
        </View>

        {/* Bottom button bar */}
        <View className="flex-row items-center gap-4 px-4 pt-4 pb-4">
          <View className="flex-1">
            <Categories />
          </View>
          <RefreshButton onPress={handleRefresh} isRefreshing={isRefreshing} />
          <FAB onPress={() => setIsCreating(!isCreating)} />
        </View>
      </SafeAreaView>

      {/* Bottom Sheet Overlay for CreateTask */}
      {isCreating && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
          }}
          pointerEvents="box-none"
        >
          {/* Backdrop */}
          <Pressable
            onPress={() => setIsCreating(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={{
                flex: 1,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
              }}
            />
          </Pressable>

          {/* Bottom Sheet */}
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={[
              {
                position: "absolute",
                left: 0,
                right: 0,
              },
              sheetAnimatedStyle,
            ]}
          >
            <View className="w-full rounded-t-3xl border-t border-white/10 bg-zinc-900 p-5 shadow-2xl">
              <CreateTask
                onCreate={handleCreate}
                onSuccess={() => setIsCreating(false)}
              />
            </View>
          </Animated.View>
        </View>
      )}

      {/* Profile Menu */}
      {session && (
        <ProfileMenu
          visible={showProfileMenu}
          onClose={() => setShowProfileMenu(false)}
          user={session.user}
        />
      )}
    </GradientBackground>
  );
}
