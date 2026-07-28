"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";

import { cn } from "@acme/ui";
import { CalendarPicker } from "@acme/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

import { formatReminder } from "./reminder-utils";
import { TimePicker } from "./TimePicker";

// --- Reminder pill used in both InlineCreateTask and TaskCard edit mode ---

export function ReminderPill({
  value,
  onChange,
  disabled,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
}) {
  // Internal state for building the date+time before applying
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
  const [selectedHours, setSelectedHours] = useState(value?.getHours() ?? 9);
  const [selectedMinutes, setSelectedMinutes] = useState(
    value?.getMinutes() ?? 0,
  );

  // Sync internal state when value changes externally (render-time update)
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setSelectedDate(value);
    setSelectedHours(value?.getHours() ?? 9);
    setSelectedMinutes(value?.getMinutes() ?? 0);
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const combined = new Date(date);
      combined.setHours(selectedHours, selectedMinutes, 0, 0);
      onChange(combined);
    }
  };

  const handleHoursChange = (h: number) => {
    setSelectedHours(h);
    if (selectedDate) {
      const combined = new Date(selectedDate);
      combined.setHours(h, selectedMinutes, 0, 0);
      onChange(combined);
    }
  };

  const handleMinutesChange = (m: number) => {
    setSelectedMinutes(m);
    if (selectedDate) {
      const combined = new Date(selectedDate);
      combined.setHours(selectedHours, m, 0, 0);
      onChange(combined);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium",
            "hover:border-border-focus transition-all",
            "focus:ring-border-focus/20 focus:ring-2 focus:outline-none",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            value
              ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
              : "border-border-strong bg-surface-2/80 text-foreground hover:bg-surface-2",
          )}
          disabled={disabled}
        >
          <Bell className="h-3.5 w-3.5" />
          {value ? formatReminder(value) : "Reminder"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex flex-col">
          <CalendarPicker date={selectedDate} onDateChange={handleDateSelect} />
          <div className="border-border-strong border-t px-3 py-2.5">
            <p className="text-muted-foreground/70 mb-1.5 block text-[10px] font-semibold tracking-wider uppercase">
              Time
            </p>
            <TimePicker
              hours={selectedHours}
              minutes={selectedMinutes}
              onHoursChange={handleHoursChange}
              onMinutesChange={handleMinutesChange}
            />
          </div>
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
                Clear reminder
              </button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
