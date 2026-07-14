"use client";

import { Calendar, X } from "lucide-react";

import { cn } from "@acme/ui";
import { CalendarPicker } from "@acme/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

// --- Due date pill shared between the create and edit paths ---
// The only difference between the two original copies was the empty-state
// label ("Due date" vs "Set due date"), exposed here as `placeholder`.

export function DueDatePill({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "border-border-strong bg-surface-2/80 text-foreground flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md",
            "hover:border-border-focus hover:bg-surface-2 transition-all",
            "focus:ring-border-focus/20 focus:ring-2 focus:outline-none",
          )}
          disabled={disabled}
        >
          <Calendar className="h-3.5 w-3.5" />
          {value
            ? new Date(value).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col">
          <CalendarPicker date={value} onDateChange={onChange} />
          {value && (
            <div className="border-border-strong border-t p-2">
              <button
                onClick={() => onChange(undefined)}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium",
                  "bg-surface-2 text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                  "transition-all",
                )}
              >
                <X className="h-3 w-3" />
                Clear date
              </button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
