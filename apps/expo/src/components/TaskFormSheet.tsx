import type {
  BottomSheetBackdropProps,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetModal as BSModal,
} from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Calendar, Plus, Trash2, X } from "lucide-react-native";

import type { PriorityLevel } from "./priority-config";
import { CategoryWheelPicker } from "./CategoryWheelPicker";
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

interface TaskList {
  id: string;
  name: string;
  color: string | null;
}

interface TaskFormSheetProps {
  onClose?: () => void;
  onSubmit: (data: TaskFormData) => void;
  initialData?: Partial<TaskFormData> & {
    id?: string;
    subtasks?: SubtaskData[];
  };
  lists?: TaskList[];
  isSubmitting?: boolean;
  mode: "create" | "edit";
  onDelete?: () => void;
  /** For edit mode: controlled open state (e.g. !!editingTask) */
  isOpen?: boolean;
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
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function TaskFormSheet({
  onClose,
  onSubmit,
  initialData,
  lists,
  isSubmitting,
  mode,
  onDelete,
  isOpen,
}: TaskFormSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const titleInputRef = useRef<TextInput>(null);
  const snapPoints = useMemo(() => ["85%"], []);

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

  const resetForm = useCallback(() => {
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
  }, [initialData]);

  // For edit mode: controlled by isOpen prop
  useEffect(() => {
    if (isOpen === undefined) return;
    if (isOpen) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [isOpen]);

  // For create mode: trigger opens the sheet
  const handleOpenSheet = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetRef.current?.present();
  }, []);

