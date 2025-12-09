"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@acme/ui/sidebar";
import { cn } from "@acme/ui";

// Simple SVG icon components
const HomeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const FolderIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const ClipboardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </svg>
);

const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const navigation = [
  {
    name: "Home",
    href: "/",
    icon: HomeIcon,
  },
  {
    name: "Projects",
    href: "/projects",
    icon: FolderIcon,
  },
  {
    name: "Tasks",
    href: "/tasks",
    icon: ClipboardIcon,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: SettingsIcon,
  },
];

export function AppSidebar({ user }: { user?: { name?: string | null; email?: string | null; image?: string | null } }) {
  const pathname = usePathname();

  return (
    <Sidebar 
      collapsible="none" 
      className="bg-transparent border-none w-64 hidden md:flex h-[calc(100vh-3rem)] mt-6 ml-6"
    >
      <SidebarContent className="bg-transparent p-0">
        <div className="glass-panel h-full flex flex-col p-4 rounded-3xl">
          <SidebarMenu className="gap-2">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={cn(
                      "text-base h-12 px-4 rounded-xl transition-all duration-300",
                      isActive 
                        ? "bg-primary/20 text-primary shadow-glow border border-primary/20" 
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>

          <div className="mt-auto pt-4">
            <div className="glass-card flex items-center gap-3 p-3 rounded-2xl border border-white/10">
              <div className="size-10 rounded-full bg-linear-to-br from-primary to-emerald-700 p-[2px]">
                {user?.image ? (
                  <Image 
                    src={user.image}
                    alt={user.name ?? "User"} 
                    width={40}
                    height={40}
                    className="rounded-full size-full object-cover border-2 border-black"
                  />
                ) : (
                  <div className="rounded-full size-full bg-muted flex items-center justify-center border-2 border-black">
                    <span className="text-xs font-bold">{user?.name?.[0] ?? "?"}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate text-white">{user?.name ?? "Guest"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email ?? "Sign in to continue"}</p>
              </div>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
