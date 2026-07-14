"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, X } from "lucide-react";

import type { TaskPriority } from "@acme/db/schema";
import { cn } from "@acme/ui";
import { Input } from "@acme/ui/input";
import { toast } from "@acme/ui/toast";

import type { RecurrenceRuleType } from "./recurrence-utils";
import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";
import { CategoryTreePicker } from "../category-tree-picker";
import { useCreateTask } from "../create-task-context";
import { ListPickerPill } from "../list-picker-pill";
import { PrioritySelectorPill } from "../priority";
import { DueDatePill } from "./DueDatePill";
import { RecurrencePill } from "./RecurrencePill";
import { ReminderPill } from "./ReminderPill";

// --- Inline create task row ---

export function InlineCreateTask({
  initialDueDate,
}: {
  initialDueDate?: Date;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { setIsCreating } = useCreateTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(initialDueDate);
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [reminderAt, setReminderAt] = useState<Date | undefined>();
  const [listId, setListId] = useState<string | undefined>();
  const [recurrenceRule, setRecurrenceRule] =
    useState<RecurrenceRuleType>(null);
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [pendingSubtasks, setPendingSubtasks] = useState<
    { localId: string; title: string }[]
  >([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const newSubtaskInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: categories } = useQuery({
    ...trpc.category.all.queryOptions(),
    enabled: !!session?.user,
  });

  const createTask = useMutation(
    trpc.task.create.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.task.pathFilter()),
          queryClient.invalidateQueries(trpc.taskList.pathFilter()),
        ]);
        setIsCreating(false);
        toast.success("Task created!");
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in"
            : "Failed to create task",
        );
      },
    }),
  );

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    createTask.mutate({
      title: title.trim(),
      description: description || undefined,
      dueDate,
      categoryId,
      priority,
      reminderAt,
      listId,
      recurrenceRule: recurrenceRule ?? undefined,
      recurrenceInterval: recurrenceRule ? recurrenceInterval : undefined,
      subtasks:
        pendingSubtasks.length > 0
          ? pendingSubtasks.map((s) => ({ title: s.title }))
          : undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsCreating(false);
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  // Close on click outside (but not on portal-rendered popovers/selects)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Ignore clicks on any Radix UI portal content (popovers, selects, dialogs, menus)
      if (
        target.closest("[data-radix-popper-content-wrapper]") ||
        target.closest("[data-radix-select-viewport]") ||
        target.closest("[data-radix-dismissable-layer]") ||
        target.closest("[role='dialog']") ||
        target.closest("[role='listbox']") ||
        target.closest("[role='menu']")
      ) {
        return;
      }
      // Also ignore if any Radix portal content exists in the DOM
      // (catches overlay/backdrop clicks that dismiss selects/popovers)
      if (
        document.querySelector("[data-radix-popper-content-wrapper]") ||
        document.querySelector("[data-radix-select-content]")
      ) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsCreating(false);
      }
    };
    // Use pointerdown instead of mousedown for better Radix compatibility
    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, [setIsCreating]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative overflow-hidden rounded-2xl transition-all duration-300",
        "border-primary/50 bg-surface-2/80 border backdrop-blur-sm",
      )}
    >
      {/* Top row with inline title input */}
      <div className="flex flex-row items-center gap-2 p-3 pb-0 sm:gap-3 sm:px-4 sm:pt-4 sm:pb-0">
        {/* Inline title input */}
        <div className="min-w-0 grow">
          <Input
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="New task..."
            className={cn(
              "border-border-strong bg-surface-2 placeholder:text-muted-foreground text-white",
              "focus:border-border-focus focus:ring-border-focus/20 focus:ring-2",
              "rounded-md px-2 py-1 text-sm font-medium sm:px-3 sm:py-1.5 sm:text-lg",
              "w-full sm:max-w-md",
            )}
            aria-label="New task title"
            disabled={createTask.isPending}
          />
        </div>
      </div>

      {/* Expanded area (always open for create) */}
      <div className="border-border-strong mx-3 mt-2 border-t sm:mx-4 sm:mt-3" />
      <div className="px-3 pt-2 pb-3 sm:px-4 sm:pt-3 sm:pb-4">
        {/* Description textarea */}
        <div className="mt-1 max-w-2xl">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsCreating(false);
            }}
            placeholder="Description (optional)"
            rows={2}
            className={cn(
              "border-border-strong bg-surface-2 text-foreground placeholder:text-muted-foreground w-full resize-y border",
              "focus:border-border-focus focus:ring-border-focus/20 focus:ring-2 focus:outline-none",
              "rounded-md px-3 py-2 text-sm",
            )}
            aria-label="New task description"
            disabled={createTask.isPending}
          />
        </div>

        {/* Subtasks */}
        <div className="mt-2 max-w-2xl">
          <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wider uppercase">
            Subtasks
            {pendingSubtasks.length > 0 && (
              <span className="text-primary ml-1 font-normal">
                ({pendingSubtasks.length})
              </span>
            )}
          </p>

          {pendingSubtasks.length > 0 && (
            <div className="mb-2 space-y-1">
              {pendingSubtasks.map((ps) => (
                <div
                  key={ps.localId}
                  className="border-border-strong bg-surface flex items-center gap-2 rounded-lg border px-3 py-2"
                >
                  <div className="border-border-strong size-4 shrink-0 rounded border" />
                  <span className="text-foreground flex-1 truncate text-sm">
                    {ps.title}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingSubtasks((prev) =>
                        prev.filter((s) => s.localId !== ps.localId),
                      )
                    }
                    className="text-muted-foreground shrink-0 transition-colors hover:text-red-400"
                    aria-label={`Remove subtask: ${ps.title}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              ref={newSubtaskInputRef}
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  const trimmed = newSubtaskTitle.trim();
                  if (trimmed) {
                    setPendingSubtasks((prev) => [
                      ...prev,
                      { localId: `pending-${Date.now()}`, title: trimmed },
                    ]);
                    setNewSubtaskTitle("");
                  }
                } else if (e.key === "Escape") {
                  setIsCreating(false);
                }
              }}
              placeholder="Add a subtask..."
              className={cn(
                "border-border-strong bg-surface-2 text-foreground placeholder:text-muted-foreground",
                "focus:border-border-focus focus:ring-border-focus/20 focus:ring-2",
                "rounded-md px-3 py-1.5 text-sm",
                "flex-1",
              )}
              aria-label="New subtask title"
              disabled={createTask.isPending}
            />
            {newSubtaskTitle.trim() && (
              <button
                type="button"
                onClick={() => {
                  const trimmed = newSubtaskTitle.trim();
                  if (trimmed) {
                    setPendingSubtasks((prev) => [
                      ...prev,
                      { localId: `pending-${Date.now()}`, title: trimmed },
                    ]);
                    setNewSubtaskTitle("");
                    newSubtaskInputRef.current?.focus();
                  }
                }}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                  "bg-primary text-primary-foreground hover:bg-primary-hover",
                  "transition-colors",
                )}
                aria-label="Add subtask"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Field controls row + Save/Cancel */}
        <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-3">
          <PrioritySelectorPill
            value={priority}
            onChange={setPriority}
            disabled={createTask.isPending}
          />
          <DueDatePill
            value={dueDate}
            onChange={setDueDate}
            disabled={createTask.isPending}
            placeholder="Due date"
          />
          <CategoryTreePicker
            categories={categories ?? []}
            value={categoryId}
            onChange={setCategoryId}
            disabled={createTask.isPending}
          />
          <ReminderPill
            value={reminderAt}
            onChange={setReminderAt}
            disabled={createTask.isPending}
          />
          <ListPickerPill
            value={listId}
            onChange={setListId}
            disabled={createTask.isPending}
          />
          <RecurrencePill
            rule={recurrenceRule}
            interval={recurrenceInterval}
            onRuleChange={setRecurrenceRule}
            onIntervalChange={setRecurrenceInterval}
            disabled={createTask.isPending}
          />

          {/* Save/Cancel inline */}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              disabled={createTask.isPending}
              className={cn(
                "border-border-strong bg-surface-2/80 text-muted-foreground flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md",
                "hover:border-border-focus hover:bg-surface-2 hover:text-foreground transition-all",
              )}
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={createTask.isPending || !title.trim()}
              className={cn(
                "border-primary/50 bg-primary/20 text-primary flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md",
                "hover:bg-primary/30 transition-all",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {createTask.isPending ? (
                "..."
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
