"use client";

import { useQuery } from "@tanstack/react-query";
import { AlarmClock, Archive, List, User } from "lucide-react";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";
import { useListFilter } from "./use-task-filters";

export function ListFilter() {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const { data: lists } = useQuery({
    ...trpc.taskList.all.queryOptions(),
    enabled: !!session?.user,
  });
  const {
    selectedListId,
    setSelectedListId,
    isTrashView,
    setTrashView,
    isSnoozedView,
    setSnoozedView,
  } = useListFilter();

  if (!lists) return null;

  // A list entry is only "selected" when no pseudo-view is active.
  const isListActive = (id: string | null) =>
    selectedListId === id && !isTrashView && !isSnoozedView;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hover:bg-surface-2 hover:border-primary h-8 gap-1 rounded-full border hover:text-white"
        >
          <List className="mr-2 size-4" />
          List
          {(selectedListId !== null || isTrashView || isSnoozedView) && (
            <div className="bg-primary text-primary-foreground ml-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold">
              1
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2" align="start">
        <div className="flex max-h-[300px] flex-col gap-0.5 overflow-y-auto">
          {/* All Tasks */}
          <button
            onClick={() => setSelectedListId(null)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              "hover:bg-surface-2 hover:border-primary hover:text-white",
              isListActive(null) && "bg-surface-2 text-white",
            )}
          >
            <List className="text-muted-foreground size-3.5" />
            <span className="flex-1 text-left">All Tasks</span>
            {isListActive(null) && (
              <div className="bg-primary size-2 rounded-full" />
            )}
          </button>

          {/* Personal */}
          <button
            onClick={() => setSelectedListId("personal")}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              "hover:bg-surface-2 hover:border-primary hover:text-white",
              isListActive("personal") && "bg-surface-2 text-white",
            )}
          >
            <User className="text-muted-foreground size-3.5" />
            <span className="flex-1 text-left">Personal</span>
            {isListActive("personal") && (
              <div className="bg-primary size-2 rounded-full" />
            )}
          </button>

          {/* Snoozed */}
          <button
            onClick={() => setSnoozedView(true)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              "hover:bg-surface-2 hover:border-primary hover:text-white",
              isSnoozedView && "bg-surface-2 text-white",
            )}
          >
            <AlarmClock className="text-muted-foreground size-3.5" />
            <span className="flex-1 text-left">Snoozed</span>
            {isSnoozedView && (
              <div className="bg-primary size-2 rounded-full" />
            )}
          </button>

          {/* Deleted / Archived */}
          <button
            onClick={() => setTrashView(true)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              "hover:bg-surface-2 hover:border-primary hover:text-white",
              isTrashView && "bg-surface-2 text-white",
            )}
          >
            <Archive className="text-muted-foreground size-3.5" />
            <span className="flex-1 text-left">Deleted</span>
            {isTrashView && <div className="bg-primary size-2 rounded-full" />}
          </button>

          {/* User's lists (only those with showInFilter enabled) */}
          {lists
            .filter((list) => list.showInFilter)
            .map((list) => (
              <button
                key={list.id}
                onClick={() => setSelectedListId(list.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  "hover:bg-surface-2 hover:border-primary hover:text-white",
                  isListActive(list.id) && "bg-surface-2 text-white",
                )}
              >
                <div
                  className="size-2.5 rounded-full ring-1 ring-black/10 ring-inset dark:ring-white/20"
                  style={{ backgroundColor: list.color ?? "var(--primary)" }}
                />
                <span className="flex-1 truncate text-left">{list.name}</span>
                {isListActive(list.id) && (
                  <div className="bg-primary size-2 rounded-full" />
                )}
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
