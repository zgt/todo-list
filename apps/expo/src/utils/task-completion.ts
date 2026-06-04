export interface CompletionSubtask {
  completed: boolean;
}

export function deriveParentCompletedFromSubtasks(
  subtasks: CompletionSubtask[],
) {
  return subtasks.length > 0 && subtasks.every((subtask) => subtask.completed);
}
