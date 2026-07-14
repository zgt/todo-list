import { useEffect, useRef, useState } from "react";

import type { RouterOutputs } from "@acme/api";
import type { TaskPriority } from "@acme/db/schema";
import { toast } from "@acme/ui/toast";

import type { RecurrenceRuleType } from "../recurrence-utils";
import type { useTaskMutations } from "./useTaskMutations";
import { EditTaskSchema } from "../schemas";

type Task = RouterOutputs["task"]["all"][number];
type UpdateTaskMutation = ReturnType<typeof useTaskMutations>["updateTask"];

// Edit-mode form state and handlers for a task card. Owns the inline edit /
// expand / animation state, the edited-field buffers, and the save/cancel flow.
export function useTaskEditForm(task: Task, updateTask: UpdateTaskMutation) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimatingExpand, setIsAnimatingExpand] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDescription, setEditedDescription] = useState(
    task.description ?? "",
  );
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(
    task.dueDate ?? undefined,
  );
  const [editedCategoryId, setEditedCategoryId] = useState<string | undefined>(
    task.categoryId ?? undefined,
  );
  const [editedPriority, setEditedPriority] = useState<TaskPriority>(
    (task.priority ?? "medium") as TaskPriority,
  );
  const [editedReminderAt, setEditedReminderAt] = useState<Date | undefined>(
    task.reminderAt ?? undefined,
  );
  const [editedListId, setEditedListId] = useState<string | undefined>(
    task.listId ?? undefined,
  );
  const [editedRecurrenceRule, setEditedRecurrenceRule] =
    useState<RecurrenceRuleType>(
      (task.recurrenceRule as RecurrenceRuleType) ?? null,
    );
  const [editedRecurrenceInterval, setEditedRecurrenceInterval] = useState(
    task.recurrenceInterval ?? 1,
  );
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleToggleComplete = () => {
    updateTask.mutate({
      id: task.id,
      completed: !task.completed,
    });
  };

  const handleEditClick = () => {
    setEditedTitle(task.title);
    setEditedDescription(task.description ?? "");
    setEditedDueDate(task.dueDate ?? undefined);
    setEditedCategoryId(task.categoryId ?? undefined);
    setEditedPriority((task.priority ?? "medium") as TaskPriority);
    setEditedReminderAt(task.reminderAt ?? undefined);
    setEditedListId(task.listId ?? undefined);
    setEditedRecurrenceRule(
      (task.recurrenceRule as RecurrenceRuleType) ?? null,
    );
    setEditedRecurrenceInterval(task.recurrenceInterval ?? 1);
    setIsExpanded(true);
    setIsEditing(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const handleSave = async () => {
    // Validate
    const validation = EditTaskSchema.safeParse({
      title: editedTitle,
      description: editedDescription,
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      toast.error(firstError?.message ?? "Validation failed");
      return;
    }

    try {
      await updateTask.mutateAsync({
        id: task.id,
        title: editedTitle,
        description: editedDescription || undefined,
        dueDate: editedDueDate ?? null,
        categoryId: editedCategoryId ?? null,
        priority: editedPriority,
        reminderAt: editedReminderAt ?? null,
        listId: editedListId ?? null,
        recurrenceRule: editedRecurrenceRule ?? null,
        recurrenceInterval: editedRecurrenceRule
          ? editedRecurrenceInterval
          : null,
      });
      setIsEditing(false);
      setIsExpanded(false);
      toast.success("Task updated!");
    } catch {
      // Error is already handled in mutation onError
    }
  };

  const handleCancel = () => {
    setEditedTitle(task.title);
    setEditedDescription(task.description ?? "");
    setEditedDueDate(task.dueDate ?? undefined);
    setEditedCategoryId(task.categoryId ?? undefined);
    setEditedPriority((task.priority ?? "medium") as TaskPriority);
    setEditedReminderAt(task.reminderAt ?? undefined);
    setEditedListId(task.listId ?? undefined);
    setEditedRecurrenceRule(
      (task.recurrenceRule as RecurrenceRuleType) ?? null,
    );
    setEditedRecurrenceInterval(task.recurrenceInterval ?? 1);
    setIsEditing(false);
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSave();
    }
  };

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing]);

  const hasChanges =
    editedTitle !== task.title ||
    editedDescription !== (task.description ?? "") ||
    editedDueDate?.getTime() !== task.dueDate?.getTime() ||
    editedCategoryId !== task.categoryId ||
    editedPriority !== (task.priority ?? "medium") ||
    editedReminderAt?.getTime() !== task.reminderAt?.getTime() ||
    (editedListId ?? null) !== (task.listId ?? null) ||
    (editedRecurrenceRule ?? null) !== (task.recurrenceRule ?? null) ||
    editedRecurrenceInterval !== (task.recurrenceInterval ?? 1);

  return {
    isEditing,
    setIsEditing,
    isExpanded,
    setIsExpanded,
    isAnimatingExpand,
    setIsAnimatingExpand,
    editedTitle,
    setEditedTitle,
    editedDescription,
    setEditedDescription,
    editedDueDate,
    setEditedDueDate,
    editedCategoryId,
    setEditedCategoryId,
    editedPriority,
    setEditedPriority,
    editedReminderAt,
    setEditedReminderAt,
    editedListId,
    setEditedListId,
    editedRecurrenceRule,
    setEditedRecurrenceRule,
    editedRecurrenceInterval,
    setEditedRecurrenceInterval,
    titleInputRef,
    handleToggleComplete,
    handleEditClick,
    handleSave,
    handleCancel,
    handleKeyDown,
    hasChanges,
  };
}
