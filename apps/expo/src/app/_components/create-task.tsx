import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Send } from "lucide-react-native";

interface CreateTaskProps {
  onCreate: (title: string, description: string) => Promise<void>;
  onSuccess?: () => void;
}

export default function CreateTask({ onCreate, onSuccess }: CreateTaskProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) {
      return;
    }

    // Clear form and close modal immediately for instant feedback
    const taskTitle = title;
    const taskDescription = description;
    setTitle("");
    setDescription("");
    onSuccess?.();

    // Create task in background (optimistic update already happened in parent)
    try {
      await onCreate(taskTitle, taskDescription);
    } catch (e) {
      console.error("Failed to create task:", e);
      // Error handling is managed by the parent's optimistic update rollback
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
