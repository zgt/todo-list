"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Music, Settings, Tag, User } from "lucide-react";

import { cn } from "@acme/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@acme/ui/sidebar";

import { signOut } from "./auth-actions";
import { SidebarSignInButton } from "./sidebar-signin-button";

const navigation = [
  {
    name: "Home",
    href: "/",
    icon: Home,
  },
  {
    name: "Categories",
    href: "/categories",
    icon: Tag,
  },
  {
    name: "Music Leagues",
    href: "/music",
    icon: Music,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function AppSidebar({
  user,
}: {
  user?: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="offcanvas"
      variant="floating"
      className="border-none bg-transparent"
    >
      <SidebarContent className="bg-transparent p-0">
        <div className="glass-panel flex h-full flex-col rounded-3xl p-4">
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
                      "h-12 rounded-xl px-4 text-base transition-all duration-300",
                      isActive
                        ? "bg-primary/20 text-primary shadow-glow border-primary/20 border"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5",
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
            {user ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="glass-card flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-white/10 p-3 transition-colors hover:bg-white/5">
                    <div className="from-primary size-10 rounded-full bg-linear-to-br to-emerald-700 p-[2px]">
                      {user.image ? (
                        <Image
                          src={user.image}
                          alt={user.name ?? "User"}
                          width={40}
                          height={40}
                          className="size-full rounded-full border-2 border-black object-cover"
                        />
                      ) : (
                        <div className="bg-muted flex size-full items-center justify-center rounded-full border-2 border-black">
                          <span className="text-xs font-bold">
                            {user.name?.[0] ?? "?"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden text-left">
                      <p className="truncate text-sm font-medium text-white">
                        {user.name}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {user.email}
                      </p>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="glass-card w-56 border-white/10 p-2"
                  side="top"
                  align="start"
                  sideOffset={8}
                >
                  <div className="flex flex-col gap-1">
                    <Link
                      href="/music/profile"
                      className="hover:text-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white transition-colors hover:bg-white/5"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link
                      href="/music/settings"
                      className="hover:text-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white transition-colors hover:bg-white/5"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <form>
                      <button
                        type="submit"
                        formAction={signOut}
                        className="hover:text-foreground w-full rounded-lg px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/5"
                      >
                        Sign out
                      </button>
                    </form>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <SidebarSignInButton />
            )}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
