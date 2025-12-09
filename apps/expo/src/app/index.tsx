import { useState} from "react";
import { Image, View, Text as RNText, KeyboardAvoidingView, Platform } from "react-native";
import Animated, { FadeOut, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";
import { CategoryPill } from "../components/CategoryPill";
import { FAB } from "../components/FAB";
import { GradientBackground } from "../components/GradientBackground";
import { SwipeableCardStack } from "../components/SwipeableCardStack";
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

        {taskQuery.data && taskQuery.data.length > 0 ? (
          <SwipeableCardStack
            tasks={taskQuery.data}
            onToggle={(id, completed) =>
              updateTaskMutation.mutate({ id, completed })
            }
            onDelete={(id) => deleteTaskMutation.mutate(id)}
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
          <View className="absolute inset-0 z-50 justify-end items-end bg-black/20 p-4">
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ width: "100%", alignItems: "flex-end" }}
            >
              <Animated.View 
                entering={ZoomIn.duration(250)} 
                exiting={FadeOut}
                className="mb-20 mr-2 w-full max-w-[300px] rounded-2xl bg-background p-6 shadow-2xl"
              >
                <CreateTask onSuccess={() => setIsCreating(false)} />
              </Animated.View>
            </KeyboardAvoidingView>
          </View>
        )}
        <View className="flex-row items-center gap-4 px-4 pb-4">
          <View className="flex-1">
            <Categories />
          </View>
          <FAB onPress={() => setIsCreating(!isCreating)} />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}
