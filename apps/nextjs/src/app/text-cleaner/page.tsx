import { SidebarInset, SidebarTrigger } from "@acme/ui/sidebar";

import { getSession } from "~/auth/server";
import { AppSidebar } from "../_components/sidebar-nav";
import { TextCleanerForm } from "./text-cleaner-form";

export default async function TextCleanerPage() {
  const session = await getSession();

  return (
    <div className="relative flex min-h-screen w-full">
      <AppSidebar user={session?.user} />

      <SidebarInset className="flex min-h-screen flex-1 flex-col bg-transparent md:h-screen">
        <main className="flex-1 px-3 py-3 sm:px-6 sm:pt-6 sm:pb-6">
          <div className="glass-panel relative flex min-h-[calc(100vh-1.5rem)] w-full flex-col overflow-hidden rounded-2xl p-4 sm:min-h-0 sm:rounded-3xl sm:p-8 md:h-full">
            {/* Aurora effect */}
            <div className="pointer-events-none absolute top-0 left-0 h-full w-full rounded-3xl">
              <div className="bg-primary/10 absolute top-[-50%] left-[-20%] h-[80%] w-[80%] rounded-full mix-blend-screen blur-[100px]"></div>
              <div className="absolute right-[-10%] bottom-[-20%] h-[60%] w-[60%] rounded-full bg-emerald-600/10 mix-blend-screen blur-[80px]"></div>
            </div>

            <div className="relative z-10 flex min-h-0 flex-1 flex-col">
              <div className="mb-5 flex items-start gap-3 sm:mb-8 sm:items-center sm:gap-4">
                <SidebarTrigger className="mt-1 shrink-0 sm:mt-0" />
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-white sm:text-3xl">
                    Text Cleaner
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                    Remove hidden end-of-line formatting while preserving real
                    paragraph breaks.
                  </p>
                </div>
              </div>

              <TextCleanerForm />
            </div>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
