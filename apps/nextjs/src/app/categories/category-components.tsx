"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";

import type { RouterOutputs } from "@acme/api";
import { CreateCategorySchema } from "@acme/db/schema";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Field, FieldContent, FieldError, FieldLabel } from "@acme/ui/field";
import { Input } from "@acme/ui/input";
import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";

type CategoryTreeNode = RouterOutputs["category"]["tree"][number];

export function CategoryForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const categoriesQuery = useSuspenseQuery(trpc.category.all.queryOptions());
  const categories = categoriesQuery.data;

  const createCategory = useMutation(
    trpc.category.create.mutationOptions({
      onSuccess: async () => {
        form.reset();
        await queryClient.invalidateQueries(trpc.category.pathFilter());
        toast.success("Category created!");
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in"
            : "Failed to create category",
        );
      },
    }),
  );

  const form = useForm({
    defaultValues: {
      name: "",
      color: "#50C878",
      parentId: "",
    },
    validators: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      onSubmit: CreateCategorySchema as any,
    },
    onSubmit: (data) => {
      const { parentId, ...rest } = data.value;
      createCategory.mutate({ ...rest, parentId: parentId || undefined });
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="name"
        children={(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldContent>
                <FieldLabel htmlFor={field.name}>Category Name</FieldLabel>
              </FieldContent>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="e.g., Work, Personal, Urgent"
                maxLength={100}
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      />

      <form.Field
        name="color"
        children={(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldContent>
                <FieldLabel htmlFor={field.name}>Color</FieldLabel>
              </FieldContent>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="h-12 w-20 cursor-pointer rounded-md border border-white/10 bg-transparent"
                />
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="#50C878"
                  maxLength={7}
                  className="flex-1"
                />
              </div>
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      />

      <form.Field
        name="parentId"
        children={(field) => (
          <Field>
            <FieldContent>
              <FieldLabel htmlFor={field.name}>Parent Category</FieldLabel>
            </FieldContent>
            <select
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-white/10 bg-[#102A2A] px-3 py-1 text-sm text-[#DCE4E4] shadow-sm transition-colors focus-visible:border-[#21716C] focus-visible:outline-none"
            >
              <option value="">None (root category)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {"\u00A0".repeat(cat.depth * 4)}
                  {cat.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      />

      <Button
        type="submit"
        className="w-full"
        disabled={form.state.isSubmitting}
      >
        {form.state.isSubmitting ? "Creating..." : "Create Category"}
      </Button>
    </form>
  );
}

export function CategoryList() {
  const trpc = useTRPC();
  const treeQuery = useSuspenseQuery(trpc.category.tree.queryOptions());
  const tree = treeQuery.data;

  if (tree.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <div className="mb-4 text-6xl">🏷️</div>
        <h3 className="mb-2 text-xl font-semibold text-white">
          No categories yet
        </h3>
        <p className="text-muted-foreground">
          Create your first category to get started
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      {tree.map((node) => (
        <TreeNode key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}

function TreeNode({ node, depth }: { node: CategoryTreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div style={{ marginLeft: depth * 24 }}>
        <CategoryCard
          category={node}
          hasChildren={hasChildren}
          expanded={expanded}
          onToggle={() => setExpanded(!expanded)}
        />
      </div>
      {hasChildren && expanded && (
        <div className="flex flex-col gap-2">
          {node.children.map((child: CategoryTreeNode) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryCard({
  category,
  hasChildren,
  expanded,
  onToggle,
}: {
  category: CategoryTreeNode;
  hasChildren: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteCategory = useMutation(
    trpc.category.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.category.pathFilter());
        toast.success("Category deleted");
      },
      onError: () => {
        toast.error("Failed to delete category");
      },
      onSettled: () => {
        setIsDeleting(false);
      },
    }),
  );

  const handleDelete = () => {
    if (confirm(`Delete category "${category.name}"?`)) {
      setIsDeleting(true);
      deleteCategory.mutate(category.id);
    }
  };

  return (
    <div
      className="glass-card group rounded-2xl border border-white/10 p-4 transition-all duration-300 hover:border-white/20"
      style={{
        borderColor: `${category.color}20`,
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {hasChildren ? (
            <button
              onClick={onToggle}
              className="text-muted-foreground flex-shrink-0 transition-colors hover:text-white"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-4 flex-shrink-0" />
          )}
          <div
            className="h-4 w-4 flex-shrink-0 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <h3 className="truncate text-lg font-semibold text-white">
            {category.name}
          </h3>
          <span
            className="rounded border px-2 py-0.5 font-mono text-xs"
            style={{
              borderColor: `${category.color}40`,
              color: category.color,
            }}
          >
            {category.color}
          </span>
        </div>

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={cn(
            "rounded-lg p-2 transition-all duration-200",
            "text-muted-foreground hover:bg-red-500/10 hover:text-red-400",
            "opacity-0 group-hover:opacity-100",
            isDeleting && "cursor-not-allowed opacity-50",
          )}
          title="Delete category"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function CategoryListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="glass-card animate-pulse rounded-2xl border border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full bg-white/10" />
            <div className="h-6 w-3/4 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