  const handleDismiss = useCallback(() => {
    resetForm();
    onClose?.();
  }, [resetForm, onClose]);

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
    bottomSheetRef.current?.dismiss();
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
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
      />
    ),
    [],
  );

  const canSubmit = title.trim().length > 0 && !isSubmitting;

  return (
    <>
      {/* FAB trigger for create mode */}
      {mode === "create" && (
        <Pressable onPress={handleOpenSheet}>
          <View style={styles.fab}>
            <Plus size={32} color="#0A1A1A" />
          </View>
        </Pressable>
      )}

      {/* Bottom Sheet */}
      <BSModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        onDismiss={handleDismiss}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetScrollView
          style={styles.contentContainer}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {mode === "create" ? "New Task" : "Edit Task"}
            </Text>
            <Pressable
              onPress={() => bottomSheetRef.current?.dismiss()}
              hitSlop={12}
            >
              <X size={24} color="#8FA8A8" />
            </Pressable>
          </View>

          {/* Title */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              ref={titleInputRef}
              value={title}
              onChangeText={setTitle}
              placeholder="What needs to be done?"
              placeholderTextColor="#4A6A6A"
              style={styles.input}
            />
          </View>

          {/* Description */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add details..."
              placeholderTextColor="#4A6A6A"
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.textArea]}
            />
          </View>

          {/* Category */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Category</Text>
            <CategoryWheelPicker
              selectedCategoryId={categoryId}
              onCategoryChange={setCategoryId}
            />
          </View>

          {/* List */}
          {lists && lists.length > 0 && (
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>List</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillRow}
              >
                <Pressable
                  onPress={() => setListId(null)}
                  style={[
                    styles.pill,
                    listId === null
                      ? styles.pillActiveGreen
                      : styles.pillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: listId === null ? "#50C878" : "#8FA8A8" },
                    ]}
                  >
                    Personal
                  </Text>
                </Pressable>
                {lists.map((list) => {
                  const isActive = listId === list.id;
                  const color = list.color ?? "#50C878";
                  return (
                    <Pressable
                      key={list.id}
                      onPress={() => setListId(list.id)}
                      style={[
                        styles.pill,
                        styles.listPill,
                        isActive
                          ? { borderColor: color, backgroundColor: `${color}25` }
                          : styles.pillInactive,
                      ]}
                    >
                      <View
                        style={[styles.listDot, { backgroundColor: color }]}
                      />
                      <Text
                        style={[
                          styles.pillText,
                          { color: isActive ? color : "#8FA8A8" },
                        ]}
                      >
                        {list.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Priority */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map((opt) => {
                const isActive = priority === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setPriority(opt.value)}
                    style={[
                      styles.priorityButton,
                      {
                        backgroundColor: isActive
                          ? `${opt.color}25`
                          : "#102A2A",
                        borderRightWidth: opt.value !== "high" ? 1 : 0,
                      },
                    ]}
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
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Due Date</Text>
            {dueDate ? (
              <View style={styles.dateRow}>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={styles.dateButton}
                >
                  <Calendar size={16} color="#50C878" />
                  <Text style={styles.dateText}>{formatDate(dueDate)}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setDueDate(null);
                    setShowDatePicker(false);
                  }}
                  hitSlop={8}
                  style={styles.clearDateButton}
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
                style={styles.addDateButton}
              >
                <Calendar size={16} color="#8FA8A8" />
                <Text style={styles.addDateText}>Add due date</Text>
              </Pressable>
            )}
            {showDatePicker && (
              <View style={styles.pickerContainer}>
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
                    style={styles.pickerDoneButton}
                  >
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Reminder */}
          <View style={styles.fieldContainerLarge}>
            <Text style={styles.label}>Reminder</Text>
            {reminderAt ? (
              <View style={styles.dateRow}>
                <Pressable
                  onPress={() => {
                    setPendingReminderDate(reminderAt);
                    setShowReminderDatePicker(true);
                  }}
                  style={styles.dateButton}
                >
                  <Bell size={16} color="#50C878" />
                  <Text style={styles.dateText}>
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
                  style={styles.clearDateButton}
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
                style={styles.addDateButton}
              >
                <Bell size={16} color="#8FA8A8" />
                <Text style={styles.addDateText}>Add reminder</Text>
              </Pressable>
            )}

            {/* Reminder date picker */}
            {showReminderDatePicker && (
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Pick date:</Text>
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
                    style={styles.pickerDoneButton}
                  >
                    <Text style={styles.pickerDoneText}>Next: Pick Time</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Reminder time picker */}
            {showReminderTimePicker && (
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Pick time:</Text>
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
                    style={styles.pickerDoneButton}
                  >
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Subtasks (edit mode only) */}
          {mode === "edit" && taskId && (
            <View style={styles.fieldContainerLarge}>
              <Text style={styles.label}>
                Subtasks
                {subtasks.length > 0 && (
                  <Text style={styles.subtaskCount}>
                    {" "}
                    ({subtasks.filter((s) => s.completed).length}/
                    {subtasks.length})
                  </Text>
                )}
              </Text>

              {subtasks.map((subtask) => (
                <View key={subtask.id} style={styles.subtaskRow}>
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
                      style={[
                        styles.checkbox,
                        subtask.completed
                          ? styles.checkboxChecked
                          : styles.checkboxUnchecked,
                      ]}
                    >
                      {subtask.completed && (
                        <Text style={styles.checkmark}>✓</Text>
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
                      style={styles.subtaskEditInput}
                    />
                  ) : (
                    <Pressable
                      style={styles.subtaskTitlePressable}
                      onPress={() => {
                        setEditingSubtaskId(subtask.id);
                        setEditingSubtaskTitle(subtask.title);
                      }}
                    >
                      <Text
                        style={[
                          styles.subtaskTitle,
                          subtask.completed && styles.subtaskTitleCompleted,
                        ]}
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
              <View style={styles.addSubtaskRow}>
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
                  style={styles.addSubtaskInput}
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
            style={[
              styles.submitButton,
              !canSubmit && styles.submitButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.submitButtonText,
                !canSubmit && styles.submitButtonTextDisabled,
              ]}
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
            <Pressable onPress={handleDelete} style={styles.deleteButton}>
              <Trash2 size={18} color="#ef4444" />
              <Text style={styles.deleteButtonText}>Delete Task</Text>
            </Pressable>
          )}
        </BottomSheetScrollView>
      </BSModal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#50C878",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  sheetBackground: {
    backgroundColor: "#0A1A1A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: "#164B49",
    width: 40,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#DCE4E4",
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldContainerLarge: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8FA8A8",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#102A2A",
    borderWidth: 1,
    borderColor: "#164B49",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#DCE4E4",
  },
  textArea: {
    fontSize: 15,
    minHeight: 80,
  },
  pillRow: {
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1.5,
  },
  pillActiveGreen: {
    borderColor: "#50C878",
    backgroundColor: "rgba(80, 200, 120, 0.15)",
  },
  pillInactive: {
    borderColor: "#164B49",
    backgroundColor: "transparent",
  },
  pillText: {
    fontSize: 13,
  },
  listPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  listDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityRow: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#164B49",
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderColor: "#164B49",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateButton: {
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
  },
  dateText: {
    fontSize: 14,
    color: "#DCE4E4",
  },
  clearDateButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  addDateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#102A2A",
    borderWidth: 1,
    borderColor: "#164B49",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addDateText: {
    fontSize: 14,
    color: "#8FA8A8",
  },
  pickerContainer: {
    marginTop: 8,
  },
  pickerLabel: {
    fontSize: 12,
    color: "#8FA8A8",
    marginBottom: 4,
  },
  pickerDoneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  pickerDoneText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#50C878",
  },
  subtaskCount: {
    color: "#50C878",
    fontWeight: "400",
  },
  subtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#164B4930",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: "#50C878",
    backgroundColor: "#50C878",
  },
  checkboxUnchecked: {
    borderColor: "#164B49",
    backgroundColor: "transparent",
  },
  checkmark: {
    fontSize: 12,
    color: "#0A1A1A",
    fontWeight: "700",
    lineHeight: 14,
  },
  subtaskEditInput: {
    flex: 1,
    fontSize: 14,
    color: "#DCE4E4",
    paddingVertical: 2,
    paddingHorizontal: 4,
    backgroundColor: "#0A1A1A",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#50C878",
  },
  subtaskTitlePressable: {
    flex: 1,
  },
  subtaskTitle: {
    fontSize: 14,
    color: "#DCE4E4",
  },
  subtaskTitleCompleted: {
    color: "#8FA8A8",
    textDecorationLine: "line-through",
  },
  addSubtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  addSubtaskInput: {
    flex: 1,
    backgroundColor: "#102A2A",
    borderWidth: 1,
    borderColor: "#164B49",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#DCE4E4",
  },
  submitButton: {
    backgroundColor: "#50C878",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: "#164B49",
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0A1A1A",
  },
  submitButtonTextDisabled: {
    color: "#8FA8A8",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 10,
    paddingVertical: 14,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ef4444",
  },
});
