"use client";

import { useQuery } from "@tanstack/react-query";
import { List, User } from "lucide-react";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";
import { useListFilter } from "./list-filter-context";

export function ListFilter() {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const { data: lists } = useQuery({
    ...trpc.taskList.all.queryOptions(),
    enabled: !!session?.user,
  });
  const { selectedListId, setSelectedListId } = useListFilter();

  if (!lists) return null;

  const selectedLabel =
    selectedListId === null
      ? null
      : selectedListId === "personal"
        ? "Personal"
        : lists.find((l) => l.id === selectedListId)?.name;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 rounded-full border hover:border-emerald-400 hover:bg-[#102A2A] hover:text-white"
        >
          <List className="mr-2 size-4" />
          List
          {selectedListId !== null && (
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
              "hover:border-emerald-400 hover:bg-[#102A2A] hover:text-white",
              selectedListId === null && "bg-[#102A2A] text-white",
            )}
          >
            <List className="size-3.5 text-[#8FA8A8]" />
            <span className="flex-1 text-left">All Tasks</span>
            {selectedListId === null && (
              <div className="size-2 rounded-full bg-emerald-400" />
            )}
          </button>

          {/* Personal */}
          <button
            onClick={() => setSelectedListId("personal")}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              "hover:border-emerald-400 hover:bg-[#102A2A] hover:text-white",
              selectedListId === "personal" && "bg-[#102A2A] text-white",
            )}
          >
            <User className="size-3.5 text-[#8FA8A8]" />
            <span className="flex-1 text-left">Personal</span>
            {selectedListId === "personal" && (
              <div className="size-2 rounded-full bg-emerald-400" />
            )}
          </button>

          {/* User's lists */}
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => setSelectedListId(list.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                "hover:border-emerald-400 hover:bg-[#102A2A] hover:text-white",
                selectedListId === list.id && "bg-[#102A2A] text-white",
              )}
            >
              <div
                className="size-2.5 rounded-full ring-1 ring-black/10 ring-inset dark:ring-white/20"
                style={{ backgroundColor: list.color ?? "#50C878" }}
              />
              <span className="flex-1 truncate text-left">{list.name}</span>
              {selectedListId === list.id && (
                <div className="size-2 rounded-full bg-emerald-400" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
