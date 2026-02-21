import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Calendar, Trash2, X } from "lucide-react-native";

import type { PriorityLevel } from "./priority-config";
import { trpc } from "~/utils/api";

export interface TaskFormData {
  title: string;
  description: string;
  categoryId: string | null;
  listId: string | null;
  priority: PriorityLevel;
  dueDate: Date | null;
  reminderAt: Date | null;
}

interface SubtaskData {
  id: string;
  title: string;
  completed: boolean;
  sortOrder: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

interface TaskList {
  id: string;
  name: string;
  color: string | null;
}

interface TaskFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  initialData?: Partial<TaskFormData> & {
    id?: string;
    subtasks?: SubtaskData[];
  };
  categories: Category[];
  lists?: TaskList[];
  isSubmitting?: boolean;
  mode: "create" | "edit";
  onDelete?: () => void;
}

const PRIORITY_OPTIONS: {
  value: PriorityLevel;
  label: string;
  color: string;
}[] = [
  { value: "low", label: "Low", color: "#8FA8A8" },
  { value: "medium", label: "Medium", color: "#E5A04D" },
  { value: "high", label: "High", color: "#ef4444" },
];

function formatDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function TaskFormSheet({
  visible,
  onClose,
  onSubmit,
  initialData,
  categories,
  lists,
  isSubmitting,
  mode,
  onDelete,
}: TaskFormSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const titleInputRef = useRef<TextInput>(null);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    initialData?.categoryId ?? null,
  );
  const [listId, setListId] = useState<string | null>(
    initialData?.listId ?? null,
  );
  const [priority, setPriority] = useState<PriorityLevel>(
    initialData?.priority ?? "medium",
  );
  const [dueDate, setDueDate] = useState<Date | null>(
    initialData?.dueDate ?? null,
  );
  const [reminderAt, setReminderAt] = useState<Date | null>(
    initialData?.reminderAt ?? null,
  );

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
  const [pendingReminderDate, setPendingReminderDate] = useState<Date | null>(
    null,
  );

  // Subtask state
  const taskId = mode === "edit" ? initialData?.id : undefined;
  const subtasks = initialData?.subtasks ?? [];
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const newSubtaskInputRef = useRef<TextInput>(null);

  // Subtask mutations
  const queryClient = useQueryClient();
  const invalidateTasks = useCallback(async () => {
    await queryClient.invalidateQueries(trpc.task.all.queryFilter());
  }, [queryClient]);

  const createSubtask = useMutation(
    trpc.subtask.create.mutationOptions({ onSuccess: invalidateTasks }),
  );
  const updateSubtask = useMutation(
    trpc.subtask.update.mutationOptions({ onSuccess: invalidateTasks }),
  );
  const deleteSubtask = useMutation(
    trpc.subtask.delete.mutationOptions({ onSuccess: invalidateTasks }),
  );

  // Reset form when initialData changes or sheet opens
  useEffect(() => {
    if (visible) {
      /* eslint-disable react-hooks/set-state-in-effect -- intentional: resets form fields when sheet opens with new data */
      setTitle(initialData?.title ?? "");
      setDescription(initialData?.description ?? "");
      setCategoryId(initialData?.categoryId ?? null);
      setListId(initialData?.listId ?? null);
      setPriority(initialData?.priority ?? "medium");
      setDueDate(initialData?.dueDate ?? null);
      setReminderAt(initialData?.reminderAt ?? null);
      setShowDatePicker(false);
      setShowReminderDatePicker(false);
      setShowReminderTimePicker(false);
      setPendingReminderDate(null);
      setNewSubtaskTitle("");
      setEditingSubtaskId(null);
      setEditingSubtaskTitle("");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [visible, initialData]);

  // Open/close the sheet
  useEffect(() => {
    if (visible) {
      sheetRef.current?.expand();
      // Auto-focus title in create mode
      if (mode === "create") {
        setTimeout(() => titleInputRef.current?.focus(), 400);
      }
    } else {
      sheetRef.current?.close();
    }
  }, [visible, mode]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      categoryId,
      listId,
      priority,
      dueDate,
      reminderAt,
    });
  };

  const handleDelete = () => {
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete?.(),
      },
    ]);
  };

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
        pressBehavior="close"
      />
    ),
    [],
  );

  const canSubmit = title.trim().length > 0 && !isSubmitting;

  return (
    <BottomSheet
      ref={sheetRef}
      index={visible ? 0 : -1}
      snapPoints={["85%"]}
      enablePanDownToClose
      onChange={handleSheetChange}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: "#0A1A1A" }}
      handleIndicatorStyle={{ backgroundColor: "#164B49", width: 40 }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#DCE4E4" }}>
            {mode === "create" ? "New Task" : "Edit Task"}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={24} color="#8FA8A8" />
          </Pressable>
        </View>

        {/* Title */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#8FA8A8",
              marginBottom: 6,
            }}
          >
            Title
          </Text>
          <TextInput
            ref={titleInputRef}
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to be done?"
            placeholderTextColor="#4A6A6A"
            style={{
              backgroundColor: "#102A2A",
              borderWidth: 1,
              borderColor: "#164B49",
              borderRadius: 8,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 16,
              color: "#DCE4E4",
            }}
          />
        </View>

        {/* Description */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#8FA8A8",
              marginBottom: 6,
            }}
          >
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add details..."
            placeholderTextColor="#4A6A6A"
            multiline
            textAlignVertical="top"
            style={{
              backgroundColor: "#102A2A",
              borderWidth: 1,
              borderColor: "#164B49",
              borderRadius: 8,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: "#DCE4E4",
              minHeight: 80,
            }}
          />
        </View>

        {/* Category */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#8FA8A8",
              marginBottom: 8,
            }}
          >
            Category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {/* None option */}
            <Pressable
              onPress={() => setCategoryId(null)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 9999,
                borderWidth: 1.5,
                borderColor: categoryId === null ? "#50C878" : "#164B49",
                backgroundColor:
                  categoryId === null
                    ? "rgba(80, 200, 120, 0.15)"
                    : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: categoryId === null ? "#50C878" : "#8FA8A8",
                }}
              >
                None
              </Text>
            </Pressable>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => setCategoryId(cat.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 9999,
                  borderWidth: 1.5,
                  borderColor: categoryId === cat.id ? cat.color : "#164B49",
                  backgroundColor:
                    categoryId === cat.id ? `${cat.color}25` : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: categoryId === cat.id ? cat.color : "#8FA8A8",
                  }}
                >
                  {cat.icon ? `${cat.icon} ` : ""}
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* List */}
        {lists && lists.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#8FA8A8",
                marginBottom: 8,
              }}
            >
              List
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              <Pressable
                onPress={() => setListId(null)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 9999,
                  borderWidth: 1.5,
                  borderColor: listId === null ? "#50C878" : "#164B49",
                  backgroundColor:
                    listId === null
                      ? "rgba(80, 200, 120, 0.15)"
                      : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: listId === null ? "#50C878" : "#8FA8A8",
                  }}
                >
                  Personal
                </Text>
              </Pressable>
              {lists.map((list) => (
                <Pressable
                  key={list.id}
                  onPress={() => setListId(list.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 9999,
                    borderWidth: 1.5,
                    borderColor:
                      listId === list.id
                        ? (list.color ?? "#50C878")
                        : "#164B49",
                    backgroundColor:
                      listId === list.id
                        ? `${list.color ?? "#50C878"}25`
                        : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: list.color ?? "#50C878",
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      color:
                        listId === list.id
                          ? (list.color ?? "#50C878")
                          : "#8FA8A8",
                    }}
                  >
                    {list.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Priority */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#8FA8A8",
              marginBottom: 8,
            }}
          >
            Priority
          </Text>
          <View
            style={{
              flexDirection: "row",
              gap: 0,
              borderRadius: 8,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "#164B49",
            }}
          >
            {PRIORITY_OPTIONS.map((opt) => {
              const isActive = priority === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setPriority(opt.value)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    alignItems: "center",
                    backgroundColor: isActive ? `${opt.color}25` : "#102A2A",
                    borderRightWidth: opt.value !== "high" ? 1 : 0,
                    borderColor: "#164B49",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: isActive ? "700" : "500",
                      color: isActive ? opt.color : "#8FA8A8",
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Due Date */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#8FA8A8",
              marginBottom: 8,
            }}
          >
            Due Date
          </Text>
          {dueDate ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "#102A2A",
                  borderWidth: 1,
                  borderColor: "#164B49",
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flex: 1,
                }}
              >
                <Calendar size={16} color="#50C878" />
                <Text style={{ fontSize: 14, color: "#DCE4E4" }}>
                  {formatDate(dueDate)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setDueDate(null);
                  setShowDatePicker(false);
                }}
                hitSlop={8}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} color="#ef4444" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setDueDate(new Date());
                setShowDatePicker(true);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#102A2A",
                borderWidth: 1,
                borderColor: "#164B49",
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Calendar size={16} color="#8FA8A8" />
              <Text style={{ fontSize: 14, color: "#8FA8A8" }}>
                Add due date
              </Text>
            </Pressable>
          )}
          {showDatePicker && (
            <View style={{ marginTop: 8 }}>
              <DateTimePicker
                value={dueDate ?? new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={new Date()}
                onChange={(_, selectedDate) => {
                  if (Platform.OS === "android") {
                    setShowDatePicker(false);
                  }
                  if (selectedDate) {
                    setDueDate(selectedDate);
                  }
                }}
                themeVariant="dark"
                accentColor="#50C878"
              />
              {Platform.OS === "ios" && (
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  style={{
                    alignSelf: "flex-end",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    marginTop: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#50C878",
                    }}
                  >
                    Done
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Reminder */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#8FA8A8",
              marginBottom: 8,
            }}
          >
            Reminder
          </Text>
          {reminderAt ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Pressable
                onPress={() => {
                  setPendingReminderDate(reminderAt);
                  setShowReminderDatePicker(true);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "#102A2A",
                  borderWidth: 1,
                  borderColor: "#164B49",
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flex: 1,
                }}
              >
                <Bell size={16} color="#50C878" />
                <Text style={{ fontSize: 14, color: "#DCE4E4" }}>
                  {formatDateTime(reminderAt)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setReminderAt(null);
                  setShowReminderDatePicker(false);
                  setShowReminderTimePicker(false);
                }}
                hitSlop={8}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} color="#ef4444" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                const defaultReminder = dueDate
                  ? new Date(dueDate.getTime() - 30 * 60 * 1000)
                  : new Date(Date.now() + 60 * 60 * 1000);
                setPendingReminderDate(defaultReminder);
                setShowReminderDatePicker(true);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#102A2A",
                borderWidth: 1,
                borderColor: "#164B49",
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Bell size={16} color="#8FA8A8" />
              <Text style={{ fontSize: 14, color: "#8FA8A8" }}>
                Add reminder
              </Text>
            </Pressable>
          )}

          {/* Reminder - two-step picker: date first, then time */}
          {showReminderDatePicker && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: "#8FA8A8", marginBottom: 4 }}>
                Pick date:
              </Text>
              <DateTimePicker
                value={pendingReminderDate ?? new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={new Date()}
                onChange={(_, selectedDate) => {
                  if (Platform.OS === "android") {
                    setShowReminderDatePicker(false);
                    if (selectedDate) {
                      setPendingReminderDate(selectedDate);
                      setShowReminderTimePicker(true);
                    }
                  }
                  if (selectedDate) {
                    setPendingReminderDate(selectedDate);
                  }
                }}
                themeVariant="dark"
                accentColor="#50C878"
              />
              {Platform.OS === "ios" && (
                <Pressable
                  onPress={() => {
                    setShowReminderDatePicker(false);
                    setShowReminderTimePicker(true);
                  }}
                  style={{
                    alignSelf: "flex-end",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    marginTop: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#50C878",
                    }}
                  >
                    Next: Pick Time
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {showReminderTimePicker && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: "#8FA8A8", marginBottom: 4 }}>
                Pick time:
              </Text>
              <DateTimePicker
                value={pendingReminderDate ?? new Date()}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, selectedTime) => {
                  if (Platform.OS === "android") {
                    setShowReminderTimePicker(false);
                    if (selectedTime && pendingReminderDate) {
                      const combined = new Date(pendingReminderDate);
                      combined.setHours(selectedTime.getHours());
                      combined.setMinutes(selectedTime.getMinutes());
                      setReminderAt(combined);
                      setPendingReminderDate(null);
                    }
                  }
                  if (selectedTime && pendingReminderDate) {
                    const combined = new Date(pendingReminderDate);
                    combined.setHours(selectedTime.getHours());
                    combined.setMinutes(selectedTime.getMinutes());
                    setPendingReminderDate(combined);
                  }
                }}
                themeVariant="dark"
                accentColor="#50C878"
              />
              {Platform.OS === "ios" && (
                <Pressable
                  onPress={() => {
                    setShowReminderTimePicker(false);
                    if (pendingReminderDate) {
                      setReminderAt(pendingReminderDate);
                      setPendingReminderDate(null);
                    }
                  }}
                  style={{
                    alignSelf: "flex-end",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    marginTop: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#50C878",
                    }}
                  >
                    Done
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Subtasks (edit mode only) */}
        {mode === "edit" && taskId && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#8FA8A8",
                marginBottom: 8,
              }}
            >
              Subtasks
              {subtasks.length > 0 && (
                <Text style={{ color: "#50C878", fontWeight: "400" }}>
                  {" "}
                  ({subtasks.filter((s) => s.completed).length}/
                  {subtasks.length})
                </Text>
              )}
            </Text>

            {/* Subtask list */}
            {subtasks.map((subtask) => (
              <View
                key={subtask.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                  borderBottomWidth: 1,
                  borderBottomColor: "#164B4930",
                }}
              >
                {/* Checkbox */}
                <Pressable
                  onPress={() =>
                    updateSubtask.mutate({
                      id: subtask.id,
                      completed: !subtask.completed,
                    })
                  }
                  hitSlop={8}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 1.5,
                      borderColor: subtask.completed ? "#50C878" : "#164B49",
                      backgroundColor: subtask.completed
                        ? "#50C878"
                        : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {subtask.completed && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#0A1A1A",
                          fontWeight: "700",
                          lineHeight: 14,
                        }}
                      >
                        ✓
                      </Text>
                    )}
                  </View>
                </Pressable>

                {/* Title — tap to edit inline */}
                {editingSubtaskId === subtask.id ? (
                  <TextInput
                    value={editingSubtaskTitle}
                    onChangeText={setEditingSubtaskTitle}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      const trimmed = editingSubtaskTitle.trim();
                      if (trimmed && trimmed !== subtask.title) {
                        updateSubtask.mutate({
                          id: subtask.id,
                          title: trimmed,
                        });
                      }
                      setEditingSubtaskId(null);
                    }}
                    onBlur={() => {
                      const trimmed = editingSubtaskTitle.trim();
                      if (trimmed && trimmed !== subtask.title) {
                        updateSubtask.mutate({
                          id: subtask.id,
                          title: trimmed,
                        });
                      }
                      setEditingSubtaskId(null);
                    }}
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: "#DCE4E4",
                      paddingVertical: 2,
                      paddingHorizontal: 4,
                      backgroundColor: "#0A1A1A",
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: "#50C878",
                    }}
                  />
                ) : (
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => {
                      setEditingSubtaskId(subtask.id);
                      setEditingSubtaskTitle(subtask.title);
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: subtask.completed ? "#8FA8A8" : "#DCE4E4",
                        textDecorationLine: subtask.completed
                          ? "line-through"
                          : "none",
                      }}
                    >
                      {subtask.title}
                    </Text>
                  </Pressable>
                )}

                {/* Delete button */}
                <Pressable
                  onPress={() => deleteSubtask.mutate({ id: subtask.id })}
                  hitSlop={8}
                >
                  <X size={14} color="#8FA8A8" />
                </Pressable>
              </View>
            ))}

            {/* Add subtask input */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
              }}
            >
              <TextInput
                ref={newSubtaskInputRef}
                value={newSubtaskTitle}
                onChangeText={setNewSubtaskTitle}
                placeholder="Add a subtask..."
                placeholderTextColor="#4A6A6A"
                returnKeyType="done"
                onSubmitEditing={() => {
                  const trimmed = newSubtaskTitle.trim();
                  if (!trimmed || !taskId) return;
                  createSubtask.mutate(
                    { taskId, title: trimmed },
                    {
                      onSuccess: () => {
                        setNewSubtaskTitle("");
                        newSubtaskInputRef.current?.focus();
                      },
                    },
                  );
                }}
                style={{
                  flex: 1,
                  backgroundColor: "#102A2A",
                  borderWidth: 1,
                  borderColor: "#164B49",
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: "#DCE4E4",
                }}
              />
              {createSubtask.isPending && (
                <ActivityIndicator size="small" color="#50C878" />
              )}
            </View>
          </View>
        )}

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={{
            backgroundColor: canSubmit ? "#50C878" : "#164B49",
            borderRadius: 10,
            paddingVertical: 14,
            alignItems: "center",
            marginBottom: mode === "edit" ? 12 : 0,
            opacity: canSubmit ? 1 : 0.5,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: canSubmit ? "#0A1A1A" : "#8FA8A8",
            }}
          >
            {isSubmitting
              ? "Saving..."
              : mode === "create"
                ? "Create Task"
                : "Save Changes"}
          </Text>
        </Pressable>

        {/* Delete Button (edit mode only) */}
        {mode === "edit" && onDelete && (
          <Pressable
            onPress={handleDelete}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              borderWidth: 1,
              borderColor: "rgba(239, 68, 68, 0.3)",
              borderRadius: 10,
              paddingVertical: 14,
            }}
          >
            <Trash2 size={18} color="#ef4444" />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#ef4444" }}>
              Delete Task
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </BottomSheet>
  );
}
