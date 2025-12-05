import { Suspense } from "react";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { AuthShowcase } from "./_components/auth-showcase";
import {
  CreateTaskForm,
  TaskCardSkeleton,
  TaskList,
} from "./_components/tasks";

export default function HomePage() {
  prefetch(trpc.task.all.queryOptions());

  return (
    <HydrateClient>
      <main className="container h-screen py-16">
        <div className="flex flex-col items-center justify-center gap-4">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Todo <span className="text-primary">List</span>
          </h1>

          <AuthShowcase />

          <CreateTaskForm />

          <div className="w-full max-w-2xl">
            <Suspense
              fallback={
                <div className="flex w-full flex-col gap-4">
                  <TaskCardSkeleton />
                  <TaskCardSkeleton />
                  <TaskCardSkeleton />
                </div>
              }
            >
              <TaskList />
            </Suspense>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
