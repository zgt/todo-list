"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { TaskPriority } from "@acme/db/schema";

interface PriorityFilterContextType {
  priorityFilter: TaskPriority | null;
  setPriorityFilter: (priority: TaskPriority | null) => void;
}

const PriorityFilterContext = createContext<PriorityFilterContextType | undefined>(
  undefined,
);

export function PriorityFilterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize from URL param
  const priorityParam = searchParams.get("priority");
  const initialPriority =
    priorityParam === "high" ||
    priorityParam === "medium" ||
    priorityParam === "low"
      ? (priorityParam as TaskPriority)
      : null;

  const [priorityFilter, setPriorityFilterState] = useState<TaskPriority | null>(
    initialPriority,
  );

  // Sync state with URL
  const setPriorityFilter = (priority: TaskPriority | null) => {
    setPriorityFilterState(priority);
    const params = new URLSearchParams(searchParams.toString());
    if (priority) {
      params.set("priority", priority);
    } else {
      params.delete("priority");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // Sync URL changes back to state (e.g. back button)
  useEffect(() => {
    const p = searchParams.get("priority");
    if (
      p === "high" ||
      p === "medium" ||
      p === "low"
    ) {
      setPriorityFilterState(p as TaskPriority);
    } else {
      setPriorityFilterState(null);
    }
  }, [searchParams]);

  return (
    <PriorityFilterContext.Provider
      value={{
        priorityFilter,
        setPriorityFilter,
      }}
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
