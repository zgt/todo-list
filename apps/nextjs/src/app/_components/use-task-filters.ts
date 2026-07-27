"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  debounce,
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
  /** Snoozed pseudo-view — tasks hidden from `task.all` until they wake up */
  snoozed: parseAsBoolean.withDefault(false),
};

/**
 * List filter + the trash and snoozed pseudo-views, backed by URL search
 * params. All three are mutually exclusive in the UI: selecting a list clears
 * the pseudo-views, and selecting one pseudo-view clears the other. The
 * pseudo-views use history: "push" so they feel like navigation and the back
 * button returns to the previous filter.
 */
export function useListFilter() {
  const [{ list, trash, snoozed }, setListState] = useQueryStates(listParsers);

  return {
    selectedListId: list,
    setSelectedListId: (id: string | null) =>
      void setListState({ list: id, trash: false, snoozed: false }),
    isTrashView: trash,
    setTrashView: (on: boolean) =>
      void setListState({ trash: on, snoozed: false }, { history: "push" }),
    isSnoozedView: snoozed,
    setSnoozedView: (on: boolean) =>
      void setListState({ snoozed: on, trash: false }, { history: "push" }),
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

/**
 * Free-text search, backed by the `?q=` URL param. The default ("") is kept out
 * of the URL, and URL writes are debounced so typing doesn't spam history — the
 * returned value still updates immediately, so consumers filter without lag.
 */
const searchParser = parseAsString
  .withDefault("")
  .withOptions({ limitUrlUpdates: debounce(200) });

export function useSearchFilter() {
  const [search, setSearch] = useQueryState("q", searchParser);

  return {
    search,
    setSearch: (value: string) => void setSearch(value),
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
