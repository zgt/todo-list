"use client";

import { useEffect, useRef, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Bell, Calendar, Check, Pencil, Trash2, X } from "lucide-react";
import { z } from "zod";

import type { RouterOutputs } from "@acme/api";
import type { TaskPriority } from "@acme/db/schema";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Checkbox } from "@acme/ui/checkbox";
import { DatePicker } from "@acme/ui/date-picker";
import { Input } from "@acme/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";
import { toast } from "@acme/ui/toast";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";
import { useCategoryFilter } from "./category-filter-context";
import { CategoryTreePicker } from "./category-tree-picker";
import { useCreateTask } from "./create-task-context";
import { PriorityBadge, PrioritySelectorPill } from "./priority";
import { usePriorityFilter } from "./priority-filter-context";

// Validation schema for inline task editing
const EditTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
});

// --- Helper functions for reminder display and datetime-local conversion ---

function formatReminder(reminderAt: Date): string {
  const now = new Date();
  const diff = reminderAt.getTime() - now.getTime();
  if (diff < 0) return "Overdue";
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 60) return `in ${minutes}m`;
  if (hours < 24) return `in ${hours}h`;
  if (days < 7) return `in ${days}d`;
  return (
    reminderAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }) +
    " at " +
    reminderAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  );
}

function toDatetimeLocal(date: Date | undefined): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromDatetimeLocal(value: string): Date | undefined {
  if (!value) return undefined;
  return new Date(value);
}

// --- Reminder pill used in both InlineCreateTask and TaskCard edit mode ---

