"use client";

import { useQuery } from "@tanstack/react-query";
import { List } from "lucide-react";

import type { RouterOutputs } from "@acme/api";
import { cn } from "@acme/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

type TaskListItem = RouterOutputs["taskList"]["all"][number];

export function ListPickerPill({
  value,
  onChange,
  disabled,
}: {
  value: string | undefined;
  onChange: (listId: string | undefined) => void;
  disabled?: boolean;
}) {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const { data: lists } = useQuery({
    ...trpc.taskList.all.queryOptions(),
    enabled: !!session?.user,
  });

  const selectedList = lists?.find((l: TaskListItem) => l.id === value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md",
            "transition-all hover:border-[#21716C]",
            "focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
            selectedList
              ? "border-white/20 bg-white/5 text-[#DCE4E4]"
              : "border-[#164B49] bg-[#102A2A]/80 text-[#DCE4E4] hover:bg-[#102A2A]",
          )}
          disabled={disabled}
        >
          {selectedList ? (
            <>
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: selectedList.color ?? "#8FA8A8" }}
              />
              {selectedList.name}
            </>
          ) : (
            <>
              <List className="h-3.5 w-3.5" />
              List
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 border-white/10 bg-[#0A1A1A] p-1"
        align="start"
      >
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onChange(undefined)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
              !value
                ? "bg-white/10 text-white"
                : "text-[#DCE4E4] hover:bg-white/5",
            )}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#8FA8A8]" />
            Personal
          </button>
          {lists?.map((list: TaskListItem) => (
            <button
              key={list.id}
              onClick={() => onChange(list.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                value === list.id
                  ? "bg-white/10 text-white"
                  : "text-[#DCE4E4] hover:bg-white/5",
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: list.color ?? "#8FA8A8" }}
              />
              {list.name}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
