"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates,
} from "nuqs";

import type { TaskPriority } from "@acme/db/schema";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

type ViewMode = "list" | "calendar";

const listParsers = {
  /** null = All Tasks, "personal" = tasks without a list, UUID = specific list */
  list: parseAsString,
  /** Trash / deleted pseudo-view, split out of the list filter */
  trash: parseAsBoolean.withDefault(false),
};

/**
 * List filter + trash view, backed by URL search params. The two are mutually
 * exclusive in the UI: selecting a list clears the trash view, and vice versa.
 * Selecting the trash view uses history: "push" so it feels like navigation and
 * the back button returns to the previous filter.
 */
export function useListFilter() {
  const [{ list, trash }, setListState] = useQueryStates(listParsers);

  return {
    selectedListId: list,
    setSelectedListId: (id: string | null) =>
      void setListState({ list: id, trash: false }),
    isTrashView: trash,
    setTrashView: (on: boolean) =>
      void setListState({ trash: on }, { history: "push" }),
  };
}

/**
 * Category filter, backed by the `?category=` URL param (comma-separated IDs).
 * Also exposes the selected IDs expanded to include all descendant categories.
 */
export function useCategoryFilter() {
  const [selectedCategoryIds, setSelectedCategoryIds] = useQueryState(
    "category",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

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
      const id = queue.pop();
      if (!id || result.has(id)) continue;
      result.add(id);
      const kids = childrenMap.get(id);
      if (kids) queue.push(...kids);
    }

    return [...result];
  }, [selectedCategoryIds, categories]);

  return {
    selectedCategoryIds,
    setSelectedCategoryIds: (ids: string[]) => void setSelectedCategoryIds(ids),
    effectiveCategoryIds,
  };
}

const priorityParser = parseAsArrayOf(
  parseAsStringEnum<TaskPriority>(["high", "medium", "low"]),
).withDefault([]);

/** Priority filter, backed by the `?priority=` URL param. */
export function usePriorityFilter() {
  const [selectedPriorities, setSelectedPriorities] = useQueryState(
    "priority",
    priorityParser,
  );

  return {
    selectedPriorities,
    setSelectedPriorities: (priorities: TaskPriority[]) =>
      void setSelectedPriorities(priorities),
  };
}

const viewParser = parseAsStringEnum<ViewMode>([
  "list",
  "calendar",
]).withDefault("list");

/** List vs. calendar view toggle, backed by the `?view=` URL param. */
export function useViewToggle() {
  const [viewMode, setViewMode] = useQueryState("view", viewParser);

  return { viewMode, setViewMode };
}
