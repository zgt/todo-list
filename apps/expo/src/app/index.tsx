import { useState } from "react";
import { FlatList, Image, ScrollView, View, Text as RNText } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";
import { CategoryPill } from "../components/CategoryPill";
import { FAB } from "../components/FAB";
import { GradientBackground } from "../components/GradientBackground";
import { TaskCard } from "../components/TaskCard";
import  CreateTask  from "./_components/create-task";

function Header() {
  const { data: session } = authClient.useSession();
  return (
    <View className="mb-6 flex-row items-center justify-between px-4 pt-2">
      <RNText className="text-4xl font-bold text-foreground">
        Todo <RNText className="text-primary">list</RNText>
      </RNText>
      <View className="h-10 w-10 overflow-hidden rounded-full border-2 border-white/20">
        {session?.user.image ? (
            <Image source={{ uri: session.user.image }} className="h-full w-full" />
        ) : (
            <View className="h-full w-full items-center justify-center bg-muted">
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
    <View className="mb-6">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {categories.map((cat) => (
          <CategoryPill
            key={cat}
            label={cat}
            active={active === cat}
            onPress={() => setActive(cat)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export default function Index() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const [isCreating, setIsCreating] = useState(false);

  const taskQuery = useQuery({
    ...trpc.task.all.queryOptions(),
    enabled: !!session?.user,
  });

  const updateTaskMutation = useMutation(
    trpc.task.update.mutationOptions({
      onSettled: () =>
        queryClient.invalidateQueries(trpc.task.all.queryFilter()),
    }),
  );

  const deleteTaskMutation = useMutation(
    trpc.task.delete.mutationOptions({
      onSettled: () =>
        queryClient.invalidateQueries(trpc.task.all.queryFilter()),
    }),
  );

  return (
    <GradientBackground>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        
        <Header />
        <Categories />

        <FlatList
          data={taskQuery.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onToggle={() =>
                updateTaskMutation.mutate({
                  id: item.id,
                  completed: !item.completed,
                })
              }
              onDelete={() => deleteTaskMutation.mutate(item.id)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          ListEmptyComponent={
            <View className="mt-10 items-center">
              <RNText className="text-muted-foreground text-center italic">
                No tasks yet. Tap + to create one!
              </RNText>
            </View>
          }
        />

        {/* Temporary: Show CreateTask when creating is true, or just put it at bottom */}
        {isCreating && (
            <View className="absolute bottom-24 left-4 right-4 z-10 rounded-xl bg-background/90 p-4 backdrop-blur-xl">
                <CreateTask onSuccess={() => setIsCreating(false)} />
            </View>
        )}

        <FAB onPress={() => setIsCreating(!isCreating)} />
      </SafeAreaView>
    </GradientBackground>
  );
}

