"use client";

import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";

import type { RouterOutputs } from "@acme/api";
import type { TaskPriority } from "@acme/db/schema";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import { toast } from "@acme/ui/toast";

import type { useTaskMutations } from "../hooks/useTaskMutations";
import type { RecurrenceRuleType } from "../recurrence-utils";
import { CategoryTreePicker } from "../../category-tree-picker";
import { ListPickerPill } from "../../list-picker-pill";
import { PrioritySelectorPill } from "../../priority";
import { DueDatePill } from "../DueDatePill";
import { RecurrencePill } from "../RecurrencePill";
import { ReminderPill } from "../ReminderPill";
import { EditTaskSchema } from "../schemas";
import { SubtaskSection } from "../SubtaskSection";

type Task = RouterOutputs["task"]["all"][number];
type UpdateTaskMutation = ReturnType<typeof useTaskMutations>["updateTask"];

/**
 * The flip side of a dynamic task card: the full edit form. Field set and save
 * semantics mirror the list view's inline editor (same pills, same schema,
 * same update mutation) — just laid out for a card face.
 */
export function CardBack({
  task,
  categories,
  updateTask,
  onClose,
  padding,
}: {
  task: Task;
  categories: RouterOutputs["category"]["all"] | undefined;
  updateTask: UpdateTaskMutation;
  onClose: () => void;
  /**
   * The front face's padding for this tile's weight (FACE_METRICS[weight].pad).
   * Both faces must share it — the back face had its own `p-4 sm:p-5`, so
   * flipping a hero or standard tile shifted every field sideways mid-flip.
   */
  padding: string;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.dueDate ?? undefined,
  );
  const [categoryId, setCategoryId] = useState<string | undefined>(
    task.categoryId ?? undefined,
  );
  const [priority, setPriority] = useState<TaskPriority>(
    (task.priority ?? "medium") as TaskPriority,
  );
  const [reminderAt, setReminderAt] = useState<Date | undefined>(
    task.reminderAt ?? undefined,
  );
  const [listId, setListId] = useState<string | undefined>(
    task.listId ?? undefined,
  );
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRuleType>(
    (task.recurrenceRule as RecurrenceRuleType) ?? null,
  );
  const [recurrenceInterval, setRecurrenceInterval] = useState(
    task.recurrenceInterval ?? 1,
  );

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, []);

  const handleSave = async () => {
    const validation = EditTaskSchema.safeParse({ title, description });
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? "Validation failed");
      return;
    }

    try {
      await updateTask.mutateAsync({
        id: task.id,
        title,
        description: description || undefined,
        dueDate: dueDate ?? null,
        categoryId: categoryId ?? null,
        priority,
        reminderAt: reminderAt ?? null,
        listId: listId ?? null,
        recurrenceRule: recurrenceRule ?? null,
        recurrenceInterval: recurrenceRule ? recurrenceInterval : null,
      });
      toast.success("Task updated!");
      onClose();
    } catch {
      // Error toast handled by the mutation's onError.
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSave();
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", padding)}>
      <Input
        ref={titleInputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleTitleKeyDown}
        placeholder="Task title"
        aria-label="Edit task title"
        disabled={updateTask.isPending}
        className={cn(
          "border-border-strong bg-surface-2 placeholder:text-muted-foreground text-white",
          "focus:border-border-focus focus:ring-border-focus/20 focus:ring-2",
          "rounded-md px-3 py-1.5 text-base font-medium",
        )}
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          // Enter is allowed — newlines in descriptions
        }}
        placeholder="Add a description..."
        rows={2}
        aria-label="Edit task description"
        disabled={updateTask.isPending}
        className={cn(
          "border-border-strong bg-surface-2 text-foreground placeholder:text-muted-foreground w-full resize-y border",
          "focus:border-border-focus focus:ring-border-focus/20 focus:ring-2 focus:outline-none",
          "rounded-lg px-3 py-2 text-sm leading-relaxed",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />

      {/* Recessed well: the pills are `bg-surface-2/80`, the same value as the
          card's own glass, so on a card face they'd read as flat. Dropping them
          onto the darker `surface` gives back the pill-vs-card separation
          without touching the shared pill components (which the list view and
          the create panel also render, on their own backgrounds). */}
      <div className="border-border-strong/40 bg-surface/60 flex flex-wrap items-center gap-2 rounded-lg border p-2.5">
        <PrioritySelectorPill
          value={priority}
          onChange={setPriority}
          disabled={updateTask.isPending}
        />
        <DueDatePill
          value={dueDate}
          onChange={setDueDate}
          disabled={updateTask.isPending}
          placeholder="Set due date"
        />
        <CategoryTreePicker
          categories={categories ?? []}
          value={categoryId}
          onChange={setCategoryId}
          disabled={updateTask.isPending}
        />
        <ReminderPill
          value={reminderAt}
          onChange={setReminderAt}
          disabled={updateTask.isPending}
        />
        <ListPickerPill
          value={listId}
          onChange={setListId}
          disabled={updateTask.isPending}
        />
        <RecurrencePill
          rule={recurrenceRule}
          interval={recurrenceInterval}
          onRuleChange={setRecurrenceRule}
          onIntervalChange={setRecurrenceInterval}
          disabled={updateTask.isPending}
        />
      </div>

      <SubtaskSection task={task} />

      <div className="border-border-strong/40 flex items-center justify-between gap-2 border-t pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={updateTask.isPending}
          aria-label="Flip card back without saving"
          className="text-muted-foreground hover:bg-surface-hover hover:text-foreground h-11 px-3 text-xs"
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          Back
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void handleSave()}
          disabled={updateTask.isPending || !title.trim()}
          className={cn(
            "bg-primary text-primary-foreground hover:bg-primary-hover h-11 px-4 text-xs",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {updateTask.isPending ? (
            "..."
          ) : (
            <>
              <Check className="mr-1 h-3.5 w-3.5" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
