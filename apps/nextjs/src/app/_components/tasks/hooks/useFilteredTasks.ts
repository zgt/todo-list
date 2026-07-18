import type { RouterOutputs } from "@acme/api";
import type { TaskPriority } from "@acme/db/schema";

import {
  useCategoryFilter,
  useListFilter,
  usePriorityFilter,
  useSearchFilter,
} from "../../use-task-filters";

// Filters the active task list by the currently selected list, categories,
// priorities, and free-text search from their respective filter contexts.
export function useFilteredTasks(tasks: RouterOutputs["task"]["all"]) {
  const { effectiveCategoryIds } = useCategoryFilter();
  const { selectedPriorities } = usePriorityFilter();
  const { selectedListId } = useListFilter();
  const { search } = useSearchFilter();

  const query = search.trim().toLowerCase();

  return tasks.filter((task) => {
    // Search filter — case-insensitive substring on title + description
    if (query) {
      const inTitle = task.title.toLowerCase().includes(query);
      const inDescription =
        task.description?.toLowerCase().includes(query) ?? false;
      if (!inTitle && !inDescription) return false;
    }

    // List filter
    if (selectedListId === "personal" && task.listId !== null) {
      return false;
    }
    if (
      selectedListId !== null &&
      selectedListId !== "personal" &&
      task.listId !== selectedListId
    ) {
      return false;
    }

    if (
      effectiveCategoryIds.length > 0 &&
      (!task.categoryId || !effectiveCategoryIds.includes(task.categoryId))
    ) {
      return false;
    }
    if (
      selectedPriorities.length > 0 &&
      (!task.priority ||
        !selectedPriorities.includes(task.priority as TaskPriority))
    ) {
      return false;
    }
    return true;
  });
}
