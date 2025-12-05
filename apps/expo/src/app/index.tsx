import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { LegendList } from "@legendapp/list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "~/utils/api";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

function TaskCard(props: {
  task: RouterOutputs["task"]["all"][number];
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <View className="bg-muted flex flex-row items-center gap-4 rounded-lg p-4">
      <Pressable onPress={props.onToggle}>
        <View
          className={`h-6 w-6 rounded border-2 ${
            props.task.completed
              ? "bg-primary border-primary"
              : "border-foreground"
          } items-center justify-center`}
        >
          {props.task.completed && (
            <Text className="text-background text-lg">✓</Text>
          )}
        </View>
      </Pressable>
      <View className="grow">
        <Text
          className={`text-foreground text-lg font-semibold ${
            props.task.completed ? "text-muted-foreground line-through" : ""
          }`}
        >
          {props.task.title}
        </Text>
        {props.task.description && (
          <Text className="text-muted-foreground mt-1 text-sm">
            {props.task.description}
          </Text>
        )}
      </View>
      <Pressable onPress={props.onDelete}>
        <Text className="text-destructive font-bold uppercase">Delete</Text>
      </Pressable>
    </View>
  );
}

function CreateTask() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { mutate, error } = useMutation(
    trpc.task.create.mutationOptions({
      async onSuccess() {
        setTitle("");
        setDescription("");
        await queryClient.invalidateQueries(trpc.task.all.queryFilter());
      },
    }),
  );

  return (
    <View className="mt-4 flex gap-2">
      <TextInput
        className="border-input bg-background text-foreground items-center rounded-md border px-3 text-lg leading-tight"
        value={title}
        onChangeText={setTitle}
        placeholder="What needs to be done?"
      />
      {error?.data?.zodError?.fieldErrors.title && (
        <Text className="text-destructive">
          {error.data.zodError.fieldErrors.title}
        </Text>
      )}
      <TextInput
        className="border-input bg-background text-foreground items-center rounded-md border px-3 text-lg leading-tight"
        value={description}
        onChangeText={setDescription}
        placeholder="Description (optional)"
        multiline
      />
      <Pressable
        className="bg-primary flex items-center rounded-md p-3"
        onPress={() => mutate({ title, description })}
      >
        <Text className="text-primary-foreground font-semibold">Add Task</Text>
      </Pressable>
      {error?.data?.code === "UNAUTHORIZED" && (
        <Text className="text-destructive mt-2">
          You need to be logged in to create tasks
        </Text>
      )}
    </View>
  );
}

function MobileAuth() {
  const { data: session } = authClient.useSession();

  return (
    <>
      <Text className="text-foreground pb-2 text-center text-xl font-semibold">
        {session?.user.name ? `Hello, ${session.user.name}` : "Not logged in"}
      </Text>
      <Pressable
        onPress={() =>
          session
            ? authClient.signOut()
            : authClient.signIn.social({
                provider: "discord",
                callbackURL: "/",
              })
        }
        className="bg-primary mb-4 flex items-center rounded-md p-3"
      >
        <Text className="text-primary-foreground font-semibold">
          {session ? "Sign Out" : "Sign In With Discord"}
        </Text>
      </Pressable>
    </>
  );
}

export default function Index() {
  const queryClient = useQueryClient();
  const taskQuery = useQuery(trpc.task.all.queryOptions());

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
    <SafeAreaView className="bg-background">
      <Stack.Screen options={{ title: "Todo List" }} />
      <View className="bg-background h-full w-full p-4">
        <Text className="text-foreground pb-2 text-center text-5xl font-bold">
          Todo <Text className="text-primary">List</Text>
        </Text>

        <MobileAuth />

        {taskQuery.data && taskQuery.data.length === 0 ? (
          <Text className="text-muted-foreground text-center italic">
            No tasks yet. Create one below!
          </Text>
        ) : (
          <LegendList
            data={taskQuery.data ?? []}
            estimatedItemSize={80}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View className="h-2" />}
            renderItem={(item) => (
              <TaskCard
                task={item.item}
                onToggle={() =>
                  updateTaskMutation.mutate({
                    id: item.item.id,
                    completed: !item.item.completed,
                  })
                }
                onDelete={() => deleteTaskMutation.mutate(item.item.id)}
              />
            )}
          />
        )}

        <CreateTask />
      </View>
    </SafeAreaView>
  );
}
