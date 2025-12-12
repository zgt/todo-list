"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Tag } from "lucide-react";

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
];

export function AppSidebar({
  user,
}: {
  user?: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="none"
      className="mt-6 ml-6 hidden h-[calc(100vh-3rem)] w-64 border-none bg-transparent md:flex"
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
                  <form>
                    <button
                      type="submit"
                      formAction={signOut}
                      className="hover:text-foreground w-full rounded-lg px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/5"
                    >
                      Sign out
                    </button>
                  </form>
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
