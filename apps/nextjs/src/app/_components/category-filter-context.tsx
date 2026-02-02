"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

interface CategoryFilterContextType {
  selectedCategoryIds: string[];
  setSelectedCategoryIds: (ids: string[]) => void;
  /** Selected IDs expanded to include all descendant category IDs */
  effectiveCategoryIds: string[];
}

const CategoryFilterContext = createContext<
  CategoryFilterContextType | undefined
>(undefined);

export function CategoryFilterProvider({ children }: { children: ReactNode }) {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const trpc = useTRPC();
  const { data: session } = useSession();
  const { data: categories } = useQuery({
    ...trpc.category.all.queryOptions(),
    enabled: !!session?.user,
  });

  const effectiveCategoryIds = useMemo(() => {
    if (selectedCategoryIds.length === 0 || !categories) return [];

    // Build parent→children map
    const childrenMap = new Map<string, string[]>();
    for (const cat of categories) {
      if (cat.parentId) {
        const siblings = childrenMap.get(cat.parentId) ?? [];
        siblings.push(cat.id);
        childrenMap.set(cat.parentId, siblings);
      }
    }

    // Collect selected + all descendants
    const result = new Set<string>();
    const queue = [...selectedCategoryIds];
    while (queue.length > 0) {
      const id = queue.pop()!;
      if (result.has(id)) continue;
      result.add(id);
      const kids = childrenMap.get(id);
      if (kids) queue.push(...kids);
    }

    return [...result];
  }, [selectedCategoryIds, categories]);

  return (
    <CategoryFilterContext.Provider
      value={{ selectedCategoryIds, setSelectedCategoryIds, effectiveCategoryIds }}
    >
      {children}
    </CategoryFilterContext.Provider>
  );
}

export function useCategoryFilter() {
  const context = useContext(CategoryFilterContext);
  if (!context) {
    throw new Error(
      "useCategoryFilter must be used within CategoryFilterProvider",
    );
  }
  return context;
}
