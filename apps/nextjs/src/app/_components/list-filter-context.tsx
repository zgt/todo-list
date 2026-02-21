"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";

interface ListFilterContextType {
  /** null = All Tasks, "personal" = tasks without a list, UUID = specific list */
  selectedListId: string | null;
  setSelectedListId: (id: string | null) => void;
}

const ListFilterContext = createContext<ListFilterContextType | undefined>(
  undefined,
);

export function ListFilterProvider({ children }: { children: ReactNode }) {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  return (
    <ListFilterContext.Provider value={{ selectedListId, setSelectedListId }}>
      {children}
    </ListFilterContext.Provider>
  );
}

export function useListFilter() {
  const context = useContext(ListFilterContext);
  if (!context) {
    throw new Error("useListFilter must be used within ListFilterProvider");
  }
  return context;
}
