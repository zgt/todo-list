"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";

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
  const filteredTasks = selectedCategoryIds.length > 0
    ? tasks.filter((task) =>
        task.categoryId && selectedCategoryIds.includes(task.categoryId)
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

  const updateTask = useMutation(
    trpc.task.update.mutationOptions({
      onMutate: async (variables) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries(trpc.task.all.queryFilter());

        // Snapshot previous value
        const previousTasks = queryClient.getQueryData(
          trpc.task.all.queryKey(),
        );

        // Optimistically update
        queryClient.setQueryData(trpc.task.all.queryKey(), (old) => {
          if (!old) return old;
          return old.map((task) =>
            task.id === variables.id ? { ...task, ...variables } : task,
          );
        });

        return { previousTasks };
      },
      onError: (err, variables, context) => {
        // Rollback on error
        if (context?.previousTasks) {
          queryClient.setQueryData(
            trpc.task.all.queryKey(),
            context.previousTasks,
          );
        }
        toast.error("Failed to update task");
      },
      onSettled: async () => {
        // Refetch to ensure consistency
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

  // Category color mapping
  // const categoryColors: Record<string, string> = {
  //   Work: "border-primary text-primary",
  //   Chores: "border-[#BA68C8] text-[#BA68C8]",
  //   Groceries: "border-[#FFD700] text-[#FFD700]",
  //   Personal: "border-[#4DD0E1] text-[#4DD0E1]",
  // };

  // Default category if none exists
  const category = props.task.category;

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
        disabled={updateTask.isPending}
        className={cn(
          "size-6 rounded-full border-2 transition-all",
          props.task.completed
            ? "bg-primary border-primary text-black"
            : "data-[state=checked]:bg-primary data-[state=checked]:border-primary border-white/30",
        )}
      />
      <div className="grow">
        <h2
          className={cn(
            "text-lg font-medium transition-colors",
            props.task.completed ? "text-white/70" : "text-white",
          )}
        >
          {props.task.title}
        </h2>
        {props.task.description && (
          <p className="text-muted-fobreground mt-1 text-sm">
            {props.task.description}
          </p>
        )}
      </div>

      {/* Category pill */}
      {category && (
        <div
          className={cn(
            "z-10 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md",
            "transition-transform duration-300 ease-in-out group-hover:-translate-x-32",
          )}
          style={{
            backgroundColor: `${category.color}60`, // Increased opacity
            borderColor: `${category.color}80`, // Increased opacity
            color: category.color,
          }}
        >
          {category.name}
        </div>
      )}

      {/* Hover Actions */}
      <div className="absolute inset-y-0 right-0 flex translate-x-full transition-transform duration-300 ease-in-out group-hover:translate-x-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-full w-16 rounded-none bg-blue-500 text-white hover:text-white"
          onClick={() => toast.info("Edit feature coming soon")}
        >
          <Pencil className="h-5 w-5" />
          <span className="sr-only">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-red h-full w-16 rounded-none bg-red-500 text-white hover:text-white"
          onClick={() => deleteTask.mutate(props.task.id)}
          disabled={deleteTask.isPending}
        >
          <Trash2 className="h-5 w-5" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
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
