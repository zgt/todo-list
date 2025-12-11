import { Suspense } from "react";

import { SidebarInset } from "@acme/ui/sidebar";

import { getSession } from "~/auth/server";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { AppSidebar } from "../_components/sidebar-nav";
import {
  CategoryForm,
  CategoryList,
  CategoryListSkeleton,
} from "./category-components";

export default async function CategoriesPage() {
  const session = await getSession();

  if (session?.user) {
    void prefetch(trpc.category.all.queryOptions());
  }

  return (
    <HydrateClient>
      <div className="relative flex min-h-screen w-full">
        <AppSidebar user={session?.user} />

        <SidebarInset className="flex h-screen flex-1 flex-col bg-transparent">
          <main className="flex-1 px-6 pt-6 pb-6">
            <div className="glass-panel relative flex h-full w-full flex-col rounded-3xl p-8">
              {/* Aurora effect inside panel */}
              <div className="pointer-events-none absolute top-0 left-0 h-full w-full rounded-3xl">
                <div className="bg-primary/10 absolute top-[-50%] left-[-20%] h-[80%] w-[80%] rounded-full mix-blend-screen blur-[100px]"></div>
                <div className="absolute right-[-10%] bottom-[-20%] h-[60%] w-[60%] rounded-full bg-emerald-600/10 mix-blend-screen blur-[80px]"></div>
              </div>

              <div className="relative z-10 flex h-full flex-col">
                {/* Header */}
                <div className="mb-4">
                  <h1 className="mb-2 pl-4 text-3xl font-bold text-white">
                    Categories
                  </h1>
                </div>

                {session?.user ? (
                  <div className="flex flex-1 gap-8">
                    {/* Left side - Create form */}
                    <div className="w-96 flex-shrink-0 pt-2">
                      <div className="glass-card rounded-2xl border border-white/10 p-6">
                        <h2 className="mb-4 text-xl font-semibold text-white">
                          Create Category
                        </h2>
                        <CategoryForm />
                      </div>
                    </div>

                    {/* Right side - Category list */}
                    <div className="custom-scrollbar flex-1 overflow-y-auto px-2 pr-4 pb-2">
                      <Suspense fallback={<CategoryListSkeleton />}>
                        <CategoryList />
                      </Suspense>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                    <h2 className="mb-2 text-2xl font-bold text-white">
                      Welcome to Categories
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      Please sign in to manage your categories
                    </p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </HydrateClient>
  );
}
