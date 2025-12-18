import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Send } from "lucide-react-native";

import { db } from "~/db/client";
import { localTask } from "~/db/schema";
import { syncManager } from "~/sync/manager";
import { authClient } from "~/utils/auth";

// Simple UUID generator
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

  const handleCreate = async () => {
    if (!title.trim()) {
      return;
    }

    if (!session?.user) {
      return;
    }

    try {
      const newTaskId = generateUUID();
      const now = new Date();

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
    }
  };

  return (
    <View className="flex-col gap-4">
      <View className="flex-row gap-3">
        <View className="flex-1 gap-2">
          <TextInput
            className="p-0 text-xl leading-tight font-medium text-white"
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to be done?"
            placeholderTextColor="#71717A"
            autoFocus
            selectionColor="#10B981"
          />
          <TextInput
            className="p-0 text-base leading-tight text-zinc-400"
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor="#52525B"
            multiline
            numberOfLines={2}
            selectionColor="#10B981"
          />
        </View>

        <View className="justify-end">
          <Pressable
            onPress={handleCreate}
            className={`h-10 w-10 items-center justify-center rounded-full ${
              title.trim() ? "bg-emerald-500" : "bg-zinc-800"
            }`}
            disabled={!title.trim()}
          >
            <Send size={20} color={title.trim() ? "#fff" : "#fff"} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
