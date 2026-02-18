"use client";

import { ArrowDown, ArrowUp, Minus, SlidersHorizontal } from "lucide-react";

import type { TaskPriority } from "@acme/db/schema";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

import { usePriorityFilter } from "./priority-filter-context";

const priorities: {
  key: TaskPriority;
  label: string;
  icon: typeof ArrowUp;
  color: string;
}[] = [
  { key: "high", label: "High", icon: ArrowUp, color: "#EF4444" },
  { key: "medium", label: "Medium", icon: Minus, color: "#F59E0B" },
  { key: "low", label: "Low", icon: ArrowDown, color: "#3B82F6" },
];

export function PriorityFilter() {
  const { selectedPriorities, setSelectedPriorities } = usePriorityFilter();

  const togglePriority = (p: TaskPriority) => {
    setSelectedPriorities(
      selectedPriorities.includes(p)
        ? selectedPriorities.filter((x) => x !== p)
        : [...selectedPriorities, p],
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 rounded-full border hover:border-emerald-400 hover:bg-[#102A2A] hover:text-white"
        >
          <SlidersHorizontal className="mr-2 size-4" />
          Priority
          {selectedPriorities.length > 0 && (
            <div className="bg-primary text-primary-foreground ml-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold">
              {selectedPriorities.length}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="start">
        <div className="flex flex-col gap-0.5">
          {priorities.map(({ key, label, icon: Icon, color }) => {
            const isSelected = selectedPriorities.includes(key);
            return (
              <button
                key={key}
                onClick={() => togglePriority(key)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  "hover:border-emerald-400 hover:bg-[#102A2A] hover:text-white",
                  isSelected && "bg-[#102A2A] text-white",
                )}
              >
                <Icon
                  className="size-3.5"
                  style={{ color }}
                  strokeWidth={2.5}
                />
                <span className="flex-1 text-left">{label}</span>
                {isSelected && (
                  <div
                    className="size-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