function ReminderPill({
  value,
  onChange,
  disabled,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md",
            "transition-all hover:border-[#21716C]",
            "focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
            value
              ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
              : "border-[#164B49] bg-[#102A2A]/80 text-[#DCE4E4] hover:bg-[#102A2A]",
          )}
          disabled={disabled}
        >
          <Bell className="h-3.5 w-3.5" />
          {value ? formatReminder(value) : "Reminder"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="end">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[#DCE4E4]">
            Set reminder
          </label>
          <input
            type="datetime-local"
            value={toDatetimeLocal(value)}
            onChange={(e) => onChange(fromDatetimeLocal(e.target.value))}
            className="rounded-md border border-[#164B49] bg-[#102A2A] px-3 py-2 text-sm text-[#DCE4E4] focus:border-[#21716C] focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none"
          />
          {value && (
            <button
              onClick={() => onChange(undefined)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium",
                "bg-[#102A2A] text-[#8FA8A8] hover:bg-[#183F3F] hover:text-[#DCE4E4]",
                "transition-all",
              )}
            >
              <X className="h-3 w-3" />
              Clear reminder
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// --- Inline create task row ---

function InlineCreateTask() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { setIsCreating } = useCreateTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [reminderAt, setReminderAt] = useState<Date | undefined>();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: categories } = useQuery({
    ...trpc.category.all.queryOptions(),
    enabled: !!session?.user,
  });

  const createTask = useMutation(
    trpc.task.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.task.pathFilter());
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

  // Close on click outside (but not on portal-rendered popovers)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-radix-popper-content-wrapper]") ||
        target.closest("[role='dialog']")
      ) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsCreating(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsCreating]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative flex flex-row items-center gap-4 overflow-hidden rounded-2xl p-6 transition-all duration-300",
        "glass-card border-primary/50 shadow-glow bg-primary/5",
      )}
    >
      {/* Spacer for checkbox alignment */}
      <div className="size-6 shrink-0" />

      <div className="grow space-y-2">
        <div className="flex max-w-2xl gap-3">
          <div className="w-64">
            <Input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Task title"
              className={cn(
                "border-[#164B49] bg-[#102A2A] text-white placeholder:text-[#8FA8A8]",
                "focus:border-[#21716C] focus:ring-2 focus:ring-[#21716C]/20",
                "rounded-md px-3 py-1.5 text-lg font-medium",
              )}
              aria-label="New task title"
              disabled={createTask.isPending}
            />
          </div>
          <div className="w-80">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Description (optional)"
              className={cn(
                "border-[#164B49] bg-[#102A2A] text-[#DCE4E4] placeholder:text-[#8FA8A8]",
                "focus:border-[#21716C] focus:ring-2 focus:ring-[#21716C]/20",
                "rounded-md px-3 py-1.5 text-sm",
              )}
              aria-label="New task description"
              disabled={createTask.isPending}
            />
          </div>
        </div>
      </div>

      {/* Priority */}
      <div className="z-10 -translate-x-32 transition-transform duration-300 ease-in-out">
        <PrioritySelectorPill
          value={priority}
          onChange={setPriority}
          disabled={createTask.isPending}
        />
      </div>

      {/* Due Date */}
      <div className="z-10 -translate-x-32 transition-transform duration-300 ease-in-out">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 rounded-full border border-[#164B49] bg-[#102A2A]/80 px-4 py-1.5 text-xs font-medium text-[#DCE4E4] backdrop-blur-md",
                "transition-all hover:border-[#21716C] hover:bg-[#102A2A]",
                "focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
              )}
              disabled={createTask.isPending}
            >
              <Calendar className="h-3.5 w-3.5" />
              {dueDate
                ? new Date(dueDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Due date"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="flex flex-col">
              <DatePicker date={dueDate} onDateChange={setDueDate} />
              {dueDate && (
                <div className="border-t border-[#164B49] p-2">
                  <button
                    onClick={() => setDueDate(undefined)}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium",
                      "bg-[#102A2A] text-[#8FA8A8] hover:bg-[#183F3F] hover:text-[#DCE4E4]",
                      "transition-all",
                    )}
                  >
                    <X className="h-3 w-3" />
                    Clear date
                  </button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Category */}
      <div className="z-10 -translate-x-32 transition-transform duration-300 ease-in-out">
        <CategoryTreePicker
          categories={categories ?? []}
          value={categoryId}
          onChange={setCategoryId}
          disabled={createTask.isPending}
        />
      </div>

      {/* Reminder */}
      <div className="z-10 -translate-x-32 transition-transform duration-300 ease-in-out">
        <ReminderPill
          value={reminderAt}
          onChange={setReminderAt}
          disabled={createTask.isPending}
        />
      </div>

      {/* Save/Cancel buttons */}
      <div className="animate-in slide-in-from-right-5 absolute inset-y-0 right-0 flex duration-300">
        <Button
          type="button"
          size="icon"
          onClick={handleSave}
          disabled={createTask.isPending || !title.trim()}
          className={cn(
            "h-full w-16 rounded-none bg-green-500 text-white hover:bg-green-600 hover:text-white",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          aria-label="Save new task"
        >
          {createTask.isPending ? (
            "..."
          ) : (
            <>
              <Check className="h-5 w-5" />
              <span className="sr-only">Save</span>
            </>
          )}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setIsCreating(false)}
          disabled={createTask.isPending}
          className="h-full w-16 rounded-none bg-gray-500 text-white hover:bg-gray-600 hover:text-white"
          aria-label="Cancel creating task"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Cancel</span>
        </Button>
      </div>
    </div>
  );
}

// --- Task list ---

