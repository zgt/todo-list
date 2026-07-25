"use client";

import { useCallback, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import type { RouterOutputs } from "@acme/api";
import { cn } from "@acme/ui";
import { Checkbox } from "@acme/ui/checkbox";

import { useSubtaskMutations } from "./hooks/useSubtaskMutations";

// --- Subtask section inside expanded task card ---

export function SubtaskSection({
  task,
}: {
  task: RouterOutputs["task"]["all"][number];
}) {
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const newInputRef = useRef<HTMLInputElement>(null);

  // The inline editor is only mounted after the user clicks a subtask, so
  // moving focus into it is correct — but as a mount-time ref callback rather
  // than `autoFocus`, which is about page-load focus stealing.
  const focusOnMount = useCallback((el: HTMLInputElement | null) => {
    el?.focus();
  }, []);

  const subtasks = [...task.subtasks].sort((a, b) => a.sortOrder - b.sortOrder);

  const { createSubtask, updateSubtask, deleteSubtask } = useSubtaskMutations(
    task.id,
  );

  const handleCreate = () => {
    const title = newTitle.trim();
    if (!title) return;
    createSubtask.mutate({ taskId: task.id, title });
    setNewTitle("");
    setTimeout(() => newInputRef.current?.focus(), 0);
  };

  const handleSaveEdit = (id: string) => {
    const title = editingTitle.trim();
    if (!title) {
      setEditingId(null);
      return;
    }
    updateSubtask.mutate({ id, title });
    setEditingId(null);
  };

  const hasDescription = !!task.description;

  return (
    <div
      className={cn(
        hasDescription ? "border-border-strong/40 mt-4 border-t pt-3" : "mt-1",
      )}
    >
      <p className="text-muted-foreground/70 mb-2 text-[10px] font-semibold tracking-wider uppercase">
        Subtasks
        {subtasks.length > 0 && (
          <span className="text-primary/70 ml-1.5">
            {subtasks.filter((s) => s.completed).length}/{subtasks.length}
          </span>
        )}
      </p>
      <div className="flex flex-col gap-0.5 rounded-lg bg-white/[0.02] p-1">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="group/subtask flex items-center gap-2.5 rounded-md px-2 py-1 transition-colors hover:bg-white/5"
          >
            <Checkbox
              checked={subtask.completed}
              onCheckedChange={(checked) => {
                updateSubtask.mutate({
                  id: subtask.id,
                  completed: !!checked,
                });
              }}
              className={cn(
                "size-3.5 shrink-0 rounded border-2 transition-all",
                // Invisible pseudo-element grows the pointer target to 30px
                // (past the WCAG 24px minimum) without changing layout; kept
                // just under the 30px row pitch so neighbouring rows' targets
                // don't overlap.
                "relative before:absolute before:-inset-2 before:content-['']",
                subtask.completed
                  ? "bg-primary border-primary text-black"
                  : "data-[state=checked]:bg-primary data-[state=checked]:border-primary border-white/30",
              )}
            />
            {editingId === subtask.id ? (
              <input
                ref={focusOnMount}
                value={editingTitle}
                aria-label={`Edit subtask: ${subtask.title}`}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveEdit(subtask.id);
                  } else if (e.key === "Escape") {
                    setEditingId(null);
                  }
                }}
                onBlur={() => handleSaveEdit(subtask.id)}
                className="text-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            ) : (
              <button
                onClick={() => {
                  setEditingId(subtask.id);
                  setEditingTitle(subtask.title);
                }}
                className={cn(
                  "min-w-0 flex-1 truncate text-left text-[13px] transition-colors",
                  subtask.completed
                    ? "text-muted-foreground/60 line-through"
                    : "text-foreground",
                )}
              >
                {subtask.title}
              </button>
            )}
            <button
              onClick={() => deleteSubtask.mutate({ id: subtask.id })}
              className="text-muted-foreground shrink-0 opacity-0 transition-opacity group-hover/subtask:opacity-100 hover:text-red-400"
              aria-label={`Delete subtask: ${subtask.title}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {/* Add subtask input */}
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1">
          <Plus className="text-muted-foreground/50 h-3.5 w-3.5 shrink-0" />
          <input
            ref={newInputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              } else if (e.key === "Escape") {
                setNewTitle("");
                newInputRef.current?.blur();
              }
            }}
            placeholder="Add a subtask..."
            className="text-foreground placeholder:text-muted-foreground/50 min-w-0 flex-1 bg-transparent text-[13px] outline-none"
          />
        </div>
      </div>
    </div>
  );
}
