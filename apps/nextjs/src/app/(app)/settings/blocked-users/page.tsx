import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { SidebarInset, SidebarTrigger } from "@acme/ui/sidebar";

import { getSession } from "~/auth/server";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { AppSidebar } from "../../../_components/sidebar-nav";
import { BlockedUsersList } from "./blocked-users-list";

export default async function BlockedUsersPage() {
  const session = await getSession();

  void prefetch(trpc.moderation.getBlockedUsers.queryOptions());

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
                    Blocked Users
                  </h1>
                </div>

                <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-2 pt-2 pr-4 pb-2">
                  <div className="mx-auto w-full max-w-2xl">
                    <Suspense
                      fallback={
                        <div className="flex min-h-[400px] items-center justify-center">
                          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                        </div>
                      }
                    >
                      <BlockedUsersList />
                    </Suspense>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </HydrateClient>
  );
}
