import type {
  BottomSheetBackdropProps,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlarmClock,
  Bell,
  Calendar,
  Check,
  Plus,
  Repeat,
  Trash2,
  X,
} from "lucide-react-native";

import type { PriorityLevel } from "./priority-config";
import { trpc } from "~/utils/api";
import { CategoryWheelPicker } from "./CategoryWheelPicker";
import { CustomDatePicker } from "./CustomDatePicker";
import { CustomTimePicker } from "./CustomTimePicker";
import { ListPickerSheet } from "./ListPickerSheet";

export type RecurrenceRuleValue =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "custom";

export interface TaskFormData {
  title: string;
  description: string;
  categoryId: string | null;
  listId: string | null;
  priority: PriorityLevel;
  dueDate: Date | null;
  reminderAt: Date | null;
  recurrenceRule: RecurrenceRuleValue | null;
  recurrenceInterval: number | null;
  /** Subtask titles to create inline (create mode only) */
  newSubtasks?: { title: string }[];
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
  onSnooze?: (taskId: string) => void;
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

const RECURRENCE_OPTIONS: {
  value: RecurrenceRuleValue;
  label: string;
}[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function TaskFormSheet({
  onClose,
  onSubmit,
  initialData,
  lists,
  isSubmitting,
  mode,
  onDelete,
  onSnooze,
  isOpen,
}: TaskFormSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const titleInputRef = useRef<TextInput>(null);
  const snapPoints = useMemo(() => ["90%"], []);
  const scrollViewRef = useRef<ScrollView>(null);
  const subtaskSectionY = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
  // Keep listId in sync when initialData changes (e.g., list filter changed on home screen)
  const [prevInitialListId, setPrevInitialListId] = useState(
    initialData?.listId,
  );
  if ((initialData?.listId ?? null) !== (prevInitialListId ?? null)) {
    setPrevInitialListId(initialData?.listId);
    setListId(initialData?.listId ?? null);
  }
  const [priority, setPriority] = useState<PriorityLevel>(
    initialData?.priority ?? "medium",
  );
  const [dueDate, setDueDate] = useState<Date | null>(
    initialData?.dueDate ?? null,
  );
  // Keep dueDate in sync when initialData changes (e.g., calendar date selected)
  const [prevInitialDueDate, setPrevInitialDueDate] = useState(
    initialData?.dueDate?.getTime(),
  );
  if (
    (initialData?.dueDate?.getTime() ?? null) !== (prevInitialDueDate ?? null)
  ) {
    setPrevInitialDueDate(initialData?.dueDate?.getTime());
    setDueDate(initialData?.dueDate ?? null);
  }
  const [reminderAt, setReminderAt] = useState<Date | null>(
    initialData?.reminderAt ?? null,
  );
  const [recurrenceRule, setRecurrenceRule] =
    useState<RecurrenceRuleValue | null>(initialData?.recurrenceRule ?? null);
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(
    initialData?.recurrenceInterval ?? 1,
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
  const [subtasks, setSubtasks] = useState<SubtaskData[]>(
    initialData?.subtasks ?? [],
  );
  const [prevInitialSubtasks, setPrevInitialSubtasks] = useState(
    initialData?.subtasks,
  );
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const newSubtaskInputRef = useRef<TextInput>(null);

  // Local-only pending subtasks for create mode (not yet persisted)
  const [pendingSubtasks, setPendingSubtasks] = useState<
    { localId: string; title: string }[]
  >([]);

  // Keep subtasks in sync when initialData changes (e.g. from query refetch)
  if (initialData?.subtasks !== prevInitialSubtasks) {
    setPrevInitialSubtasks(initialData?.subtasks);
    setSubtasks(initialData?.subtasks ?? []);
  }

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

  const handleAddSubtask = useCallback(() => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;

    if (mode === "create") {
      // In create mode: add to local pending list (no API call yet)
      setPendingSubtasks((prev) => [
        ...prev,
        { localId: `pending-${Date.now()}`, title: trimmed },
      ]);
      setNewSubtaskTitle("");
      newSubtaskInputRef.current?.focus();
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        100,
      );
      return;
    }

    if (!taskId) return;
    createSubtask.mutate(
      { taskId, title: trimmed },
      {
        onSuccess: (newSubtask) => {
          setSubtasks((prev) => [
            ...prev,
            {
              id: newSubtask.id,
              title: trimmed,
              completed: false,
              sortOrder: prev.length,
            },
          ]);
          setNewSubtaskTitle("");
          newSubtaskInputRef.current?.focus();
          setTimeout(
            () => scrollViewRef.current?.scrollToEnd({ animated: true }),
            100,
          );
        },
      },
    );
  }, [newSubtaskTitle, mode, taskId, createSubtask]);

  const resetForm = useCallback(() => {
    setTitle(initialData?.title ?? "");
    setDescription(initialData?.description ?? "");
    setCategoryId(initialData?.categoryId ?? null);
    setListId(initialData?.listId ?? null);
    setPriority(initialData?.priority ?? "medium");
    setDueDate(initialData?.dueDate ?? null);
    setReminderAt(initialData?.reminderAt ?? null);
    setRecurrenceRule(initialData?.recurrenceRule ?? null);
    setRecurrenceInterval(initialData?.recurrenceInterval ?? 1);
    setShowDatePicker(false);
    setShowReminderDatePicker(false);
    setShowReminderTimePicker(false);
    setPendingReminderDate(null);
    setSubtasks(initialData?.subtasks ?? []);
    setPendingSubtasks([]);
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
      recurrenceRule,
      recurrenceInterval: recurrenceRule ? recurrenceInterval : null,
      newSubtasks:
        mode === "create" && pendingSubtasks.length > 0
          ? pendingSubtasks.map((s) => ({ title: s.title }))
          : undefined,
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
        <Pressable
          onPress={handleOpenSheet}
          accessibilityLabel="Create task"
          accessibilityRole="button"
        >
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
          ref={scrollViewRef}
          style={styles.contentContainer}
          contentContainerStyle={[
            styles.scrollContent,
            keyboardHeight > 0 && { paddingBottom: keyboardHeight },
          ]}
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
              autoCorrect={true}
              autoCapitalize="sentences"
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
              autoCorrect={true}
              autoCapitalize="sentences"
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.textArea]}
            />
          </View>

          {/* Category & List */}
          <View style={styles.fieldContainer}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Category</Text>
                <CategoryWheelPicker
                  selectedCategoryId={categoryId}
                  onCategoryChange={setCategoryId}
                />
              </View>
              {lists && lists.length > 0 && (
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>List</Text>
                  <ListPickerSheet
                    selectedListId={listId}
                    onListChange={setListId}
                    lists={lists}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Subtasks (edit mode) */}
          {mode === "edit" && taskId && (
            <View
              style={styles.fieldContainerLarge}
              onLayout={(e) => {
                subtaskSectionY.current = e.nativeEvent.layout.y;
              }}
            >
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
                    onPress={() => {
                      const newCompleted = !subtask.completed;
                      setSubtasks((prev) =>
                        prev.map((s) =>
                          s.id === subtask.id
                            ? { ...s, completed: newCompleted }
                            : s,
                        ),
                      );
                      updateSubtask.mutate({
                        id: subtask.id,
                        completed: newCompleted,
                      });
                    }}
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
                      autoCorrect={true}
                      autoCapitalize="sentences"
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        const trimmed = editingSubtaskTitle.trim();
                        if (trimmed && trimmed !== subtask.title) {
                          setSubtasks((prev) =>
                            prev.map((s) =>
                              s.id === subtask.id
                                ? { ...s, title: trimmed }
                                : s,
                            ),
                          );
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
                          setSubtasks((prev) =>
                            prev.map((s) =>
                              s.id === subtask.id
                                ? { ...s, title: trimmed }
                                : s,
                            ),
                          );
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
                    onPress={() => {
                      setSubtasks((prev) =>
                        prev.filter((s) => s.id !== subtask.id),
                      );
                      deleteSubtask.mutate({ id: subtask.id });
                    }}
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
                  autoCorrect={true}
                  autoCapitalize="sentences"
                  returnKeyType="done"
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({
                        y: subtaskSectionY.current,
                        animated: true,
                      });
                    }, 300);
                  }}
                  onSubmitEditing={handleAddSubtask}
                  style={styles.addSubtaskInput}
                />
                {newSubtaskTitle.trim().length > 0 && (
                  <Pressable
                    onPress={handleAddSubtask}
                    disabled={createSubtask.isPending}
                    style={[
                      styles.addSubtaskButton,
                      createSubtask.isPending && { opacity: 0.5 },
                    ]}
                    hitSlop={8}
                  >
                    <Check size={16} color="#0A1A1A" strokeWidth={3} />
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* Subtasks (create mode — local-only until submit) */}
          {mode === "create" && (
            <View
              style={styles.fieldContainerLarge}
              onLayout={(e) => {
                subtaskSectionY.current = e.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.label}>
                Subtasks
                {pendingSubtasks.length > 0 && (
                  <Text style={styles.subtaskCount}>
                    {" "}
                    ({pendingSubtasks.length})
                  </Text>
                )}
              </Text>

              {pendingSubtasks.length > 0 && (
                <ScrollView
                  style={styles.pendingSubtasksList}
                  nestedScrollEnabled
                >
                  {pendingSubtasks.map((ps) => (
                    <View key={ps.localId} style={styles.subtaskRow}>
                      <View
                        style={[styles.checkbox, styles.checkboxUnchecked]}
                      />
                      <Text style={[styles.subtaskTitle, { flex: 1 }]}>
                        {ps.title}
                      </Text>
                      <Pressable
                        onPress={() =>
                          setPendingSubtasks((prev) =>
                            prev.filter((s) => s.localId !== ps.localId),
                          )
                        }
                        hitSlop={8}
                      >
                        <X size={14} color="#8FA8A8" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Add subtask input */}
              <View style={styles.addSubtaskRow}>
                <TextInput
                  ref={newSubtaskInputRef}
                  value={newSubtaskTitle}
                  onChangeText={setNewSubtaskTitle}
                  placeholder="Add a subtask..."
                  placeholderTextColor="#4A6A6A"
                  autoCorrect={true}
                  autoCapitalize="sentences"
                  returnKeyType="done"
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({
                        y: subtaskSectionY.current,
                        animated: true,
                      });
                    }, 300);
                  }}
                  onSubmitEditing={handleAddSubtask}
                  style={[
                    styles.addSubtaskInput,
                    {
                      fontSize: 16,
                      height: 48,
                      textAlignVertical: "center",
                      borderRadius: 16,
                    },
                  ]}
                />
                {newSubtaskTitle.trim().length > 0 && (
                  <Pressable
                    onPress={handleAddSubtask}
                    style={styles.addSubtaskButton}
                    hitSlop={8}
                  >
                    <Check size={16} color="#0A1A1A" strokeWidth={3} />
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* Due Date | Reminder | Priority */}
          <View style={styles.fieldContainer}>
            <View style={{ gap: 8 }}>
              {/* Due Date - full width button */}
              <Pressable
                onPress={() => {
                  if (dueDate) {
                    setShowDatePicker(true);
                  } else {
                    setDueDate(new Date());
                    setShowDatePicker(true);
                  }
                }}
                style={[
                  styles.compactIconButton,
                  dueDate && styles.compactIconButtonActive,
                ]}
              >
                <Calendar size={20} color={dueDate ? "#50C878" : "#8FA8A8"} />
                <Text
                  style={[
                    styles.compactIconLabel,
                    !dueDate && { color: "#8FA8A8" },
                  ]}
                  numberOfLines={1}
                >
                  {dueDate ? formatDate(dueDate) : "Due date"}
                </Text>
                {dueDate && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setDueDate(null);
                      setShowDatePicker(false);
                    }}
                    hitSlop={8}
                    style={{ marginLeft: "auto" }}
                  >
                    <X size={16} color="#ef4444" />
                  </Pressable>
                )}
              </Pressable>

              {/* Reminder - full width button */}
              <Pressable
                onPress={() => {
                  if (reminderAt) {
                    setPendingReminderDate(reminderAt);
                    setShowReminderDatePicker(true);
                  } else {
                    const defaultReminder = dueDate
                      ? new Date(dueDate.getTime() - 30 * 60 * 1000)
                      : new Date(Date.now() + 60 * 60 * 1000);
                    setPendingReminderDate(defaultReminder);
                    setShowReminderDatePicker(true);
                  }
                }}
                style={[
                  styles.compactIconButton,
                  reminderAt && styles.compactIconButtonActive,
                ]}
              >
                <Bell size={20} color={reminderAt ? "#50C878" : "#8FA8A8"} />
                <Text
                  style={[
                    styles.compactIconLabel,
                    !reminderAt && { color: "#8FA8A8" },
                  ]}
                  numberOfLines={1}
                >
                  {reminderAt ? formatDateTime(reminderAt) : "Reminder"}
                </Text>
                {reminderAt && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setReminderAt(null);
                      setShowReminderDatePicker(false);
                      setShowReminderTimePicker(false);
                    }}
                    hitSlop={8}
                    style={{ marginLeft: "auto" }}
                  >
                    <X size={16} color="#ef4444" />
                  </Pressable>
                )}
              </Pressable>

