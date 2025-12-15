"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

import type { TCategory } from "@acme/ui/multiple-select";
import { MultipleSelect } from "@acme/ui/multiple-select";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";
import { useCategoryFilter } from "./category-filter-context";

export function CategoryFilter() {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const { data: categories } = useQuery({
    ...trpc.category.all.queryOptions(),
    enabled: !!session?.user,
  });
  const { selectedCategoryIds, setSelectedCategoryIds } = useCategoryFilter();

  const handleChange = useCallback(
    (selected: TCategory[]) => {
      setSelectedCategoryIds(selected.map((category) => category.key));
    },
    [setSelectedCategoryIds],
  );

  if (!categories || categories.length === 0) {
    return null;
  }

  const categoryOptions: TCategory[] = categories.map((category) => ({
    key: category.id,
    name: category.name,
  }));

  const selectedCategories = categoryOptions.filter((category) =>
    selectedCategoryIds.includes(category.key),
  );

  return (
    <MultipleSelect
      categories={categoryOptions}
      defaultValue={selectedCategories}
      onChange={handleChange}
    />
  );
}
