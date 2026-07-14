"use client";

import { useState } from "react";
import { AlarmClock, Calendar, Check } from "lucide-react";

import { cn } from "@acme/ui";
import { CalendarPicker } from "@acme/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

import { useSnoozeMutation } from "./hooks/useSnoozeMutation";
import {
  getLaterToday,
  getNextMondayAt9am,
  getTomorrowAt9am,
} from "./snooze-utils";
import { TimePicker } from "./TimePicker";

// --- Snooze popover content (shared between SnoozePill and hover action) ---

function SnoozeCustomPicker({ onSnooze }: { onSnooze: (date: Date) => void }) {
  const [date, setDate] = useState<Date | undefined>();
  const [hours, setHours] = useState(9);
  const [minutes, setMinutes] = useState(0);

  const handleDateSelect = (d: Date | undefined) => {
    setDate(d);
  };

  const handleConfirm = () => {
    if (!date) return;
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    onSnooze(combined);
  };

  return (
    <div className="flex flex-col">
      <CalendarPicker date={date} onDateChange={handleDateSelect} />
      <div className="border-border-strong border-t px-3 py-2.5">
        <label className="text-muted-foreground/70 mb-1.5 block text-[10px] font-semibold tracking-wider uppercase">
          Time
        </label>
        <TimePicker
          hours={hours}
          minutes={minutes}
          onHoursChange={setHours}
          onMinutesChange={setMinutes}
        />
      </div>
      <div className="border-border-strong border-t p-2">
        <button
          onClick={handleConfirm}
          disabled={!date}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium",
            date
              ? "bg-primary/20 text-primary hover:bg-primary/30"
              : "bg-surface-2 text-muted-foreground opacity-50",
            "transition-all",
          )}
        >
          <Check className="h-3 w-3" />
          Snooze
        </button>
      </div>
    </div>
  );
}

export function SnoozePopoverContent({ taskId }: { taskId: string }) {
  const [showCustom, setShowCustom] = useState(false);
  const snoozeMutation = useSnoozeMutation();

  const handleSnooze = (date: Date) => {
    snoozeMutation.mutate({ id: taskId, snoozedUntil: date });
  };

  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground px-2 py-1 text-xs font-medium">
        Snooze until
      </p>
      <button
        onClick={() => handleSnooze(getLaterToday())}
        className={cn(
          "text-foreground rounded-md px-3 py-2 text-left text-sm",
          "hover:bg-surface-hover transition-colors",
        )}
      >
        Later Today
        <span className="text-muted-foreground ml-2 text-xs">
          {getLaterToday().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </button>
      <button
        onClick={() => handleSnooze(getTomorrowAt9am())}
        className={cn(
          "text-foreground rounded-md px-3 py-2 text-left text-sm",
          "hover:bg-surface-hover transition-colors",
        )}
      >
        Tomorrow
        <span className="text-muted-foreground ml-2 text-xs">9:00 AM</span>
      </button>
      <button
        onClick={() => handleSnooze(getNextMondayAt9am())}
        className={cn(
          "text-foreground rounded-md px-3 py-2 text-left text-sm",
          "hover:bg-surface-hover transition-colors",
        )}
      >
        Next Week
        <span className="text-muted-foreground ml-2 text-xs">Mon 9:00 AM</span>
      </button>
      <div className="border-border-strong my-1 border-t" />
      {showCustom ? (
        <SnoozeCustomPicker onSnooze={handleSnooze} />
      ) : (
        <button
          onClick={() => setShowCustom(true)}
          className={cn(
            "text-foreground rounded-md px-3 py-2 text-left text-sm",
            "hover:bg-surface-hover transition-colors",
          )}
        >
          <Calendar className="mr-2 inline h-3.5 w-3.5" />
          Pick Date
        </button>
      )}
    </div>
  );
}

// --- Snooze pill for task cards ---

export function SnoozePill({ taskId }: { taskId: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md",
            "hover:border-border-focus transition-all",
            "focus:ring-border-focus/20 focus:ring-2 focus:outline-none",
            "border-border-strong bg-surface-2/80 text-foreground hover:bg-surface-2",
          )}
        >
          <AlarmClock className="h-3.5 w-3.5" />
          Snooze
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="end">
        <SnoozePopoverContent taskId={taskId} />
      </PopoverContent>
    </Popover>
  );
}
