import type { TRPCClientErrorLike } from "@trpc/client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  Text as RNText,
  StyleSheet,
  View,
} from "react-native";
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
// SQLite imports preserved for future offline work (unused currently)
//import type { LocalTask } from "~/db/client";
//import { db } from "~/db/client";
//import { localCategory, localTask } from "~/db/schema";
//import { syncManager } from "~/sync/manager";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// SQLite imports preserved for future offline work
//import { desc, eq, isNull, sql } from "drizzle-orm";
//import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { CopySlash, RefreshCw } from "lucide-react-native";

import type { AppRouter, RouterOutputs } from "@acme/api";

import type { CategoryManagementSheetRef } from "~/components/CategoryManagementSheet";
import { CategoryManagementSheet } from "~/components/CategoryManagementSheet";
import { CategoryWheelPicker } from "~/components/CategoryWheelPicker";
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
import CreateTask from "./_components/create-task";

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
        <SignInButton />
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
  const [_refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const categorySheetRef = useRef<CategoryManagementSheetRef>(null);
  const sheetBottom = useSharedValue(0);

  const queryClient = useQueryClient();

  // Fetch tasks from server via tRPC
  const {
    data: serverTasks,
    isLoading: isLoadingTasks,
    refetch,
  } = useQuery(
    trpc.task.all.queryOptions(undefined, {
      enabled: !!session,
    }),
  );

  // Use useMemo with only serverTasks dependency to ensure optimistic updates work
  // while maintaining stable reference for other hooks
  const tasks = useMemo(() => {
    if (!serverTasks) return [];

    // Server response already includes category relations
    // Map to include fields expected by SwipeableCardStack (LocalTask type)
    return serverTasks.map((task: RouterOutputs["task"]["all"][number]) => ({
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
    }));
  }, [serverTasks]); // Only depend on serverTasks, not refreshTrigger

  // Filter tasks by selected category
  const filteredTasks = useMemo(() => {
    if (selectedCategoryId === null) return tasks;
    return tasks.filter((task) => task.categoryId === selectedCategoryId);
  }, [tasks, selectedCategoryId]);

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

  // Track keyboard height and animate sheet position
  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardWillShow", (e) => {
      const height = e.endCoordinates.height;
      sheetBottom.value = withSpring(height, {
        damping: 90,
        stiffness: 900,
      });
    });
    const hideSubscription = Keyboard.addListener("keyboardWillHide", () => {
      sheetBottom.value = withSpring(0, {
        damping: 90,
        stiffness: 900,
      });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [sheetBottom]);

  // tRPC mutation for toggling task completion with optimistic update
  const toggleMutation = useMutation(
    trpc.task.update.mutationOptions({
      onMutate: async (updatedTask) => {
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
    }>,
  ) => {
    await updateMutation.mutateAsync({ id, ...updates });
  };

  // tRPC mutation for deleting task with optimistic update
  const deleteMutation = useMutation(
    trpc.task.delete.mutationOptions({
      onMutate: async (taskId) => {
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
            version: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            lastSyncedAt: null,
            orderIndex: 0,
            category: null, // Category details will be filled in after server response
          };

          const newTasks = [...previousTasks, optimisticTask];
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
  ) => {
    if (!session?.user) {
      throw new Error("User not authenticated");
    }

    await createMutation.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId,
      dueDate,
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Manual refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Animated style for sheet position
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    bottom: sheetBottom.value,
  }));

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
    <GradientBackground>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        <Header onProfilePress={() => setShowProfileMenu(true)} />

        <View className="px-4" style={{ minHeight: 600 }}>
          {filteredTasks.length > 0 ? (
            <SwipeableCardStack
              tasks={filteredTasks}
              onToggle={handleToggle}
              onComplete={(id) => handleToggle(id, true)}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
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

        {/* Bottom button bar */}
        <View className="flex-row items-center gap-4 px-4 pt-4 pb-4">
          <View className="ml-5 flex-row items-center gap-2">
            <CategoryWheelPicker
              selectedCategoryId={selectedCategoryId}
              onCategoryChange={setSelectedCategoryId}
            />
            <Pressable
              onPress={() => categorySheetRef.current?.present()}
              style={styles.categoriesButton}
              accessibilityLabel="Manage categories"
              accessibilityRole="button"
            >
              <CopySlash size={20} color="#8FA8A8" />
            </Pressable>
          </View>
          <View className="flex-1" />
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
            <View className="w-full rounded-3xl border-t border-white/10 bg-zinc-900 p-5 shadow-2xl">
              <CreateTask
                onCreate={handleCreate}
                onSuccess={() => setIsCreating(false)}
              />
              <View className="h-full w-full"></View>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Profile Menu */}
      <ProfileMenu
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        user={session.user}
      />

      {/* Category Management Sheet */}
      <CategoryManagementSheet ref={categorySheetRef} />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  categoriesButton: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: "#164B49",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});
