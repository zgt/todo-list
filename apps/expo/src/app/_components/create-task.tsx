import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { db } from "~/db/client";
import { localTask } from "~/db/schema";
import { syncManager } from "~/sync/manager";
import { authClient } from "~/utils/auth";

// Simple UUID generator to avoid external deps if install fails
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function CreateTask({ onSuccess }: { onSuccess?: () => void }) {
  const { data: session } = authClient.useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!session?.user) {
      setError("You need to be logged in to create tasks");
      return;
    }

    try {
      setError(null);
      const newTaskId = generateUUID();
      const now = new Date();

      // 1. Insert into local DB immediately
      await db.insert(localTask).values({
        id: newTaskId,
        userId: session.user.id,
        title: title.trim(),
        description: description.trim() || null,
        completed: false,
        createdAt: now,
        updatedAt: now,
        syncStatus: "pending",
        localVersion: 1,
        serverVersion: 0,
      });

      // 2. Queue for sync
      await syncManager.queueOperation("task", newTaskId, "create", {
        id: newTaskId,
        title: title.trim(),
        description: description.trim() || null,
      });

      setTitle("");
      setDescription("");
      onSuccess?.();
    } catch (e) {
      console.error("Failed to create task:", e);
      setError("Failed to create task");
    }
  };

  return (
    <View className="flex gap-2">
      <Text className="text-foreground mb-2 text-lg font-semibold">
        New Task
      </Text>
      <TextInput
        className="border-input bg-background text-foreground items-center rounded-md border px-3 py-2 text-lg leading-tight"
        value={title}
        onChangeText={(text) => {
          setTitle(text);
          if (error) setError(null);
        }}
        placeholder="What needs to be done?"
        placeholderTextColor="#8FA8A8"
      />
      {error && !error.includes("logged in") && (
        <Text className="text-destructive">{error}</Text>
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
        className="bg-primary mt-2 flex items-center rounded-md p-3"
        onPress={handleCreate}
      >
        <Text className="text-primary-foreground font-semibold">Add Task</Text>
      </Pressable>
      {error && error.includes("logged in") && (
        <Text className="text-destructive mt-2">{error}</Text>
      )}
    </View>
  );
}
