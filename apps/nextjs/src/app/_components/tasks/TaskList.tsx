"use client";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";

import type { RouterOutputs } from "@acme/api";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";
import { CalendarView } from "../calendar-view";
import { useCreateTask } from "../create-task-context";
import { useListFilter, useViewToggle } from "../use-task-filters";
import { CardView } from "./cards/CardView";
import { useFilteredTasks } from "./hooks/useFilteredTasks";
import { InlineCreateTask } from "./InlineCreateTask";
import { SnoozedTaskCard } from "./SnoozedTaskCard";
import { TaskCard } from "./TaskCard";
import { TaskCardSkeleton } from "./TaskCardSkeleton";
import { TrashTaskCard } from "./TrashTaskCard";

// --- Task list ---

type Categories = RouterOutputs["category"]["all"] | undefined;

export function TaskList() {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const { isTrashView, isSnoozedView } = useListFilter();

  // Fetched once here and passed down so cards don't each subscribe to
  // category.all (one subscription per view instead of one per card).
  const { data: categories } = useQuery({
    ...trpc.category.all.queryOptions(),
    enabled: !!session?.user,
  });

  if (isTrashView) {
    return <DeletedTaskList categories={categories} />;
  }

  if (isSnoozedView) {
    return <SnoozedTaskList categories={categories} />;
  }

  return <ActiveTaskList categories={categories} />;
}

function SnoozedTaskList({ categories }: { categories: Categories }) {
  const trpc = useTRPC();
  const { data: tasks } = useSuspenseQuery(trpc.task.snoozed.queryOptions());

  if (tasks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-xl font-semibold text-white">Nothing snoozed</p>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Snoozed tasks are hidden from your list until their wake-up time.
          They&rsquo;ll show up here while they wait.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Snoozed tasks are hidden from your list until their wake-up time.
        Unsnooze one to bring it back now.
      </p>
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
              delay: Math.min(i, 8) * 0.04,
            }}
            layout
          >
            <SnoozedTaskCard task={task} categories={categories} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function DeletedTaskList({ categories }: { categories: Categories }) {
  const trpc = useTRPC();
  const { data: tasks } = useSuspenseQuery(trpc.task.deleted.queryOptions());

  if (tasks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-xl font-semibold text-white">Trash is empty</p>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Deleted tasks stay here until you delete them forever. Completed tasks
          are archived here automatically a day after completion.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Deleted tasks stay here until you delete them forever. Completed tasks
        are archived here automatically a day after completion.
      </p>
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
              delay: Math.min(i, 8) * 0.04,
            }}
            layout
          >
            <TrashTaskCard task={task} categories={categories} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ActiveTaskList({ categories }: { categories: Categories }) {
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
          Try adjusting your search or your list, category, and priority filters
        </p>
      </div>
    );
  }

  if (viewMode === "calendar") {
    return <CalendarView tasks={filteredTasks} />;
  }

  if (viewMode === "cards") {
    return <CardView tasks={filteredTasks} categories={categories} />;
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
              delay: Math.min(i, 8) * 0.04,
            }}
            layout
          >
            <TaskCard task={task} categories={categories} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
