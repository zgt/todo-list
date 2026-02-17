import { SidebarInset, SidebarTrigger } from "@acme/ui/sidebar";

import { getSession } from "~/auth/server";
import { AppSidebar } from "../_components/sidebar-nav";
import { MusicBreadcrumbs } from "./music-breadcrumbs";

export default async function MusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="relative flex min-h-screen w-full">
      <AppSidebar user={session?.user} />

      <SidebarInset className="flex h-screen flex-1 flex-col bg-transparent">
        <main className="flex-1 overflow-hidden px-6 pt-6 pb-6">
          <div className="glass-panel relative flex h-full w-full flex-col overflow-hidden rounded-3xl p-8">
            {/* Aurora effect inside panel */}
            <div className="pointer-events-none absolute top-0 left-0 h-full w-full overflow-hidden rounded-3xl">
              <div className="bg-primary/10 absolute top-[-50%] left-[-20%] h-[80%] w-[80%] rounded-full mix-blend-screen blur-[100px]"></div>
              <div className="absolute right-[-10%] bottom-[-20%] h-[60%] w-[60%] rounded-full bg-emerald-600/10 mix-blend-screen blur-[80px]"></div>
            </div>

            <div className="relative z-10 flex h-full flex-col">
              <div className="mb-2 flex items-center gap-3">
                <SidebarTrigger />
              </div>

              <MusicBreadcrumbs />

              <div className="custom-scrollbar flex-1 overflow-y-auto">
                {children}
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
