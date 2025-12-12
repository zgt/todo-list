"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  useMutation,
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
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@acme/ui/field";
import { Input } from "@acme/ui/input";
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
  const titleInputRef = useRef<HTMLInputElement>(null);

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

  const category = props.task.category;
  const hasChanges =
    editedTitle !== props.task.title ||
    editedDescription !== (props.task.description ?? "");

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
        {/* Title field */}
        {isEditing ? (
          <div className="max-w-md">
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
        ) : (
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
        )}

        {/* Description field */}
        {isEditing ? (
          <div className="max-w-md">
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
        ) : props.task.description ? (
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

        {/* Save/Cancel buttons - only show when editing */}
        {isEditing && (
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={
                updateTask.isPending || !hasChanges || !editedTitle.trim()
              }
              className={cn(
                "bg-[#50C878] text-[#0A1A1A] hover:bg-[#66D99A]",
                "rounded-md px-3 py-1.5 text-xs font-semibold",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
              aria-label="Save changes"
            >
              {updateTask.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Check className="mr-1 h-3 w-3" />
                  Save
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={updateTask.isPending}
              className={cn(
                "border border-[#164B49] text-[#DCE4E4] hover:bg-[#183F3F]",
                "rounded-md px-3 py-1.5 text-xs font-semibold",
              )}
              aria-label="Cancel editing"
            >
              <X className="mr-1 h-3 w-3" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Category pill - hide in edit mode */}
      {!isEditing && category && (
        <div
          className={cn(
            "z-10 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md",
            "transition-transform duration-300 ease-in-out group-hover:-translate-x-32",
          )}
          style={{
            backgroundColor: `${category.color}60`,
            borderColor: `${category.color}80`,
            color: category.color,
          }}
        >
          {category.name}
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
