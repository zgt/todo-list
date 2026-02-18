import type { TRPCClientErrorLike } from "@trpc/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  Pressable,
  Text as RNText,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
// SQLite imports preserved for future offline work (unused currently)
//import type { LocalTask } from "~/db/client";
//import { db } from "~/db/client";
//import { localCategory, localTask } from "~/db/schema";
//import { syncManager } from "~/sync/manager";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// SQLite imports preserved for future offline work
//import { desc, eq, isNull, sql } from "drizzle-orm";
//import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Layers, List, RefreshCw } from "lucide-react-native";

import type { AppRouter, RouterOutputs } from "@acme/api";

import { useWidgetSync } from "~/hooks/useWidgetSync";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";
//import { generateUUID } from "~/utils/uuid";
import { FAB } from "../components/FAB";
import { GradientBackground } from "../components/GradientBackground";
import { ProfileButton } from "../components/ProfileButton";
import { ProfileMenu } from "../components/ProfileMenu";
import { SignInButton } from "../components/SignInButton";
import { SwipeableCardStack } from "../components/SwipeableCardStack";
import type { PriorityLevel } from "../components/priority-config";
import { CategoryFilter } from "./_components/category-filter";
import { useCategoryFilter } from "./_components/category-filter-context";
import { PriorityFilter } from "~/components/priority-filter";

const DUMMY_TASK_ID = "dummy-create-task";

