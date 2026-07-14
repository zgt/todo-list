"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";

import { useTRPC } from "~/trpc/react";
import { CalendarView } from "../calendar-view";
import { useCreateTask } from "../create-task-context";
import { useListFilter } from "../list-filter-context";
import { useViewToggle } from "../view-toggle-context";
import { useFilteredTasks } from "./hooks/useFilteredTasks";
import { InlineCreateTask } from "./InlineCreateTask";
import { TaskCard } from "./TaskCard";
import { TaskCardSkeleton } from "./TaskCardSkeleton";

// --- Task list ---

export function TaskList() {
  const { selectedListId } = useListFilter();

  if (selectedListId === "deleted") {
    return <DeletedTaskList />;
  }

  return <ActiveTaskList />;
}

function DeletedTaskList() {
  const trpc = useTRPC();
  const { data: tasks } = useSuspenseQuery(trpc.task.deleted.queryOptions());

  if (tasks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-xl font-semibold text-white">No deleted tasks</p>
        <p className="text-muted-foreground mt-2">
          Tasks you delete will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <AnimatePresence mode="popLayout">
        {tasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 30,
              delay: i * 0.04,
            }}
            layout
          >
            <TaskCard task={task} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ActiveTaskList() {
  const trpc = useTRPC();
  const { data: tasks } = useSuspenseQuery(trpc.task.all.queryOptions());
  const { isCreating } = useCreateTask();
  const { viewMode } = useViewToggle();

  // Filter tasks based on selected categories, priorities, and list
  const filteredTasks = useFilteredTasks(tasks);

  if (tasks.length === 0 && !isCreating) {
    return (
      <div className="relative flex w-full flex-col gap-4">
        <TaskCardSkeleton pulse={false} />
        <TaskCardSkeleton pulse={false} />
        <TaskCardSkeleton pulse={false} />

        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10">
          <p className="text-2xl font-bold text-white">No tasks yet</p>
        </div>
      </div>
    );
  }

  if (filteredTasks.length === 0 && !isCreating) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-xl font-semibold text-white">
          No tasks match the current filters
        </p>
        <p className="text-muted-foreground mt-2">
          Try adjusting your list, category, or priority filters
        </p>
      </div>
    );
  }

  if (viewMode === "calendar") {
    return <CalendarView tasks={filteredTasks} />;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {isCreating && <InlineCreateTask />}
      <AnimatePresence mode="popLayout">
        {filteredTasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 30,
              delay: i * 0.04,
            }}
            layout
          >
            <TaskCard task={task} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
