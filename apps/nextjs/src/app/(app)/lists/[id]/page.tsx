import { Suspense } from "react";

import { SidebarInset, SidebarTrigger } from "@acme/ui/sidebar";

import { getSession } from "~/auth/server";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { AppSidebar } from "../../../_components/sidebar-nav";
import { ListDetail } from "./list-detail";

function ListDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl animate-pulse space-y-6">
      <div className="glass-card rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-4">
          <div className="bg-surface-2 h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="bg-surface-2 h-6 w-1/3 rounded-md" />
            <div className="bg-surface-2 h-4 w-1/2 rounded-md" />
          </div>
        </div>
      </div>
      <div className="glass-card rounded-2xl border border-white/10 p-6">
        <div className="bg-surface-2 mb-4 h-5 w-28 rounded-md" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3"
            >
              <div className="bg-surface-2 h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="bg-surface-2 h-4 w-1/3 rounded-md" />
                <div className="bg-surface-2 h-3 w-1/2 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  const { id } = await params;

  void prefetch(trpc.taskList.byId.queryOptions({ id }));

  return (
    <HydrateClient>
      <div className="relative flex min-h-screen w-full">
        <AppSidebar user={session?.user} />

        <SidebarInset className="flex h-screen flex-1 flex-col bg-transparent">
          <div className="flex-1 px-6 pt-6 pb-6">
            <div className="glass-panel relative flex h-full w-full flex-col overflow-hidden rounded-3xl p-8">
              {/* Aurora effect */}
              <div className="pointer-events-none absolute top-0 left-0 h-full w-full rounded-3xl">
                <div className="bg-primary/10 absolute top-[-50%] left-[-20%] h-[80%] w-[80%] rounded-full mix-blend-screen blur-[100px]"></div>
                <div className="bg-primary/10 absolute right-[-10%] bottom-[-20%] h-[60%] w-[60%] rounded-full mix-blend-screen blur-[80px]"></div>
              </div>

              <div className="relative z-10 flex h-full flex-col">
                <div className="mb-8 flex items-center gap-4">
                  <SidebarTrigger />
                  <h1 className="text-3xl font-bold text-white">
                    List Settings
                  </h1>
                </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto px-2 pt-2 pr-4 pb-2">
                  <Suspense fallback={<ListDetailSkeleton />}>
                    <ListDetail />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </HydrateClient>
  );
}
