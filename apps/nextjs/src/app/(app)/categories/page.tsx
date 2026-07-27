import { Suspense } from "react";

import { SidebarInset, SidebarTrigger } from "@acme/ui/sidebar";

import { getSession } from "~/auth/server";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { CategoryListSkeleton } from "../../_components/categories/CategoryListSkeleton";
import { CategoryTree } from "../../_components/categories/CategoryTree";
import { AppSidebar } from "../../_components/sidebar-nav";

export default async function CategoriesPage() {
  const session = await getSession();

  void prefetch(trpc.category.tree.queryOptions());

  return (
    <HydrateClient>
      <div className="relative flex min-h-screen w-full">
        <AppSidebar user={session?.user} />

        <SidebarInset className="flex h-screen flex-1 flex-col bg-transparent">
          <div className="flex-1 px-6 pt-6 pb-6">
            <div className="glass-panel relative flex h-full w-full flex-col overflow-hidden rounded-3xl p-8">
              {/* Aurora effect inside panel */}
              <div className="pointer-events-none absolute top-0 left-0 h-full w-full rounded-3xl">
                <div className="bg-primary/10 absolute top-[-50%] left-[-20%] h-[80%] w-[80%] rounded-full mix-blend-screen blur-[100px]"></div>
                <div className="bg-primary/10 absolute right-[-10%] bottom-[-20%] h-[60%] w-[60%] rounded-full mix-blend-screen blur-[80px]"></div>
              </div>

              <div className="relative z-10 flex h-full flex-col">
                {/* Header */}
                <div className="mb-4 flex items-center gap-4">
                  <SidebarTrigger />
                  <h1 className="text-3xl font-bold text-white">Categories</h1>
                </div>

                <div className="flex-1">
                  <Suspense fallback={<CategoryListSkeleton />}>
                    <CategoryTree />
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
