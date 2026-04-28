import { SidebarInset, SidebarTrigger } from "@acme/ui/sidebar";

import { getSession } from "~/auth/server";
import { AppSidebar } from "../_components/sidebar-nav";
import { TextCleanerForm } from "./text-cleaner-form";

export default async function TextCleanerPage() {
  const session = await getSession();

  return (
    <div className="relative flex min-h-screen w-full">
      <AppSidebar user={session?.user} />

      <SidebarInset className="flex h-screen flex-1 flex-col bg-transparent">
        <main className="flex-1 px-6 pt-6 pb-6">
          <div className="glass-panel relative flex h-full w-full flex-col overflow-hidden rounded-3xl p-8">
            {/* Aurora effect */}
            <div className="pointer-events-none absolute top-0 left-0 h-full w-full rounded-3xl">
              <div className="bg-primary/10 absolute top-[-50%] left-[-20%] h-[80%] w-[80%] rounded-full mix-blend-screen blur-[100px]"></div>
              <div className="absolute right-[-10%] bottom-[-20%] h-[60%] w-[60%] rounded-full bg-emerald-600/10 mix-blend-screen blur-[80px]"></div>
            </div>

            <div className="relative z-10 flex h-full flex-col">
              <div className="mb-8 flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Text Cleaner
                  </h1>
                  <p className="text-muted-foreground mt-1">
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
