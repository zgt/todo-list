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

const PRESET_COLORS = [
  "#50C878", // emerald
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
  const [color, setColor] = useState(PRESET_COLORS[0] ?? "#50C878");

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
    setColor(PRESET_COLORS[0] ?? "#50C878");
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
          className="rounded-md p-1 text-[#8FA8A8] transition-colors hover:bg-white/10 hover:text-[#DCE4E4]"
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
              <Label htmlFor="list-name" className="text-[#DCE4E4]">
                Name
              </Label>
              <Input
                id="list-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Groceries, Work, Shared Project"
                className="border-[#164B49] bg-[#102A2A] text-white placeholder:text-[#8FA8A8] focus:border-[#21716C]"
                disabled={createList.isPending}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="list-description" className="text-[#DCE4E4]">
                Description <span className="text-[#8FA8A8]">(optional)</span>
              </Label>
              <textarea
                id="list-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this list for?"
                rows={2}
                className={cn(
                  "w-full resize-y rounded-md border border-[#164B49] bg-[#102A2A] px-3 py-2 text-sm text-[#DCE4E4] placeholder:text-[#8FA8A8]",
                  "focus:border-[#21716C] focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
                )}
                disabled={createList.isPending}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-[#DCE4E4]">Color</Label>
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
              className="text-[#8FA8A8] hover:bg-[#183F3F] hover:text-[#DCE4E4]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createList.isPending || !name.trim()}
              className="bg-[#50C878] text-[#0A1A1A] hover:bg-[#66D99A] disabled:opacity-50"
            >
              {createList.isPending ? "Creating..." : "Create List"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
