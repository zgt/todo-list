"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

import type { TCategory } from "@acme/ui/multiple-select";
import { MultipleSelect } from "@acme/ui/multiple-select";

import { useTRPC } from "~/trpc/react";
import { useCategoryFilter } from "./category-filter-context";

export function CategoryFilter() {
  const trpc = useTRPC();
  const { data: categories } = useQuery(trpc.category.all.queryOptions());
  const { selectedCategoryIds, setSelectedCategoryIds } = useCategoryFilter();

  const handleChange = useCallback(
    (selected: TCategory[]) => {
      console.log(selected);
      setSelectedCategoryIds(selected.map((category) => category.key));
    },
    [setSelectedCategoryIds],
  );

  if (!categories || categories.length === 0) {
    console.log(categories);
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
