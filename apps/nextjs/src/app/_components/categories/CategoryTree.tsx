"use client";

import { useMemo, useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Check, ChevronDown, X } from "lucide-react";

import type { RouterOutputs } from "@acme/api";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@acme/ui/dialog";
import { Field, FieldContent, FieldLabel } from "@acme/ui/field";
import { Input } from "@acme/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";
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
  const [selectedNode, setSelectedNode] = useState<CategoryTreeNode | null>(
    null,
  );
  const [parentNode, setParentNode] = useState<CategoryTreeNode | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [color, setColor] = useState("#50C878");
  const [newParentId, setNewParentId] = useState<string | null | undefined>(
    undefined,
  );

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<CategoryTreeNode | null>(
    null,
  );

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

  const deleteCategory = useMutation(
    trpc.category.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.category.pathFilter());
        toast.success("Category deleted!");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete category"),
    }),
  );

  function openEdit(node: CategoryTreeNode) {
    setSelectedNode(node);
    setName(node.name);
    setColor(node.color);
    setNewParentId(undefined);
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
      const payload: {
        id: string;
        name: string;
        color: string;
        parentId?: string | null;
      } = {
        id: selectedNode.id,
        name,
        color,
      };
      if (newParentId !== undefined) {
        payload.parentId = newParentId;
      }
      updateCategory.mutate(payload);
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

        <Dialog
          open={dialogMode !== null}
          onOpenChange={(open) => !open && closeDialog()}
        >
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
        onDelete={setDeleteTarget}
      />

      {/* Edit / Add dialog */}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => !open && closeDialog()}
      >
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
            mode={dialogMode}
            tree={tree}
            selectedNode={selectedNode}
            newParentId={newParentId}
            onParentChange={setNewParentId}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
              {deleteTarget?.children && deleteTarget.children.length > 0 && (
                <> This will also delete all its children.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleteCategory.isPending}
              onClick={() =>
                deleteTarget && deleteCategory.mutate(deleteTarget.id)
              }
            >
              {deleteCategory.isPending ? "Deleting..." : "Delete"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Inline parent tree picker ───────────────────────────────────────────────

interface ParentPickerNode {
  id: string;
  name: string;
  color: string;
  children: ParentPickerNode[];
}

/** Build a tree excluding a node and all its descendants */
function buildTreeExcluding(
  nodes: CategoryTreeNode[],
  excludeId: string,
): ParentPickerNode[] {
  const result: ParentPickerNode[] = [];
  for (const node of nodes) {
    if (node.id === excludeId) continue;
    result.push({
      id: node.id,
      name: node.name,
      color: node.color,
      children: buildTreeExcluding(
        node.children as CategoryTreeNode[],
        excludeId,
      ),
    });
  }
  return result;
}

function ParentTreeItem({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: ParentPickerNode;
  depth: number;
  selectedId: string | undefined;
  onSelect: (id: string | undefined) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <>
      <div
        className="flex cursor-pointer items-center rounded-md border border-transparent px-2 py-1 text-sm hover:border-emerald-400 hover:bg-[#102A2A] hover:text-white"
        style={{ paddingLeft: `${8 + depth * 20}px` }}
        onClick={() => onSelect(isSelected ? undefined : node.id)}
      >
        {hasChildren ? (
          <div
            className="hover:bg-muted/50 mr-1 flex size-4 items-center justify-center rounded-sm transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            <ChevronDown
              className={cn(
                "size-3 transition-transform",
                !expanded && "-rotate-90",
              )}
            />
          </div>
        ) : (
          <div className="mr-1 size-4" />
        )}

        <div
          className="mr-2 size-2.5 rounded-full ring-1 ring-black/10 ring-inset dark:ring-white/20"
          style={{ backgroundColor: node.color }}
        />

        <span className="flex-1 truncate">{node.name}</span>

        {isSelected && <Check className="text-primary ml-2 size-4" />}
      </div>

      {hasChildren &&
        expanded &&
        node.children.map((child) => (
          <ParentTreeItem
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </>
  );
}

function ParentPicker({
  tree,
  excludeId,
  value,
  onChange,
}: {
  tree: CategoryTreeNode[];
  excludeId: string;
  value: string | null | undefined;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const filteredTree = useMemo(
    () => buildTreeExcluding(tree, excludeId),
    [tree, excludeId],
  );

  // Find the selected category name by searching the filtered tree
  const selectedName = useMemo(() => {
    if (!value) return null;
    function find(nodes: ParentPickerNode[]): string | null {
      for (const n of nodes) {
        if (n.id === value) return n.name;
        const found = find(n.children);
        if (found) return found;
      }
      return null;
    }
    return find(filteredTree);
  }, [value, filteredTree]);

  // Resolve displayed value: if user hasn't changed, show current parent
  const displayValue = value === undefined ? undefined : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm",
            "border-[#164B49] bg-[#102A2A]/80 text-[#DCE4E4]",
            "transition-all hover:border-[#21716C]",
            "focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
          )}
        >
          <span className={cn(!selectedName && "text-[#8FA8A8]")}>
            {selectedName ?? "None (root)"}
          </span>
          <ChevronDown className="size-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2" align="start">
        <div className="flex flex-col gap-0.5">
          {/* Root option */}
          <div
            className="flex cursor-pointer items-center rounded-md border border-transparent px-2 py-1 text-sm hover:border-emerald-400 hover:bg-[#102A2A] hover:text-white"
            style={{ paddingLeft: "8px" }}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            <div className="mr-1 size-4" />
            <X className="mr-2 size-2.5 text-[#8FA8A8]" />
            <span className="flex-1 truncate text-[#8FA8A8]">None (root)</span>
            {displayValue === null && (
              <Check className="text-primary ml-2 size-4" />
            )}
          </div>

          {filteredTree.map((node) => (
            <ParentTreeItem
              key={node.id}
              node={node}
              depth={0}
              selectedId={displayValue ?? undefined}
              onSelect={(id) => {
                onChange(id ?? null);
                setOpen(false);
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Dialog form ─────────────────────────────────────────────────────────────

function CategoryDialogForm({
  name,
  color,
  onNameChange,
  onColorChange,
  onSubmit,
  isPending,
  submitLabel,
  mode,
  tree,
  selectedNode,
  newParentId,
  onParentChange,
}: {
  name: string;
  color: string;
  onNameChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  submitLabel: string;
  mode?: "edit" | "add" | null;
  tree?: CategoryTreeNode[];
  selectedNode?: CategoryTreeNode | null;
  newParentId?: string | null | undefined;
  onParentChange?: (v: string | null | undefined) => void;
}) {
  const isEdit = mode === "edit" && selectedNode;

  // Resolve the displayed parent value
  const parentValue =
    newParentId === undefined ? (selectedNode?.parentId ?? null) : newParentId;

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

      {isEdit && tree && (
        <Field>
          <FieldContent>
            <FieldLabel>Parent</FieldLabel>
          </FieldContent>
          <ParentPicker
            tree={tree}
            excludeId={selectedNode.id}
            value={parentValue}
            onChange={(id) => onParentChange?.(id)}
          />
        </Field>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isPending || !name.trim()}
      >
        {isPending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
