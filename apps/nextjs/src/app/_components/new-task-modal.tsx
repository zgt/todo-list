"use client";

import * as React from "react";
import { PlusIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@acme/ui/button";
import { DatePicker } from "@acme/ui/date-picker";
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

export function NewTaskModal() {
  const [date, setDate] = React.useState<Date>();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string | undefined>();
  const [open, setOpen] = React.useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories } = useQuery(trpc.category.all.queryOptions());

  const createTask = useMutation(
    trpc.task.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.task.pathFilter());
        setOpen(false);
        setTitle("");
        setDescription("");
        setDate(undefined);
        setCategoryId(undefined);
        toast.success("Task created successfully");
      },
      onError: (err: unknown) => {
        const error = err as { data?: { code?: string } };
        toast.error(
          error.data?.code === "UNAUTHORIZED"
            ? "You must be logged in to create a task"
            : "Failed to create task",
        );
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTask.mutate({
      title,
      description,
      categoryId,
      dueDate: date,
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="lg"
          className="bg-primary shadow-glow hover:shadow-glowHover gap-2 rounded-full px-6"
        >
          <span className="font-semibold">New Task</span>
          <PlusIcon className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <form onSubmit={handleSubmit} className="grid gap-4 p-4">
          <div className="space-y-2">
            <h4 className="leading-none font-medium">New Task</h4>
            <p className="text-muted-foreground text-sm">
              Add a new task to your list.
            </p>
          </div>
          <div className="grid gap-2">
            <Input
              id="title"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background/50 border-0 focus-visible:ring-1"
            />
            <textarea
              id="description"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background/50 placeholder:text-muted-foreground flex min-h-[80px] w-full rounded-md border-0 px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-background/50 w-full border-0 focus-visible:ring-1">
                <SelectValue placeholder="Select a category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DatePicker
              date={date}
              onDateChange={setDate}
              placeholder="Pick a date"
              className="w-full"
            />
          </div>
          <Button type="submit" disabled={createTask.isPending}>
            {createTask.isPending ? "Creating..." : "Create Task"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
