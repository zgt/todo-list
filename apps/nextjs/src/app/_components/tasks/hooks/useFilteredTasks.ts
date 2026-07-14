import type { RouterOutputs } from "@acme/api";
import type { TaskPriority } from "@acme/db/schema";

import { useCategoryFilter } from "../../category-filter-context";
import { useListFilter } from "../../list-filter-context";
import { usePriorityFilter } from "../../priority-filter-context";

// Filters the active task list by the currently selected list, categories, and
// priorities from their respective filter contexts.
export function useFilteredTasks(tasks: RouterOutputs["task"]["all"]) {
  const { effectiveCategoryIds } = useCategoryFilter();
  const { selectedPriorities } = usePriorityFilter();
  const { selectedListId } = useListFilter();

  return tasks.filter((task) => {
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
