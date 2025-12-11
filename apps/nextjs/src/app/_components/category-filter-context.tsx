"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";

interface CategoryFilterContextType {
  selectedCategoryIds: string[];
  setSelectedCategoryIds: (ids: string[]) => void;
}

const CategoryFilterContext = createContext<
  CategoryFilterContextType | undefined
>(undefined);

export function CategoryFilterProvider({ children }: { children: ReactNode }) {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  return (
    <CategoryFilterContext.Provider
      value={{ selectedCategoryIds, setSelectedCategoryIds }}
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
