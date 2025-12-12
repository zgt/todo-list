"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { z } from "zod";

import type { RouterOutputs } from "@acme/api";
import { CreateTaskSchema } from "@acme/db/schema";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Checkbox } from "@acme/ui/checkbox";
import { DatePicker } from "@acme/ui/date-picker";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@acme/ui/field";
import { Input } from "@acme/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";
import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";
import { useCategoryFilter } from "./category-filter-context";

// Validation schema for inline task editing
const EditTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
});

export function CreateTaskForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createTask = useMutation(
    trpc.task.create.mutationOptions({
      onSuccess: async () => {
        form.reset();
        await queryClient.invalidateQueries(trpc.task.pathFilter());
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

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
    },
    validators: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      onSubmit: CreateTaskSchema as any,
    },
    onSubmit: (data) => createTask.mutate(data.value),
  });

  return (
    <form
      className="w-full max-w-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field
          name="title"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldContent>
                  <FieldLabel htmlFor={field.name}>Task</FieldLabel>
                </FieldContent>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="What needs to be done?"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
        <form.Field
          name="description"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldContent>
                  <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                </FieldContent>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Additional details (optional)"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
      </FieldGroup>
      <Button type="submit" disabled={createTask.isPending}>
        {createTask.isPending ? "Creating..." : "Add Task"}
      </Button>
    </form>
  );
}

export function TaskList() {
  const trpc = useTRPC();
  const { data: tasks } = useSuspenseQuery(trpc.task.all.queryOptions());

  // Get selected category IDs from filter context
  const { selectedCategoryIds } = useCategoryFilter();

  // Filter tasks based on selected categories
  const filteredTasks =
    selectedCategoryIds.length > 0
      ? tasks.filter(
          (task) =>
            task.categoryId && selectedCategoryIds.includes(task.categoryId),
        )
      : tasks;

  if (tasks.length === 0) {
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

  if (filteredTasks.length === 0) {
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
      {filteredTasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

export function TaskCard(props: {
  task: RouterOutputs["task"]["all"][number];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
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
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories for the select dropdown
  const { data: categories } = useQuery(trpc.category.all.queryOptions());

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
    editedCategoryId !== props.task.categoryId;

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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
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
            <Select
              value={editedCategoryId ?? "__no_category__"}
              onValueChange={(value) =>
                setEditedCategoryId(
                  value === "__no_category__" ? undefined : value,
                )
              }
            >
              <SelectTrigger
                className={cn(
                  "h-auto rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md",
                  "transition-all hover:border-[#21716C]",
                  "focus:ring-2 focus:ring-[#21716C]/20",
                  editedCategory
                    ? "border-opacity-80"
                    : "border-[#164B49] bg-[#102A2A]/80 text-[#DCE4E4]",
                )}
                style={
                  editedCategory
                    ? {
                        backgroundColor: `${editedCategory.color}60`,
                        borderColor: `${editedCategory.color}80`,
                        color: editedCategory.color,
                      }
                    : undefined
                }
                disabled={updateTask.isPending}
              >
                <SelectValue placeholder="Set category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__no_category__">
                  <div className="flex items-center gap-2 text-[#8FA8A8]">
                    <X className="h-3 w-3" />
                    No category
                  </div>
                </SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
