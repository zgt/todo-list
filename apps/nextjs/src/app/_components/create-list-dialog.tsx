"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@acme/ui/dialog";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";
import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";

// Swatch data, not theme tokens: these hex values are persisted on the list
// row and rendered as inline styles. The first entry is the default, aligned
// with the theme's primary green.
const DEFAULT_LIST_COLOR = "#4ADE80"; // primary green
const PRESET_COLORS = [
  DEFAULT_LIST_COLOR,
  "#4A90D9", // blue
  "#E57373", // red
  "#FFB74D", // orange
  "#BA68C8", // purple
  "#4DB6AC", // teal
  "#F06292", // pink
  "#FFD54F", // yellow
];

export function CreateListDialog() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_LIST_COLOR);

  const createList = useMutation(
    trpc.taskList.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.taskList.pathFilter());
        setOpen(false);
        resetForm();
        toast.success("List created!");
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in"
            : "Failed to create list",
        );
      },
    }),
  );

  const resetForm = () => {
    setName("");
    setDescription("");
    setColor(DEFAULT_LIST_COLOR);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    createList.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors hover:bg-white/10"
          aria-label="Create new list"
        >
          <Plus className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create List</DialogTitle>
            <DialogDescription>
              Create a new task list to organize and share tasks.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="list-name" className="text-foreground">
                Name
              </Label>
              <Input
                id="list-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Groceries, Work, Shared Project"
                className="border-border-strong bg-surface-2 placeholder:text-muted-foreground focus:border-border-focus text-white"
                disabled={createList.isPending}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="list-description" className="text-foreground">
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <textarea
                id="list-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this list for?"
                rows={2}
                className={cn(
                  "border-border-strong bg-surface-2 text-foreground placeholder:text-muted-foreground w-full resize-y rounded-md border px-3 py-2 text-sm",
                  "focus:border-border-focus focus:ring-border-focus/20 focus:ring-2 focus:outline-none",
                )}
                disabled={createList.isPending}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-foreground">Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-all",
                      color === c
                        ? "scale-110 border-white"
                        : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={createList.isPending}
              className="text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createList.isPending || !name.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {createList.isPending ? "Creating..." : "Create List"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
