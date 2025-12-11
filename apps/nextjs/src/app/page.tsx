import { Suspense } from "react";

import { SidebarInset } from "@acme/ui/sidebar";

import { getSession } from "~/auth/server";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { CategoryFilterProvider } from "./_components/category-filter-context";
import { AppSidebar } from "./_components/sidebar-nav";
import { TaskHeader } from "./_components/task-header";
import { TaskCardSkeleton, TaskList } from "./_components/tasks";

export default async function HomePage() {
  const session = await getSession();

  if (session?.user) {
    void prefetch(trpc.task.all.queryOptions());
  }

  return (
    <HydrateClient>
      <div className="relative flex min-h-screen w-full overflow-hidden">
        {/* Background effects are in global css */}

        <AppSidebar user={session?.user} />

        <SidebarInset className="flex h-screen flex-1 flex-col overflow-hidden bg-transparent">
          {/* Top Header Area */}

          {/* Main Content Area */}
          <main className="flex-1 overflow-hidden px-6 pt-6 pb-6">
            <div className="glass-panel relative flex h-full w-full flex-col overflow-hidden rounded-3xl p-8">
              {/* Aurora effect inside panel */}
              <div className="pointer-events-none absolute top-0 left-0 h-full w-full overflow-hidden rounded-3xl">
                <div className="bg-primary/10 absolute top-[-50%] left-[-20%] h-[80%] w-[80%] rounded-full mix-blend-screen blur-[100px]"></div>
                <div className="absolute right-[-10%] bottom-[-20%] h-[60%] w-[60%] rounded-full bg-emerald-600/10 mix-blend-screen blur-[80px]"></div>
              </div>

              <div className="relative z-10 flex h-full flex-col">
                <CategoryFilterProvider>
                  <TaskHeader />

                  <div className="custom-scrollbar mt-6 flex-1 overflow-y-auto px-2 pr-4 pt-2 pb-2">
                    {session?.user ? (
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
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                        <h2 className="mb-2 text-2xl font-bold text-white">
                          Welcome to Todo List
                        </h2>
                        <p className="text-muted-foreground mb-6">
                          Please sign in to manage your tasks
                        </p>
                      </div>
                    )}
                  </div>
                </CategoryFilterProvider>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </HydrateClient>
  );
}
