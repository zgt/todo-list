"use client";

import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@acme/api";
import { Button } from "@acme/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@acme/ui/dialog";
import { Input } from "@acme/ui/input";
import { Field, FieldContent, FieldLabel } from "@acme/ui/field";
import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";
import { CategoryTreeVisualization } from "./CategoryTreeVisualization";

type CategoryTreeNode = RouterOutputs["category"]["tree"][number];

type DialogMode = "edit" | "add" | null;

export function CategoryTree() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const treeQuery = useSuspenseQuery(trpc.category.tree.queryOptions());
  const tree = treeQuery.data;

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedNode, setSelectedNode] = useState<CategoryTreeNode | null>(null);
  const [parentNode, setParentNode] = useState<CategoryTreeNode | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [color, setColor] = useState("#50C878");

  const updateCategory = useMutation(
    trpc.category.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.category.pathFilter());
        toast.success("Category updated!");
        closeDialog();
      },
      onError: () => toast.error("Failed to update category"),
    }),
  );

  const createCategory = useMutation(
    trpc.category.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.category.pathFilter());
        toast.success("Category created!");
        closeDialog();
      },
      onError: () => toast.error("Failed to create category"),
    }),
  );

  function openEdit(node: CategoryTreeNode) {
    setSelectedNode(node);
    setName(node.name);
    setColor(node.color);
    setDialogMode("edit");
  }

  function openAdd(parent: CategoryTreeNode | null) {
    setParentNode(parent);
    setName("");
    setColor("#50C878");
    setDialogMode("add");
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedNode(null);
    setParentNode(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    if (dialogMode === "edit" && selectedNode) {
      updateCategory.mutate({ id: selectedNode.id, name, color });
    } else if (dialogMode === "add") {
      createCategory.mutate({
        name,
        color,
        parentId: parentNode?.id,
      });
    }
  }

  const isPending = updateCategory.isPending || createCategory.isPending;

  if (tree.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-4 text-6xl">🏷️</div>
        <h3 className="mb-2 text-xl font-semibold text-white">
          No categories yet
        </h3>
        <p className="text-muted-foreground mb-4">
          Create your first category to get started
        </p>
        <Button onClick={() => openAdd(null)}>Create Category</Button>

        <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
              <DialogDescription>Add a new root category.</DialogDescription>
            </DialogHeader>
            <CategoryDialogForm
              name={name}
              color={color}
              onNameChange={setName}
              onColorChange={setColor}
              onSubmit={handleSubmit}
              isPending={isPending}
              submitLabel="Create"
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <CategoryTreeVisualization
        tree={tree}
        onEdit={openEdit}
        onAddChild={openAdd}
      />

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit" ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? `Editing "${selectedNode?.name}"`
                : parentNode
                  ? `Adding child under "${parentNode.name}"`
                  : "Adding a root category"}
            </DialogDescription>
          </DialogHeader>
          <CategoryDialogForm
            name={name}
            color={color}
            onNameChange={setName}
            onColorChange={setColor}
            onSubmit={handleSubmit}
            isPending={isPending}
            submitLabel={dialogMode === "edit" ? "Save" : "Create"}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryDialogForm({
  name,
  color,
  onNameChange,
  onColorChange,
  onSubmit,
  isPending,
  submitLabel,
}: {
  name: string;
  color: string;
  onNameChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field>
        <FieldContent>
          <FieldLabel htmlFor="cat-name">Name</FieldLabel>
        </FieldContent>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Category name"
          maxLength={100}
          autoFocus
        />
      </Field>
      <Field>
        <FieldContent>
          <FieldLabel htmlFor="cat-color">Color</FieldLabel>
        </FieldContent>
        <div className="flex items-center gap-3">
          <input
            type="color"
            id="cat-color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="h-10 w-16 cursor-pointer rounded-md border border-white/10 bg-transparent"
          />
          <Input
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            placeholder="#50C878"
            maxLength={7}
            className="flex-1"
          />
        </div>
      </Field>
      <Button type="submit" className="w-full" disabled={isPending || !name.trim()}>
        {isPending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
