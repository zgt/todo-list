import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Send } from "lucide-react-native";

import { CategoryWheelPicker } from "~/components/CategoryWheelPicker";
import { DatePickerPill } from "~/components/DatePickerPill";

interface CreateTaskProps {
  onCreate: (
    title: string,
    description: string,
    categoryId: string | undefined,
    dueDate: Date | undefined,
  ) => Promise<void>;
  onSuccess?: () => void;
}

export default function CreateTask({ onCreate, onSuccess }: CreateTaskProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) {
      return;
    }

    // Clear form and close modal immediately for instant feedback
    const taskTitle = title;
    const taskDescription = description;
    const taskCategoryId = selectedCategoryId ?? undefined;
    const taskDueDate = selectedDate ?? undefined;
    setTitle("");
    setDescription("");
    setSelectedCategoryId(null);
    setSelectedDate(null);
    onSuccess?.();

    // Create task in background (optimistic update already happened in parent)
    try {
      await onCreate(taskTitle, taskDescription, taskCategoryId, taskDueDate);
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
            placeholder="Title"
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
            numberOfLines={1}
            selectionColor="#10B981"
          />
        </View>

        {/* Category and Date Pickers */}
        <View className="flex-row items-end gap-2">
          <CategoryWheelPicker
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={setSelectedCategoryId}
          />
          <DatePickerPill
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </View>

        <View className="items-center justify-center">
          <Pressable
            onPress={handleCreate}
            className={`h-12 w-12 items-center justify-center rounded-full border-2 border-[#8FA8A8] ${
              title.trim() ? "bg-emerald-500" : "bg-zinc-800"
            }`}
            disabled={!title.trim()}
          >
            <Send size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
