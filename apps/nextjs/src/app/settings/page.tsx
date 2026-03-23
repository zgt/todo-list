import Link from "next/link";
import { redirect } from "next/navigation";

import { SidebarInset, SidebarTrigger } from "@acme/ui/sidebar";

import { getSession } from "~/auth/server";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { AppSidebar } from "../_components/sidebar-nav";
import { AccountDeletion } from "./account-deletion";
import { DisplayNameSettings } from "./display-name-settings";
import { NotificationSettings } from "./notification-settings";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/");

  void prefetch(trpc.notification.getUserPreferences.queryOptions());

  return (
    <HydrateClient>
      <div className="relative flex min-h-screen w-full">
        <AppSidebar user={session.user} />

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
                  <h1 className="text-3xl font-bold text-white">Settings</h1>
                </div>

                <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-2 pt-2 pr-4 pb-2">
                  <div className="mx-auto w-full max-w-4xl space-y-6">
                    <DisplayNameSettings />
                    <NotificationSettings />
                    <div className="rounded-2xl border border-[#164B49] bg-[#102A2A]/80 p-6 backdrop-blur-sm">
                      <h2 className="mb-4 text-xl font-semibold text-white">
                        Legal & Support
                      </h2>
                      <div className="space-y-2">
                        <Link
                          href="/support"
                          className="flex items-center justify-between rounded-xl border border-[#164B49] bg-[#0A1A1A]/60 px-4 py-3 text-[#DCE4E4] transition-all hover:border-[#21716C] hover:bg-[#183F3F]/60"
                        >
                          <span>Support</span>
                          <span className="text-[#8FA8A8]">&rarr;</span>
                        </Link>
                        <Link
                          href="/privacy"
                          className="flex items-center justify-between rounded-xl border border-[#164B49] bg-[#0A1A1A]/60 px-4 py-3 text-[#DCE4E4] transition-all hover:border-[#21716C] hover:bg-[#183F3F]/60"
                        >
                          <span>Privacy Policy</span>
                          <span className="text-[#8FA8A8]">&rarr;</span>
                        </Link>
                        <Link
                          href="/terms"
                          className="flex items-center justify-between rounded-xl border border-[#164B49] bg-[#0A1A1A]/60 px-4 py-3 text-[#DCE4E4] transition-all hover:border-[#21716C] hover:bg-[#183F3F]/60"
                        >
                          <span>Terms of Service</span>
                          <span className="text-[#8FA8A8]">&rarr;</span>
                        </Link>
                      </div>
                    </div>
                    <AccountDeletion />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </HydrateClient>
  );
}