export function TaskList() {
  const trpc = useTRPC();
  const { data: tasks } = useSuspenseQuery(trpc.task.all.queryOptions());
  const { isCreating } = useCreateTask();

  // Get selected category IDs from filter context
  const { effectiveCategoryIds } = useCategoryFilter();
  const { selectedPriorities } = usePriorityFilter();

  // Filter tasks based on selected categories and priorities
  const filteredTasks = tasks.filter((task) => {
    if (
      effectiveCategoryIds.length > 0 &&
      (!task.categoryId || !effectiveCategoryIds.includes(task.categoryId))
    ) {
      return false;
    }
    if (
      selectedPriorities.length > 0 &&
      (!task.priority ||
        !selectedPriorities.includes(task.priority as TaskPriority))
    ) {
      return false;
    }
    return true;
  });

  if (tasks.length === 0 && !isCreating) {
    return (
      <div className="relative flex w-full flex-col gap-4">
        <TaskCardSkeleton pulse={false} />
        <TaskCardSkeleton pulse={false} />
        <TaskCardSkeleton pulse={false} />

        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10">
          <p className="text-2xl font-bold text-white">No tasks yet</p>
        </div>
      </div>
    );
  }

  if (filteredTasks.length === 0 && !isCreating) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-xl font-semibold text-white">
          No tasks match the selected categories
        </p>
        <p className="text-muted-foreground mt-2">
          Try selecting different categories or clear the filter
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {isCreating && <InlineCreateTask />}
      {filteredTasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

// --- Task card ---

export function TaskCard(props: {
  task: RouterOutputs["task"]["all"][number];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(props.task.title);
  const [editedDescription, setEditedDescription] = useState(
    props.task.description ?? "",
  );
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(
    props.task.dueDate ?? undefined,
  );
  const [editedCategoryId, setEditedCategoryId] = useState<string | undefined>(
    props.task.categoryId ?? undefined,
  );
  const [editedPriority, setEditedPriority] = useState<TaskPriority>(
    (props.task.priority ?? "medium") as TaskPriority,
  );
  const [editedReminderAt, setEditedReminderAt] = useState<Date | undefined>(
    props.task.reminderAt ?? undefined,
  );
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories for the select dropdown (only when user is logged in)
  const { data: categories } = useQuery({
    ...trpc.category.all.queryOptions(),
    enabled: !!session?.user,
  });

  const updateTask = useMutation(
    trpc.task.update.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries(trpc.task.all.queryFilter());
        const previousTasks = queryClient.getQueryData(
          trpc.task.all.queryKey(),
        );
        queryClient.setQueryData(trpc.task.all.queryKey(), (old) => {
          if (!old) return old;
          return old.map((task) =>
            task.id === variables.id ? { ...task, ...variables } : task,
          );
        });
        return { previousTasks };
      },
      onError: (err, variables, context) => {
        if (context?.previousTasks) {
          queryClient.setQueryData(
            trpc.task.all.queryKey(),
            context.previousTasks,
          );
        }
        toast.error("Failed to update task");
      },
      onSettled: async () => {
        await queryClient.invalidateQueries(trpc.task.pathFilter());
      },
    }),
  );

  const deleteTask = useMutation(
    trpc.task.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.task.pathFilter());
        toast.success("Task deleted");
      },
    }),
  );

  const handleToggleComplete = () => {
    updateTask.mutate({
      id: props.task.id,
      completed: !props.task.completed,
    });
  };

  const handleEditClick = () => {
    setEditedTitle(props.task.title);
    setEditedDescription(props.task.description ?? "");
    setEditedDueDate(props.task.dueDate ?? undefined);
    setEditedCategoryId(props.task.categoryId ?? undefined);
    setEditedPriority((props.task.priority ?? "medium") as TaskPriority);
    setEditedReminderAt(props.task.reminderAt ?? undefined);
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
        id: props.task.id,
        title: editedTitle,
        description: editedDescription || undefined,
        dueDate: editedDueDate ?? null,
        categoryId: editedCategoryId ?? null,
        priority: editedPriority,
        reminderAt: editedReminderAt ?? null,
      });
      setIsEditing(false);
      toast.success("Task updated!");
    } catch {
      // Error is already handled in mutation onError
    }
  };

  const handleCancel = () => {
    setEditedTitle(props.task.title);
    setEditedDescription(props.task.description ?? "");
    setEditedDueDate(props.task.dueDate ?? undefined);
    setEditedCategoryId(props.task.categoryId ?? undefined);
    setEditedPriority((props.task.priority ?? "medium") as TaskPriority);
    setEditedReminderAt(props.task.reminderAt ?? undefined);
    setIsEditing(false);
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

  const editedCategory = categories?.find((c) => c.id === editedCategoryId);
  const hasChanges =
    editedTitle !== props.task.title ||
    editedDescription !== (props.task.description ?? "") ||
    editedDueDate?.getTime() !== props.task.dueDate?.getTime() ||
    editedCategoryId !== props.task.categoryId ||
    editedPriority !== (props.task.priority ?? "medium") ||
    editedReminderAt?.getTime() !== props.task.reminderAt?.getTime();

  return (
    <div
      className={cn(
        "group relative flex flex-row items-center gap-4 overflow-hidden rounded-2xl p-6 transition-all duration-300",
        props.task.completed
          ? "glass-card border-primary/50 shadow-glow bg-primary/5"
          : "glass-card hover:border-primary/30 hover:shadow-glowHover hover:bg-white/5",
      )}
    >
      <Checkbox
        checked={props.task.completed}
        onCheckedChange={handleToggleComplete}
        disabled={updateTask.isPending || isEditing}
        className={cn(
          "size-6 rounded-full border-2 transition-all",
          props.task.completed
            ? "bg-primary border-primary text-black"
            : "data-[state=checked]:bg-primary data-[state=checked]:border-primary border-white/30",
        )}
      />

      <div className="grow space-y-2">
        {/* Title and Description fields */}
        {isEditing ? (
          <div className="flex max-w-2xl gap-3">
            {/* Title field */}
            <div className="w-64">
              <Input
                ref={titleInputRef}
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Task title"
                className={cn(
                  "border-[#164B49] bg-[#102A2A] text-white placeholder:text-[#8FA8A8]",
                  "focus:border-[#21716C] focus:ring-2 focus:ring-[#21716C]/20",
                  "rounded-md px-3 py-1.5 text-lg font-medium",
                )}
                aria-label="Edit task title"
                disabled={updateTask.isPending}
              />
            </div>
            {/* Description field */}
            <div className="w-80">
              <Input
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Description (optional)"
                className={cn(
                  "border-[#164B49] bg-[#102A2A] text-[#DCE4E4] placeholder:text-[#8FA8A8]",
                  "focus:border-[#21716C] focus:ring-2 focus:ring-[#21716C]/20",
                  "rounded-md px-3 py-1.5 text-sm",
                )}
                aria-label="Edit task description"
                disabled={updateTask.isPending}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Title field - view mode */}
            <button
              onClick={handleEditClick}
              disabled={updateTask.isPending}
              className={cn(
                "group/title -m-1 rounded-md p-1 text-left transition-all duration-200",
                "hover:bg-white/5 focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "max-w-fit",
              )}
              aria-label={`Edit task title. Current value: ${props.task.title}`}
            >
              <div className="flex items-center gap-2">
                <h2
                  className={cn(
                    "text-lg font-medium transition-colors",
                    props.task.completed ? "text-white/70" : "text-white",
                  )}
                >
                  {props.task.title}
                </h2>
                <Pencil className="h-4 w-4 text-[#50C878]/60 opacity-0 transition-opacity group-hover/title:opacity-100" />
              </div>
            </button>
            {/* Description field - view mode */}
            {props.task.description ? (
              <button
                onClick={handleEditClick}
                disabled={updateTask.isPending}
                className={cn(
                  "group/desc -m-1 rounded-md p-1 text-left transition-all duration-200",
                  "hover:bg-white/5 focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "max-w-fit",
                )}
                aria-label={`Edit task description. Current value: ${props.task.description}`}
              >
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground text-sm">
                    {props.task.description}
                  </p>
                  <Pencil className="h-3 w-3 text-[#50C878]/60 opacity-0 transition-opacity group-hover/desc:opacity-100" />
                </div>
              </button>
            ) : null}
          </>
        )}
      </div>

      {/* Priority */}
      <div
        className={cn(
          "z-10 transition-transform duration-300 ease-in-out",
          isEditing ? "-translate-x-32" : "group-hover:-translate-x-32",
        )}
      >
        {isEditing ? (
          <PrioritySelectorPill
            value={editedPriority}
            onChange={setEditedPriority}
            disabled={updateTask.isPending}
          />
        ) : (
          <PriorityBadge priority={props.task.priority} variant="compact" />
        )}
      </div>

      {/* Due Date */}
      {isEditing || editedDueDate ? (
        <div
          className={cn(
            "z-10 transition-transform duration-300 ease-in-out",
            isEditing ? "-translate-x-32" : "group-hover:-translate-x-32",
          )}
        >
          {isEditing ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-2 rounded-full border border-[#164B49] bg-[#102A2A]/80 px-4 py-1.5 text-xs font-medium text-[#DCE4E4] backdrop-blur-md",
                    "transition-all hover:border-[#21716C] hover:bg-[#102A2A]",
                    "focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
                  )}
                  disabled={updateTask.isPending}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {editedDueDate
                    ? new Date(editedDueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Set due date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="flex flex-col">
                  <DatePicker
                    date={editedDueDate}
                    onDateChange={setEditedDueDate}
                  />
                  {editedDueDate && (
                    <div className="border-t border-[#164B49] p-2">
                      <button
                        onClick={() => setEditedDueDate(undefined)}
                        className={cn(
                          "flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium",
                          "bg-[#102A2A] text-[#8FA8A8] hover:bg-[#183F3F] hover:text-[#DCE4E4]",
                          "transition-all",
                        )}
                      >
                        <X className="h-3 w-3" />
                        Clear date
                      </button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ) : editedDueDate ? (
            <div className="flex items-center gap-2 rounded-full border border-[#164B49] bg-[#102A2A]/80 px-4 py-1.5 text-xs font-medium text-[#DCE4E4] backdrop-blur-md">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(editedDueDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Category */}
      {isEditing || editedCategory ? (
        <div
          className={cn(
            "z-10 transition-transform duration-300 ease-in-out",
            isEditing ? "-translate-x-32" : "group-hover:-translate-x-32",
          )}
        >
          {isEditing ? (
            <CategoryTreePicker
              categories={categories ?? []}
              value={editedCategoryId}
              onChange={setEditedCategoryId}
              disabled={updateTask.isPending}
            />
          ) : editedCategory ? (
            <div
              className="rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md"
              style={{
                backgroundColor: `${editedCategory.color}60`,
                borderColor: `${editedCategory.color}80`,
                color: editedCategory.color,
              }}
            >
              {editedCategory.name}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Reminder */}
      {isEditing || props.task.reminderAt ? (
        <div
          className={cn(
            "z-10 transition-transform duration-300 ease-in-out",
            isEditing ? "-translate-x-32" : "group-hover:-translate-x-32",
          )}
        >
          {isEditing ? (
            <ReminderPill
              value={editedReminderAt}
              onChange={setEditedReminderAt}
              disabled={updateTask.isPending}
            />
          ) : props.task.reminderAt ? (
            <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-400 backdrop-blur-md">
              <Bell className="h-3.5 w-3.5" />
              {formatReminder(props.task.reminderAt)}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Save/Cancel buttons - only show when editing */}
      {isEditing && (
        <div className="animate-in slide-in-from-right-5 absolute inset-y-0 right-0 flex duration-300">
          <Button
            type="button"
            size="icon"
            onClick={handleSave}
            disabled={
              updateTask.isPending || !hasChanges || !editedTitle.trim()
            }
            className={cn(
              "h-full w-16 rounded-none bg-green-500 text-white hover:bg-green-600 hover:text-white",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
            aria-label="Save changes"
          >
            {updateTask.isPending ? (
              "..."
            ) : (
              <>
                <Check className="h-5 w-5" />
                <span className="sr-only">Save</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleCancel}
            disabled={updateTask.isPending}
            className="h-full w-16 rounded-none bg-gray-500 text-white hover:bg-gray-600 hover:text-white"
            aria-label="Cancel editing"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Cancel</span>
          </Button>
        </div>
      )}

      {/* Hover Actions - hide in edit mode */}
      {!isEditing && (
        <div className="absolute inset-y-0 right-0 flex translate-x-full transition-transform duration-300 ease-in-out group-hover:translate-x-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-full w-16 rounded-none bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
            onClick={handleEditClick}
            aria-label="Edit task"
          >
            <Pencil className="h-5 w-5" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-full w-16 rounded-none bg-red-500 text-white hover:bg-red-600 hover:text-white"
            onClick={() => deleteTask.mutate(props.task.id)}
            disabled={deleteTask.isPending}
            aria-label="Delete task"
          >
            <Trash2 className="h-5 w-5" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      )}
    </div>
  );
}

export function TaskCardSkeleton(props: { pulse?: boolean }) {
  const { pulse = true } = props;
  return (
    <div className="bg-muted flex flex-row items-center gap-4 rounded-lg p-4">
      <div
        className={cn("h-5 w-5 rounded bg-current", pulse && "animate-pulse")}
      />
      <div className="grow">
        <h2
          className={cn(
            "bg-primary w-1/4 rounded text-2xl font-bold",
            pulse && "animate-pulse",
          )}
        >
          &nbsp;
        </h2>
      </div>
    </div>
  );
}
