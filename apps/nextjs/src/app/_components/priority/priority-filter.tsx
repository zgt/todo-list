"use client";

import { Check, Filter } from "lucide-react";

import type { TaskPriority } from "@acme/db/schema";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

import { PriorityBadge } from "./priority-badge";
import { usePriorityFilter } from "./priority-filter-context";

export function PriorityFilter() {
  const { priorityFilter, setPriorityFilter } = usePriorityFilter();

  const options: TaskPriority[] = ["high", "medium", "low"];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1 rounded-full border hover:border-emerald-400 hover:bg-[#102A2A] hover:text-white",
            priorityFilter && "border-emerald-500 bg-[#102A2A]/50 text-emerald-500",
          )}
        >
          <Filter className="mr-2 size-4" />
          Priority
          {priorityFilter && (
            <div className="bg-emerald-500 text-black ml-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold">
              1
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="start">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPriorityFilter(null)}
            className="justify-between"
          >
            <span>All Priorities</span>
            {!priorityFilter && <Check className="h-4 w-4" />}
          </Button>
          {options.map((priority) => (
            <Button
              key={priority}
              variant="ghost"
              size="sm"
              onClick={() =>
                setPriorityFilter(
                  priorityFilter === priority ? null : priority,
                )
              }
              className="justify-between"
            >
              <PriorityBadge priority={priority} />
              {priorityFilter === priority && <Check className="h-4 w-4" />}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
