import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

export default function CreateTask({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { mutate, error } = useMutation(
    trpc.task.create.mutationOptions({
      async onSuccess() {
        setTitle("");
        setDescription("");
        await queryClient.invalidateQueries(trpc.task.all.queryFilter());
        onSuccess?.();
      },
    }),
  );

  return (
    <View className="flex gap-2">
      <Text className="text-lg font-semibold text-foreground mb-2">New Task</Text>
      <TextInput
        className="border-input bg-background text-foreground items-center rounded-md border px-3 py-2 text-lg leading-tight"
        value={title}
        onChangeText={setTitle}
        placeholder="What needs to be done?"
        placeholderTextColor="#8FA8A8"
      />
      {error?.data?.zodError?.fieldErrors.title && (
        <Text className="text-destructive">
          {error.data.zodError.fieldErrors.title}
        </Text>
      )}
      <TextInput
        className="border-input bg-background text-foreground items-center rounded-md border px-3 py-2 text-lg leading-tight"
        value={description}
        onChangeText={setDescription}
        placeholder="Description (optional)"
        placeholderTextColor="#8FA8A8"
        multiline
      />
      <Pressable
        className="bg-primary flex items-center rounded-md p-3 mt-2"
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
