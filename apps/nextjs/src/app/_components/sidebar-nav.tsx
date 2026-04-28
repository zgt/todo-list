"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  HelpCircle,
  Home,
  Settings,
  ShieldAlert,
  Tag,
  TextCursorInput,
  Users,
} from "lucide-react";

import { cn } from "@acme/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@acme/ui/sidebar";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";
import { signOut } from "./auth-actions";
import { CreateListDialog } from "./create-list-dialog";
import { useListFilter } from "./list-filter-context";
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
    name: "Text Cleaner",
    href: "/text-cleaner",
    icon: TextCursorInput,
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
  useSidebar();

  return (
    <>
      <Sidebar
        collapsible="offcanvas"
        variant="floating"
        className="border-none bg-transparent"
      >
        <SidebarContent className="bg-transparent p-0">
          <div className="glass-panel flex h-full flex-col rounded-2xl p-3 sm:rounded-3xl sm:p-4 md:p-4">
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

            {/* Lists Section - only on home page */}
            {user && pathname === "/" && <SidebarListsSection />}

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
                        href="/settings/blocked-users"
                        className="hover:text-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white transition-colors hover:bg-white/5"
                      >
                        <ShieldAlert className="h-4 w-4" />
                        Blocked Users
                      </Link>
                      <a
                        href="mailto:support@calayo.net"
                        className="hover:text-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white transition-colors hover:bg-white/5"
                      >
                        <HelpCircle className="h-4 w-4" />
                        Contact Support
                      </a>
                      <div className="my-1 h-px bg-white/10" />
                      <Link
                        href="/privacy"
                        className="hover:text-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#8FA8A8] transition-colors hover:bg-white/5"
                      >
                        Privacy Policy
                      </Link>
                      <Link
                        href="/terms"
                        className="hover:text-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#8FA8A8] transition-colors hover:bg-white/5"
                      >
                        Terms of Service
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
    </>
  );
}

function SidebarListsSection() {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const { selectedListId, setSelectedListId } = useListFilter();

  const { data: lists } = useQuery({
    ...trpc.taskList.all.queryOptions(),
    enabled: !!session?.user,
  });

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <div className="mb-2 flex items-center justify-between px-2">
        <span className="text-xs font-semibold tracking-wider text-[#8FA8A8] uppercase">
          Lists
        </span>
        <CreateListDialog />
      </div>

      <SidebarMenu className="gap-1">
        {/* All Tasks */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={selectedListId === null}
            onClick={() => setSelectedListId(null)}
            className={cn(
              "h-9 rounded-lg px-3 text-sm transition-all duration-200",
              selectedListId === null
                ? "bg-primary/20 text-primary border-primary/20 border"
                : "text-[#8FA8A8] hover:bg-white/5 hover:text-[#DCE4E4]",
            )}
          >
            <span className="font-medium">All Tasks</span>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* Personal */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={selectedListId === "personal"}
            onClick={() => setSelectedListId("personal")}
            className={cn(
              "h-9 rounded-lg px-3 text-sm transition-all duration-200",
              selectedListId === "personal"
                ? "bg-primary/20 text-primary border-primary/20 border"
                : "text-[#8FA8A8] hover:bg-white/5 hover:text-[#DCE4E4]",
            )}
          >
            <div className="flex w-full items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-[#8FA8A8]" />
              <span className="flex-1 truncate font-medium">Personal</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* Deleted / Archived */}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={selectedListId === "deleted"}
            onClick={() => setSelectedListId("deleted")}
            className={cn(
              "h-9 rounded-lg px-3 text-sm transition-all duration-200",
              selectedListId === "deleted"
                ? "bg-primary/20 text-primary border-primary/20 border"
                : "text-[#8FA8A8] hover:bg-white/5 hover:text-[#DCE4E4]",
            )}
          >
            <div className="flex w-full items-center gap-2.5">
              <Archive className="h-3.5 w-3.5" />
              <span className="flex-1 truncate font-medium">Deleted</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* User lists (only those with showInFilter enabled) */}
        {lists
          ?.filter((list) => list.showInFilter)
          .map((list) => (
            <SidebarMenuItem key={list.id} className="group/list">
              <SidebarMenuButton
                isActive={selectedListId === list.id}
                onClick={() => setSelectedListId(list.id)}
                className={cn(
                  "h-9 rounded-lg px-3 text-sm transition-all duration-200",
                  selectedListId === list.id
                    ? "bg-primary/20 text-primary border-primary/20 border"
                    : "text-[#8FA8A8] hover:bg-white/5 hover:text-[#DCE4E4]",
                )}
              >
                <div className="flex w-full items-center gap-2.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: list.color ?? "#8FA8A8" }}
                  />
                  <span className="flex-1 truncate font-medium">
                    {list.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {list.memberCount > 1 && (
                      <Users className="h-3 w-3 text-[#8FA8A8]" />
                    )}
                    <Link
                      href={`/lists/${list.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded p-0.5 text-[#8FA8A8] opacity-0 transition-all group-hover/list:opacity-100 hover:bg-white/10 hover:text-[#DCE4E4]"
                      aria-label={`${list.name} settings`}
                    >
                      <Settings className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
      </SidebarMenu>
    </div>
  );
}