function Header({ onProfilePress }: { onProfilePress: () => void }) {
  const { data: session } = authClient.useSession();
  return (
    <View className="mb-6 flex-row items-center justify-between px-4 pt-2">
      <RNText className="text-foreground text-4xl font-bold">
        Toki <RNText className="text-primary">list</RNText>
      </RNText>
      {session ? (
        <ProfileButton user={session.user} onPress={onProfilePress} />
      ) : (
        <SignInButton provider={Platform.OS === "ios" ? "apple" : "discord"} />
      )}
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
      // Start from current position and add 360 for continuous spin
      const startRotation = rotation.value % 360;
      rotation.value = startRotation;
      rotation.value = withRepeat(
        withTiming(startRotation + 360, {
          duration: 1000,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
    } else {
      // Stop animation but keep current rotation
      cancelAnimation(rotation);
    }
  }, [isRefreshing, rotation]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

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
        <Animated.View style={animatedIconStyle}>
          <RefreshCw size={24} color="#DCE4E4" />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function ViewToggleButton({
  viewMode,
  onToggle,
}: {
  viewMode: "stack" | "list";
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={
        viewMode === "stack" ? "Switch to list view" : "Switch to card view"
      }
    >
      <Animated.View className="border-border bg-surface h-12 w-12 items-center justify-center rounded-full border-2">
        {viewMode === "stack" ? (
          <List size={24} color="#DCE4E4" />
        ) : (
          <Layers size={24} color="#DCE4E4" />
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function Index() {
  const { data: session, isPending } = authClient.useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [viewMode, setViewMode] = useState<"stack" | "list">("stack");
  const [rippleTrigger, setRippleTrigger] = useState(0);
  const rippleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRipple = useCallback(() => {
    if (rippleDebounceRef.current) return;
    setRippleTrigger((prev) => prev + 1);
    rippleDebounceRef.current = setTimeout(() => {
      rippleDebounceRef.current = null;
    }, 500);
  }, []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { effectiveCategoryIds } = useCategoryFilter();
  const [selectedPriorities, setSelectedPriorities] = useState<PriorityLevel[]>(
    [],
  );

  const queryClient = useQueryClient();

  // Fetch tasks from server via tRPC
  const {
    data: serverTasks,
    isLoading: isLoadingTasks,
    isFetching,
    refetch,
  } = useQuery(
    trpc.task.all.queryOptions(undefined, {
      enabled: !!session,
    }),
  );

  // Trigger ripple when any query fetch starts
  useEffect(() => {
    if (isFetching) triggerRipple();
  }, [isFetching, triggerRipple]);

  // Use useMemo with only serverTasks dependency to ensure optimistic updates work
  // while maintaining stable reference for other hooks
  const tasks = useMemo(() => {
    if (!serverTasks) return [];

    // Server response already includes category relations
    // Map to include fields expected by SwipeableCardStack (LocalTask type)
    const priorityOrder: Record<string, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    return [...serverTasks]
      .sort((a, b) => {
        // Primary sort: Completion status (incomplete first)
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }

        // Secondary sort: Priority
        const priorityA = a.priority ?? "medium";
        const priorityB = b.priority ?? "medium";
        const priorityDiff =
          (priorityOrder[priorityA] ?? 1) - (priorityOrder[priorityB] ?? 1);

        if (priorityDiff !== 0) return priorityDiff;

        // Tertiary sort: Creation date (newest first)
        return b.createdAt.getTime() - a.createdAt.getTime();
      })
      .map((task: RouterOutputs["task"]["all"][number]) => ({
        ...task,
        updatedAt: task.updatedAt ?? task.createdAt, // Ensure updatedAt is never null
        category: task.category
          ? {
              name: task.category.name,
              color: task.category.color,
            }
          : null,
        // Add sync-related fields for type compatibility (unused in server-only mode)
        syncStatus: "synced" as const,
        localVersion: task.version,
        serverVersion: task.version,
        lastSyncedAt: new Date(),
        orderIndex: 0,
        priority: task.priority as "high" | "medium" | "low" | null,
      }));
  }, [serverTasks]); // Only depend on serverTasks, not refreshTrigger

  // Filter tasks by selected categories (including descendants)
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (effectiveCategoryIds.length > 0) {
      result = tasks.filter(
        (task) =>
          task.categoryId && effectiveCategoryIds.includes(task.categoryId),
      );
    }

    if (selectedPriorities.length > 0) {
      result = result.filter((task) =>
        selectedPriorities.includes(task.priority as PriorityLevel),
      );
    }

    if (isCreating && session) {
      const dummyTask = {
        id: DUMMY_TASK_ID,
        title: "",
        description: null,
        completed: false,
        completedAt: null,
        dueDate: null,
        archivedAt: null,
        categoryId: null,
        userId: session.user.id,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastSyncedAt: new Date(),
        orderIndex: 0,
        syncStatus: "synced" as const,
        localVersion: 0,
        serverVersion: 0,
        category: null,
        priority: "medium" as PriorityLevel,
      };
      // Prepend
      return [dummyTask, ...result];
    }
    return result;
  }, [tasks, effectiveCategoryIds, isCreating, session, selectedPriorities]);

  // Sync tasks to iOS widget whenever they change
  useWidgetSync(tasks, !!session);

  // Debug logging
  useEffect(() => {
    console.log("🔍 Index component render:", {
      sessionExists: !!session,
      isPending,
      tasksCount: tasks.length,
      serverTasksCount: serverTasks?.length ?? 0,
      isLoadingTasks,
    });
  }, [session, isPending, tasks, serverTasks, isLoadingTasks]);

  // tRPC mutation for toggling task completion with optimistic update
  const toggleMutation = useMutation(
    trpc.task.update.mutationOptions({
      onMutate: async (updatedTask) => {
        triggerRipple();
        // Cancel outgoing refetches
        await queryClient.cancelQueries(trpc.task.all.queryFilter());

        // Snapshot the previous value
        const previousTasks = queryClient.getQueryData<
          RouterOutputs["task"]["all"]
        >(trpc.task.all.queryKey());

        // Optimistically update the task
        if (previousTasks) {
          queryClient.setQueryData<RouterOutputs["task"]["all"]>(
            trpc.task.all.queryKey(),
            previousTasks.map((task) =>
              task.id === updatedTask.id
                ? {
                    ...task,
                    completed: updatedTask.completed ?? false,
                    updatedAt: new Date(),
                  }
                : task,
            ),
          );
        }

        return { previousTasks };
      },
      onError: (
        error: TRPCClientErrorLike<AppRouter>,
        updatedTask,
        context,
      ) => {
        // Rollback on error
        if (context?.previousTasks) {
          queryClient.setQueryData(
            trpc.task.all.queryKey(),
            context.previousTasks,
          );
        }
        console.error("Failed to toggle task:", error);
        Alert.alert(
          "Failed to update task",
          "Your task couldn't be updated. Please try again.",
        );
      },
      onSettled: async () => {
        // Always refetch after error or success to ensure consistency
        await queryClient.invalidateQueries(trpc.task.all.queryFilter());
      },
    }),
  );

  const handleToggle = async (id: string, completed: boolean) => {
    await toggleMutation.mutateAsync({ id, completed });
  };

  // tRPC mutation for generic task updates
  const updateMutation = useMutation(
    trpc.task.update.mutationOptions({
      onMutate: async (updatedTask) => {
        triggerRipple();
        // Cancel outgoing refetches
        await queryClient.cancelQueries(trpc.task.all.queryFilter());

        // Snapshot the previous value
        const previousTasks = queryClient.getQueryData<
          RouterOutputs["task"]["all"]
        >(trpc.task.all.queryKey());

        // Optimistically update the task
        if (previousTasks) {
          queryClient.setQueryData<RouterOutputs["task"]["all"]>(
            trpc.task.all.queryKey(),
            previousTasks.map((task) =>
              task.id === updatedTask.id
                ? {
                    ...task,
                    ...updatedTask,
                    updatedAt: new Date(),
                  }
                : task,
            ),
          );
        }

        return { previousTasks };
      },
      onError: (
        error: TRPCClientErrorLike<AppRouter>,
        updatedTask,
        context,
      ) => {
        // Rollback on error
        if (context?.previousTasks) {
          queryClient.setQueryData(
            trpc.task.all.queryKey(),
            context.previousTasks,
          );
        }
        console.error("Failed to update task:", error);
        Alert.alert(
          "Failed to update task",
          "Your task couldn't be updated. Please try again.",
        );
      },
      onSettled: async () => {
        // Always refetch after error or success to ensure consistency
        await queryClient.invalidateQueries(trpc.task.all.queryFilter());
      },
    }),
  );

  const handleUpdate = async (
    id: string,
    updates: Partial<{
      title: string;
      description: string;
      categoryId: string | null;
      dueDate: Date | null;
      priority: PriorityLevel;
    }>,
  ) => {
    if (id === DUMMY_TASK_ID) {
      if (!updates.title) return;
      // Remove dummy BEFORE creating to avoid duplicate with optimistic task
      setIsCreating(false);
      await handleCreate(
        updates.title,
        updates.description ?? "",
        updates.categoryId ?? undefined,
        updates.dueDate ?? undefined,
        updates.priority ?? "medium",
      );
      return;
    }
    await updateMutation.mutateAsync({ id, ...updates });
  };

  // tRPC mutation for deleting task with optimistic update
  const deleteMutation = useMutation(
    trpc.task.delete.mutationOptions({
      onMutate: async (taskId) => {
        triggerRipple();
        // Cancel outgoing refetches
        await queryClient.cancelQueries(trpc.task.all.queryFilter());

        // Snapshot the previous value
        const previousTasks = queryClient.getQueryData<
          RouterOutputs["task"]["all"]
        >(trpc.task.all.queryKey());

        // Optimistically remove the task
        if (previousTasks) {
          queryClient.setQueryData<RouterOutputs["task"]["all"]>(
            trpc.task.all.queryKey(),
            previousTasks.filter((task) => task.id !== taskId),
          );
        }

        return { previousTasks };
      },
      onError: (error: TRPCClientErrorLike<AppRouter>, taskId, context) => {
        // Rollback on error
        if (context?.previousTasks) {
          queryClient.setQueryData(
            trpc.task.all.queryKey(),
            context.previousTasks,
          );
        }
        console.error("Failed to delete task:", error);
        Alert.alert(
          "Failed to delete task",
          "Your task couldn't be deleted. Please try again.",
        );
      },
      onSettled: async () => {
        // Always refetch after error or success to ensure consistency
        await queryClient.invalidateQueries(trpc.task.all.queryFilter());
      },
    }),
  );

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  // tRPC mutation for creating task with optimistic update
  const createMutation = useMutation(
    trpc.task.create.mutationOptions({
      onMutate: async (newTask) => {
        triggerRipple();
        console.log("🚀 onMutate called for create");
        // Cancel outgoing refetches
        await queryClient.cancelQueries(trpc.task.all.queryFilter());

        // Snapshot the previous value
        const previousTasks = queryClient.getQueryData<
          RouterOutputs["task"]["all"]
        >(trpc.task.all.queryKey());
        console.log("📊 Previous tasks:", previousTasks?.length);

        // Optimistically update to the new value
        if (previousTasks && session) {
          const optimisticTask: RouterOutputs["task"]["all"][number] = {
            id: `temp-${Date.now()}`, // Temporary ID
            title: newTask.title,
            description: newTask.description ?? null,
            completed: false,
            completedAt: null,
            dueDate: newTask.dueDate ?? null,
            archivedAt: null,
            categoryId: newTask.categoryId ?? null,
            userId: session.user.id,
            priority: "medium",
            version: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            lastSyncedAt: null,
            orderIndex: 0,
            priority: newTask.priority ?? "medium",
            category: null, // Category details will be filled in after server response
          };

          // Prepend so new task appears at top (where dummy was)
          const newTasks = [optimisticTask, ...previousTasks];
          console.log(
            "✨ Setting optimistic task, new count:",
            newTasks.length,
          );

          queryClient.setQueryData<RouterOutputs["task"]["all"]>(
            trpc.task.all.queryKey(),
            newTasks,
          );

          // Verify it was set
          const afterSet = queryClient.getQueryData<
            RouterOutputs["task"]["all"]
          >(trpc.task.all.queryKey());
          console.log("✅ After set, task count:", afterSet?.length);
        } else {
          console.log("❌ No previous tasks found in cache!");
        }

        return { previousTasks };
      },
      onError: (error: TRPCClientErrorLike<AppRouter>, newTask, context) => {
        // Rollback on error
        if (context?.previousTasks) {
          queryClient.setQueryData(
            trpc.task.all.queryKey(),
            context.previousTasks,
          );
        }
        console.error("Failed to create task:", error);
        Alert.alert(
          "Failed to create task",
          "Your task couldn't be created. Please try again.",
        );
      },
      onSettled: async () => {
        // Always refetch after error or success to ensure consistency
        await queryClient.invalidateQueries(trpc.task.all.queryFilter());
      },
    }),
  );

  const handleCreate = async (
    title: string,
    description: string,
    categoryId: string | undefined,
    dueDate: Date | undefined,
    priority: PriorityLevel,
  ) => {
    if (!session?.user) {
      throw new Error("User not authenticated");
    }

    await createMutation.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId,
      dueDate,
      priority: priority ?? "medium",
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      triggerRipple();
    } catch (error) {
      console.error("Manual refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCancelEdit = (id: string) => {
    if (id === DUMMY_TASK_ID) {
      setIsCreating(false);
    }
  };

  // Show loading state while session or tasks are loading
  if (isPending || isLoadingTasks) {
    return (
      <GradientBackground>
        <SafeAreaView className="flex-1" edges={["top"]}>
          <View className="flex-1 items-center justify-center">
            <RNText className="text-foreground text-lg">
              {isPending ? "Loading..." : "Loading tasks..."}
            </RNText>
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
    <GradientBackground rippleTrigger={rippleTrigger}>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        <Header onProfilePress={() => setShowProfileMenu(true)} />

        <View
          className="flex-1 px-4"
          style={{ minHeight: Dimensions.get("window").height * 0.75 }}
        >
          {filteredTasks.length > 0 ? (
            viewMode === "stack" ? (
              <SwipeableCardStack
                isCompact={true}
                tasks={filteredTasks}
                onToggle={handleToggle}
                onComplete={(id) => handleToggle(id, true)}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                autoEditId={isCreating ? DUMMY_TASK_ID : undefined}
                onCancelEdit={handleCancelEdit}
              />
            ) : (
              <SwipeableCardStack
                tasks={filteredTasks}
                isCompact={false}
                onToggle={handleToggle}
                onComplete={(id) => handleToggle(id, true)}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                autoEditId={isCreating ? DUMMY_TASK_ID : undefined}
                onCancelEdit={handleCancelEdit}
              />
            )
          ) : (
            <View className="mt-10 items-center">
              <RNText className="text-muted-foreground text-center italic">
                {tasks.length === 0
                  ? "No tasks yet. Tap + to create one!"
                  : "No tasks in this category."}
              </RNText>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Bottom button bar - positioned absolutely to hug the bottom */}
      <SafeAreaView
        edges={["bottom"]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
      >
        <View className="flex-row items-center gap-4 px-4 pb-1">
          <View className="ml-2 flex-row gap-2">
            <CategoryFilter />
            <PriorityFilter
              selectedPriorities={selectedPriorities}
              onChange={setSelectedPriorities}
            />
          </View>
          <View className="flex-1" />
          <ViewToggleButton
            viewMode={viewMode}
            onToggle={() =>
              setViewMode((v) => (v === "stack" ? "list" : "stack"))
            }
          />
          <FAB onPress={() => setIsCreating(!isCreating)} />
        </View>
      </SafeAreaView>

      {/* Profile Menu */}
      <ProfileMenu
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        user={session.user}
      />
    </GradientBackground>
  );
}
