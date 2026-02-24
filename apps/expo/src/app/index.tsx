import type { TRPCClientErrorLike } from "@trpc/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  Pressable,
  Text as RNText,
  ScrollView,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, List } from "lucide-react-native";

import type { AppRouter, RouterOutputs } from "@acme/api";

import type { PriorityLevel } from "../components/priority-config";
import type { TaskFormData } from "../components/TaskFormSheet";
import { PriorityFilter } from "~/components/priority-filter";
import { useWidgetSync } from "~/hooks/useWidgetSync";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";
import {
  cancelTaskReminder,
  rescheduleAllReminders,
  scheduleTaskReminder,
} from "~/utils/notifications";
import { GradientBackground } from "../components/GradientBackground";
import { ProfileButton } from "../components/ProfileButton";
import { ProfileMenu } from "../components/ProfileMenu";
import { SignInButton } from "../components/SignInButton";
import { SwipeableCardStack } from "../components/SwipeableCardStack";
import { TaskFormSheet } from "../components/TaskFormSheet";
import { CategoryFilter } from "./_components/category-filter";
import { useCategoryFilter } from "./_components/category-filter-context";

type ServerTask = RouterOutputs["task"]["all"][number];

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
  const { openTask } = useLocalSearchParams<{ openTask?: string }>();
  const router = useRouter();
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
  const { effectiveCategoryIds } = useCategoryFilter();
  const [selectedPriorities, setSelectedPriorities] = useState<PriorityLevel[]>(
    [],
  );

  const [selectedListFilter, setSelectedListFilter] = useState<string | null>(
    null,
  );

  const [editingTask, setEditingTask] = useState<ServerTask | null>(null);

  const queryClient = useQueryClient();

  // Fetch tasks from server via tRPC
  const {
    data: serverTasks,
    isLoading: isLoadingTasks,
    isFetching,
  } = useQuery(
    trpc.task.all.queryOptions(undefined, {
      enabled: !!session,
    }),
  );

  // Fetch lists for the form sheet and filter
  const { data: lists } = useQuery(
    trpc.taskList.all.queryOptions(undefined, {
      enabled: !!session,
    }),
  );

  // Trigger ripple when any query fetch starts
  useEffect(() => {
    if (isFetching) triggerRipple();
  }, [isFetching, triggerRipple]);

  // Fetch server notification prefs for local scheduling
  const { data: notifPrefs } = useQuery(
    trpc.notification.getUserPreferences.queryOptions(undefined, {
      enabled: !!session,
      staleTime: 5 * 60 * 1000, // cache for 5 minutes
    }),
  );

  // Reschedule local notifications whenever serverTasks refreshes
  // (covers app foreground, pull-to-refresh, and tasks edited on web)
  const lastRescheduleRef = useRef<string>("");
  useEffect(() => {
    if (!serverTasks || serverTasks.length === 0) return;
    if (!notifPrefs?.pushReminders) return;

    // Build a fingerprint to avoid redundant reschedules
    const fingerprint = serverTasks
      .map((t) => `${t.id}:${t.reminderAt?.getTime() ?? 0}:${t.completed}`)
      .join("|");
    if (fingerprint === lastRescheduleRef.current) return;
    lastRescheduleRef.current = fingerprint;

    void rescheduleAllReminders(
      serverTasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.reminderAt ?? t.dueDate,
        completed: t.completed,
        deletedAt: t.deletedAt,
      })),
    );
  }, [serverTasks, notifPrefs?.pushReminders]);

  // Handle notification tap: open the task's edit sheet
  useEffect(() => {
    if (!openTask || !serverTasks) return;
    const task = serverTasks.find((t) => t.id === openTask);
    if (task) {
      setEditingTask(task);
      // Clear the param so re-renders don't re-open
      router.setParams({ openTask: undefined });
    }
  }, [openTask, serverTasks, router]);

  const tasks = useMemo(() => {
    if (!serverTasks) return [];

    const priorityOrder: Record<string, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    return [...serverTasks]
      .sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }

        const priorityA = a.priority ?? "medium";
        const priorityB = b.priority ?? "medium";
        const priorityDiff =
          (priorityOrder[priorityA] ?? 1) - (priorityOrder[priorityB] ?? 1);

        if (priorityDiff !== 0) return priorityDiff;

        return b.createdAt.getTime() - a.createdAt.getTime();
      })
      .map((task: ServerTask) => ({
        ...task,
        updatedAt: task.updatedAt ?? task.createdAt,
        category: task.category
          ? {
              name: task.category.name,
              color: task.category.color,
            }
          : null,
        syncStatus: "synced" as const,
        localVersion: task.version,
        serverVersion: task.version,
        lastSyncedAt: new Date(),
        orderIndex: 0,
        priority: task.priority as "high" | "medium" | "low" | null,
      }));
  }, [serverTasks]);

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

    if (selectedListFilter === "personal") {
      result = result.filter((task) => !task.listId);
    } else if (selectedListFilter) {
      result = result.filter((task) => task.listId === selectedListFilter);
    }

    return result;
  }, [tasks, effectiveCategoryIds, selectedPriorities, selectedListFilter]);

  // Sync tasks to iOS widget whenever they change
  useWidgetSync(tasks, !!session);

  // tRPC mutation for toggling task completion with optimistic update
  const toggleMutation = useMutation(
    trpc.task.update.mutationOptions({
      onMutate: async (updatedTask) => {
        triggerRipple();
        await queryClient.cancelQueries(trpc.task.all.queryFilter());

        const previousTasks = queryClient.getQueryData<
          RouterOutputs["task"]["all"]
        >(trpc.task.all.queryKey());

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
        _updatedTask,
        context,
      ) => {
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
        await queryClient.invalidateQueries(trpc.task.all.queryFilter());
      },
    }),
  );

  const handleToggle = async (id: string, completed: boolean) => {
    await toggleMutation.mutateAsync({ id, completed });
    // Cancel reminder when completing a task
    if (completed) {
      void cancelTaskReminder(id);
    }
  };

  // tRPC mutation for generic task updates
  const updateMutation = useMutation(
    trpc.task.update.mutationOptions({
      onMutate: async (updatedTask) => {
        triggerRipple();
        await queryClient.cancelQueries(trpc.task.all.queryFilter());

        const previousTasks = queryClient.getQueryData<
          RouterOutputs["task"]["all"]
        >(trpc.task.all.queryKey());

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
        _updatedTask,
        context,
      ) => {
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
    await updateMutation.mutateAsync({ id, ...updates });
  };

  // tRPC mutation for deleting task with optimistic update
  const deleteMutation = useMutation(
    trpc.task.delete.mutationOptions({
      onMutate: async (taskId) => {
        triggerRipple();
        await queryClient.cancelQueries(trpc.task.all.queryFilter());

        const previousTasks = queryClient.getQueryData<
          RouterOutputs["task"]["all"]
        >(trpc.task.all.queryKey());

        if (previousTasks) {
          queryClient.setQueryData<RouterOutputs["task"]["all"]>(
            trpc.task.all.queryKey(),
            previousTasks.filter((task) => task.id !== taskId),
          );
        }

        return { previousTasks };
      },
      onError: (error: TRPCClientErrorLike<AppRouter>, _taskId, context) => {
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
        await queryClient.invalidateQueries(trpc.task.all.queryFilter());
      },
    }),
  );

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    void cancelTaskReminder(id);
  };

  // tRPC mutation for creating task with optimistic update
  const createMutation = useMutation(
    trpc.task.create.mutationOptions({
      onMutate: async (newTask) => {
        triggerRipple();
        await queryClient.cancelQueries(trpc.task.all.queryFilter());

        const previousTasks = queryClient.getQueryData<
          RouterOutputs["task"]["all"]
        >(trpc.task.all.queryKey());

        if (previousTasks && session) {
          const optimisticTask: RouterOutputs["task"]["all"][number] = {
            // eslint-disable-next-line react-hooks/purity -- Date.now() runs in onMutate callback, not during render
            id: `temp-${Date.now()}`,
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
            priority: newTask.priority ?? "medium",
            reminderAt: newTask.reminderAt ?? null,
            reminderSentAt: null,
            category: null,
            subtasks: [],
            listId: newTask.listId ?? null,
            list: null,
          };

          const newTasks = [optimisticTask, ...previousTasks];

          queryClient.setQueryData<RouterOutputs["task"]["all"]>(
            trpc.task.all.queryKey(),
            newTasks,
          );
        }

        return { previousTasks };
      },
      onError: (error: TRPCClientErrorLike<AppRouter>, _newTask, context) => {
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
        await queryClient.invalidateQueries(trpc.task.all.queryFilter());
      },
    }),
  );

  // Sheet handlers
  const handleCreateSubmit = async (data: TaskFormData) => {
    if (!session?.user) return;

    await createMutation.mutateAsync({
      title: data.title,
      description: data.description || undefined,
      categoryId: data.categoryId ?? undefined,
      dueDate: data.dueDate ?? undefined,
      priority: data.priority ?? "medium",
      reminderAt: data.reminderAt ?? undefined,
      listId: data.listId ?? undefined,
    });

    // Schedule reminder if set
    if (data.reminderAt) {
      // Use the task title for the notification; the actual task ID comes from the server
      // but we schedule optimistically with a temp approach — rescheduleAllReminders on
      // next mount will fix any ID mismatch
      void scheduleTaskReminder(
        `temp-create-${Date.now()}`,
        data.title,
        data.reminderAt,
      );
    }
  };

  const handleEditSubmit = async (data: TaskFormData) => {
    if (!editingTask) return;

    await updateMutation.mutateAsync({
      id: editingTask.id,
      title: data.title,
      description: data.description || undefined,
      categoryId: data.categoryId,
      dueDate: data.dueDate,
      priority: data.priority ?? "medium",
      reminderAt: data.reminderAt,
      listId: data.listId,
    });

    setEditingTask(null);

    // Schedule or cancel reminder
    if (data.reminderAt) {
      void scheduleTaskReminder(editingTask.id, data.title, data.reminderAt);
    } else {
      void cancelTaskReminder(editingTask.id);
    }
  };

  const handleEditDelete = async () => {
    if (!editingTask) return;
    await deleteMutation.mutateAsync(editingTask.id);
    void cancelTaskReminder(editingTask.id);
    setEditingTask(null);
  };

  // Open edit sheet when a task card is tapped
  const handleTaskPress = useCallback(
    (taskId: string) => {
      const task = serverTasks?.find((t) => t.id === taskId);
      if (task) {
        setEditingTask(task);
      }
    },
    [serverTasks],
  );

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
          {/* List Filter */}
          {lists && lists.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{
                gap: 6,
                paddingBottom: 10,
                paddingLeft: 10,
              }}
            >
              <Pressable
                onPress={() => setSelectedListFilter(null)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 9999,
                  borderWidth: 1,
                  borderColor:
                    selectedListFilter === null ? "#50C878" : "#164B49",
                  backgroundColor:
                    selectedListFilter === null
                      ? "rgba(80, 200, 120, 0.15)"
                      : "transparent",
                }}
              >
                <RNText
                  style={{
                    fontSize: 12,
                    color: selectedListFilter === null ? "#50C878" : "#8FA8A8",
                  }}
                >
                  All
                </RNText>
              </Pressable>
              <Pressable
                onPress={() => setSelectedListFilter("personal")}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 9999,
                  borderWidth: 1,
                  borderColor:
                    selectedListFilter === "personal" ? "#50C878" : "#164B49",
                  backgroundColor:
                    selectedListFilter === "personal"
                      ? "rgba(80, 200, 120, 0.15)"
                      : "transparent",
                }}
              >
                <RNText
                  style={{
                    fontSize: 12,
                    color:
                      selectedListFilter === "personal" ? "#50C878" : "#8FA8A8",
                  }}
                >
                  Personal
                </RNText>
              </Pressable>
              {lists.map((list) => (
                <Pressable
                  key={list.id}
                  onPress={() => setSelectedListFilter(list.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 9999,
                    borderWidth: 1,
                    borderColor:
                      selectedListFilter === list.id
                        ? (list.color ?? "#50C878")
                        : "#164B49",
                    backgroundColor:
                      selectedListFilter === list.id
                        ? `${list.color ?? "#50C878"}25`
                        : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: list.color ?? "#50C878",
                    }}
                  />
                  <RNText
                    style={{
                      fontSize: 12,
                      color:
                        selectedListFilter === list.id
                          ? (list.color ?? "#50C878")
                          : "#8FA8A8",
                    }}
                  >
                    {list.name}
                  </RNText>
                </Pressable>
              ))}
            </ScrollView>
          )}
          {filteredTasks.length > 0 ? (
            viewMode === "stack" ? (
              <SwipeableCardStack
                key="stack"
                isCompact={true}
                tasks={filteredTasks}
                onToggle={handleToggle}
                onComplete={(id) => handleToggle(id, true)}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                onTaskPress={handleTaskPress}
              />
            ) : (
              <SwipeableCardStack
                key="list"
                tasks={filteredTasks}
                isCompact={false}
                onToggle={handleToggle}
                onComplete={(id) => handleToggle(id, true)}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                onTaskPress={handleTaskPress}
              />
            )
          ) : (
            <View className="mt-10 items-center">
              <RNText className="text-muted-foreground text-center italic">
                {tasks.length === 0
                  ? "No tasks yet. Tap + to create one!"
                  : "No matching tasks."}
              </RNText>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Bottom button bar */}
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
          <TaskFormSheet
            mode="create"
            onSubmit={handleCreateSubmit}
            lists={(lists ?? []).map((l) => ({
              id: l.id,
              name: l.name,
              color: l.color,
            }))}
            isSubmitting={createMutation.isPending}
          />
        </View>

        {/* Edit Task Sheet — controlled by editingTask state */}
        <TaskFormSheet
          key={editingTask?.id ?? "edit-sheet"}
          mode="edit"
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={handleEditSubmit}
          initialData={
            editingTask
              ? {
                  id: editingTask.id,
                  title: editingTask.title,
                  description: editingTask.description ?? "",
                  categoryId: editingTask.categoryId,
                  priority: editingTask.priority as PriorityLevel,
                  dueDate: editingTask.dueDate,
                  reminderAt: editingTask.reminderAt,
                  subtasks: editingTask.subtasks,
                  listId: editingTask.listId,
                }
              : undefined
          }
          lists={(lists ?? []).map((l) => ({
            id: l.id,
            name: l.name,
            color: l.color,
          }))}
          isSubmitting={updateMutation.isPending}
          onDelete={handleEditDelete}
        />
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
