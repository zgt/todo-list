"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

import type { RouterOutputs } from "@acme/api";
import { CreateCategorySchema } from "@acme/db/schema";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@acme/ui/field";
import { Input } from "@acme/ui/input";
import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";

export function CategoryForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

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
      color: "#50C878", // Default emerald green from design system
    },
    validators: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      onSubmit: CreateCategorySchema as any,
    },
    onSubmit: (data) => createCategory.mutate(data.value),
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
  const categoriesQuery = useSuspenseQuery(trpc.category.all.queryOptions());
  const categories = categoriesQuery.data;

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-6xl mb-4">🏷️</div>
        <h3 className="text-xl font-semibold text-white mb-2">No categories yet</h3>
        <p className="text-muted-foreground">Create your first category to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
}

type Category = RouterOutputs["category"]["all"][number];

function CategoryCard({ category }: { category: Category }) {
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
      className="glass-card border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300 group"
      style={{
        borderColor: `${category.color}20`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: category.color }}
            />
            <h3 className="text-lg font-semibold text-white truncate">
              {category.name}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className="font-mono text-xs px-2 py-1 rounded border"
              style={{
                borderColor: `${category.color}40`,
                color: category.color,
              }}
            >
              {category.color}
            </span>
          </div>
        </div>

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={cn(
            "p-2 rounded-lg transition-all duration-200",
            "text-muted-foreground hover:text-red-400 hover:bg-red-500/10",
            "opacity-0 group-hover:opacity-100",
            isDeleting && "opacity-50 cursor-not-allowed",
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="glass-card border border-white/10 rounded-2xl p-6 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="w-4 h-4 rounded-full bg-white/10" />
            <div className="flex-1">
              <div className="h-6 bg-white/10 rounded w-3/4 mb-2" />
              <div className="h-4 bg-white/10 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
