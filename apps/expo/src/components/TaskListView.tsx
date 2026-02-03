import { useCallback, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

import type { LocalTask } from "~/db/client";
import { SwipeableRow } from "./SwipeableRow";
import { TaskCard } from "./TaskCard";

interface TaskListViewProps {
  tasks: (LocalTask & { category?: { name: string; color: string } | null })[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (
    id: string,
    updates: Partial<{
      title: string;
      description: string;
      categoryId: string | null;
      dueDate: Date | null;
    }>,
  ) => void;
}

interface EditState {
  title: string;
  description: string;
  categoryId: string | null;
  dueDate: Date | null;
}

export function TaskListView({
  tasks,
  onToggle,
  onDelete,
  onUpdate,
}: TaskListViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    title: "",
    description: "",
    categoryId: null,
    dueDate: null,
  });

  const handleStartEdit = useCallback(
    (task: LocalTask) => {
      setEditingId(task.id);
      setEditState({
        title: task.title,
        description: task.description ?? "",
        categoryId: task.categoryId ?? null,
        dueDate: task.dueDate ?? null,
      });
    },
    [],
  );

  const handleSave = useCallback(
    (
      id: string,
      updates: Partial<{
        title: string;
        description: string;
        categoryId: string | null;
        dueDate: Date | null;
      }>,
    ) => {
      onUpdate(id, updates);
      setEditingId(null);
    },
    [onUpdate],
  );

  const renderItem = useCallback(
    ({
      item: task,
    }: {
      item: LocalTask & { category?: { name: string; color: string } | null };
    }) => {
      const isEditing = editingId === task.id;

      return (
        <SwipeableRow
          onEdit={() => handleStartEdit(task)}
          onDelete={() => onDelete(task.id)}
          isEditing={isEditing}
        >
          <TaskCard
            variant="compact"
            task={task}
            onToggle={() => onToggle(task.id, !task.completed)}
            onDelete={() => onDelete(task.id)}
            deletePending={false}
            isEditing={isEditing}
            onSave={(updates) => handleSave(task.id, updates)}
            title={isEditing ? editState.title : task.title}
            description={isEditing ? editState.description : task.description ?? ""}
            onChangeTitle={(text) =>
              setEditState((prev) => ({ ...prev, title: text }))
            }
            onChangeDescription={(text) =>
              setEditState((prev) => ({ ...prev, description: text }))
            }
            categoryId={isEditing ? editState.categoryId : task.categoryId ?? null}
            dueDate={isEditing ? editState.dueDate : task.dueDate ?? null}
            onChangeCategoryId={(categoryId) =>
              setEditState((prev) => ({ ...prev, categoryId }))
            }
            onChangeDueDate={(dueDate) =>
              setEditState((prev) => ({ ...prev, dueDate }))
            }
          />
        </SwipeableRow>
      );
    },
    [
      editingId,
      editState,
      handleStartEdit,
      handleSave,
      onToggle,
      onDelete,
    ],
  );

  return (
    <Animated.FlatList
      data={tasks}
      keyExtractor={(task) => task.id}
      renderItem={renderItem}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      entering={FadeIn.duration(200)}
      itemLayoutAnimation={LinearTransition.springify().damping(20).stiffness(200)}
      keyboardShouldPersistTaps="handled"
      extraData={editingId}
    />
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    gap: 8,
    paddingBottom: 20,
  },
});