              {/* Priority - full width segment */}
              <View style={styles.compactPriorityRow}>
                {PRIORITY_OPTIONS.map((opt) => {
                  const isActive = priority === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setPriority(opt.value)}
                      style={[
                        styles.compactPriorityButton,
                        {
                          backgroundColor: isActive
                            ? `${opt.color}25`
                            : "transparent",
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
          </View>

          {/* Recurrence */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Repeat</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              <Pressable
                onPress={() => setRecurrenceRule(null)}
                style={[
                  styles.pill,
                  recurrenceRule === null
                    ? styles.pillActiveGreen
                    : styles.pillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: recurrenceRule === null ? "#50C878" : "#8FA8A8" },
                  ]}
                >
                  None
                </Text>
              </Pressable>
              {RECURRENCE_OPTIONS.map((opt) => {
                const isActive = recurrenceRule === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setRecurrenceRule(opt.value)}
                    style={[
                      styles.pill,
                      isActive ? styles.pillActiveGreen : styles.pillInactive,
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {isActive && <Repeat size={12} color="#50C878" />}
                      <Text
                        style={[
                          styles.pillText,
                          { color: isActive ? "#50C878" : "#8FA8A8" },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            {recurrenceRule && recurrenceRule !== "daily" && (
              <View style={styles.intervalRow}>
                <Text style={styles.intervalLabel}>Every</Text>
                <Pressable
                  onPress={() =>
                    setRecurrenceInterval(Math.max(1, recurrenceInterval - 1))
                  }
                  style={styles.intervalButton}
                >
                  <Text style={styles.intervalButtonText}>−</Text>
                </Pressable>
                <Text style={styles.intervalValue}>{recurrenceInterval}</Text>
                <Pressable
                  onPress={() =>
                    setRecurrenceInterval(Math.min(365, recurrenceInterval + 1))
                  }
                  style={styles.intervalButton}
                >
                  <Text style={styles.intervalButtonText}>+</Text>
                </Pressable>
                <Text style={styles.intervalUnit}>
                  {recurrenceRule === "weekly"
                    ? recurrenceInterval === 1
                      ? "week"
                      : "weeks"
                    : recurrenceRule === "monthly"
                      ? recurrenceInterval === 1
                        ? "month"
                        : "months"
                      : recurrenceRule === "yearly"
                        ? recurrenceInterval === 1
                          ? "year"
                          : "years"
                        : recurrenceInterval === 1
                          ? "day"
                          : "days"}
                </Text>
              </View>
            )}
          </View>

          {/* Snooze Button (edit mode only) */}
          {mode === "edit" && onSnooze && initialData?.id && (
            <Pressable
              onPress={() => {
                bottomSheetRef.current?.dismiss();
                if (initialData.id) onSnooze(initialData.id);
              }}
              style={styles.snoozeButton}
            >
              <AlarmClock size={18} color="#50C878" />
              <Text style={styles.snoozeButtonText}>Snooze</Text>
            </Pressable>
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

      {/* Due Date Picker */}
      <CustomDatePicker
        isVisible={showDatePicker}
        date={dueDate ?? new Date()}
        minimumDate={new Date()}
        onConfirm={(date) => {
          setDueDate(date);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />

      {/* Reminder Date Picker */}
      <CustomDatePicker
        isVisible={showReminderDatePicker}
        date={pendingReminderDate ?? new Date()}
        minimumDate={new Date()}
        onConfirm={(date) => {
          setPendingReminderDate(date);
          setShowReminderDatePicker(false);
          setShowReminderTimePicker(true);
        }}
        onCancel={() => setShowReminderDatePicker(false)}
      />

      {/* Reminder Time Picker */}
      <CustomTimePicker
        isVisible={showReminderTimePicker}
        date={pendingReminderDate ?? new Date()}
        onConfirm={(selectedTime) => {
          if (pendingReminderDate) {
            const combined = new Date(pendingReminderDate);
            combined.setHours(selectedTime.getHours());
            combined.setMinutes(selectedTime.getMinutes());
            setReminderAt(combined);
            setPendingReminderDate(null);
          }
          setShowReminderTimePicker(false);
        }}
        onCancel={() => setShowReminderTimePicker(false)}
      />
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
  subtaskCount: {
    color: "#50C878",
    fontWeight: "400",
  },
  subtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#164B49",
    backgroundColor: "#0A1A1A",
    borderRadius: 8,
    marginBottom: 6,
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
  pendingSubtasksList: {
    maxHeight: 180,
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
    borderWidth: 2,
    borderColor: "#50C878",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#DCE4E4",
    fontWeight: "500",
  },
  addSubtaskButton: {
    backgroundColor: "#50C878",
    borderRadius: 8,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
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
  intervalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    paddingLeft: 4,
  },
  intervalLabel: {
    fontSize: 14,
    color: "#8FA8A8",
  },
  intervalButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#164B49",
    alignItems: "center",
    justifyContent: "center",
  },
  intervalButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#DCE4E4",
  },
  intervalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#50C878",
    width: 24,
    textAlign: "center",
  },
  intervalUnit: {
    fontSize: 14,
    color: "#8FA8A8",
  },
  snoozeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(80, 200, 120, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(80, 200, 120, 0.3)",
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 12,
  },
  snoozeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#50C878",
  },
  compactIconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#102A2A",
    borderWidth: 1,
    borderColor: "#164B49",
    borderRadius: 8,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  compactIconButtonActive: {
    borderColor: "#50C878",
    backgroundColor: "rgba(80, 200, 120, 0.1)",
  },
  compactIconLabel: {
    fontSize: 15,
    color: "#DCE4E4",
    flex: 1,
  },
  compactPriorityRow: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#164B49",
    backgroundColor: "#102A2A",
  },
  compactPriorityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
    borderColor: "#164B49",
  },
});
