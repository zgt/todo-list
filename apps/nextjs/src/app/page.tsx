import { Suspense } from "react";

import { SidebarInset } from "@acme/ui/sidebar";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { getSession } from "~/auth/server";
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
        
        <SidebarInset className="bg-transparent flex-1 flex flex-col h-screen overflow-hidden">
          {/* Top Header Area */}

          {/* Main Content Area */}
          <main className="flex-1 px-6 pb-6 pt-6 overflow-hidden">
            <div className="glass-panel h-full w-full flex flex-col p-8 rounded-3xl relative overflow-hidden">
              {/* Aurora effect inside panel */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none rounded-3xl">
                <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[80%] bg-primary/10 blur-[100px] rounded-full mix-blend-screen"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/10 blur-[80px] rounded-full mix-blend-screen"></div>
              </div>

              <div className="relative z-10 flex flex-col h-full">
                <TaskHeader />
                
                <div className="mt-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
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
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <h2 className="text-2xl font-bold mb-2 text-white">Welcome to Todo List</h2>
                      <p className="text-muted-foreground mb-6">Please sign in to manage your tasks</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </HydrateClient>
  );
}
