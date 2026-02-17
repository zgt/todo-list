"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";

import type { TaskPriority } from "@acme/db/schema";

interface PriorityFilterContextType {
  selectedPriorities: TaskPriority[];
  setSelectedPriorities: (priorities: TaskPriority[]) => void;
}

const PriorityFilterContext = createContext<
  PriorityFilterContextType | undefined
>(undefined);

export function PriorityFilterProvider({ children }: { children: ReactNode }) {
  const [selectedPriorities, setSelectedPriorities] = useState<TaskPriority[]>(
    [],
  );

  return (
    <PriorityFilterContext.Provider
      value={{ selectedPriorities, setSelectedPriorities }}
    >
      {children}
    </PriorityFilterContext.Provider>
  );
}

export function usePriorityFilter() {
  const context = useContext(PriorityFilterContext);
  if (!context) {
    throw new Error(
      "usePriorityFilter must be used within PriorityFilterProvider",
    );
  }
  return context;
}
