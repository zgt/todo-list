"use client";

import { Minus, Plus } from "lucide-react";

export function TimePicker({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
}: {
  hours: number;
  minutes: number;
  onHoursChange: (h: number) => void;
  onMinutesChange: (m: number) => void;
}) {
  const period = hours >= 12 ? "PM" : "AM";
  const display12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  const togglePeriod = () => {
    onHoursChange(hours >= 12 ? hours - 12 : hours + 12);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onHoursChange(hours <= 0 ? 23 : hours - 1)}
        className="border-border-strong bg-surface-2 text-foreground hover:border-border-focus hover:bg-surface-hover flex h-7 w-7 items-center justify-center rounded-md border transition-colors"
        aria-label="Decrease hour"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="text-foreground min-w-[2rem] text-center text-sm font-medium">
        {display12}
      </span>
      <button
        onClick={() => onHoursChange(hours >= 23 ? 0 : hours + 1)}
        className="border-border-strong bg-surface-2 text-foreground hover:border-border-focus hover:bg-surface-hover flex h-7 w-7 items-center justify-center rounded-md border transition-colors"
        aria-label="Increase hour"
      >
        <Plus className="h-3 w-3" />
      </button>
      <span className="text-muted-foreground text-sm font-medium">:</span>
      <button
        onClick={() => onMinutesChange(minutes <= 0 ? 55 : minutes - 5)}
        className="border-border-strong bg-surface-2 text-foreground hover:border-border-focus hover:bg-surface-hover flex h-7 w-7 items-center justify-center rounded-md border transition-colors"
        aria-label="Decrease minutes"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="text-foreground min-w-[2rem] text-center text-sm font-medium">
        {String(minutes).padStart(2, "0")}
      </span>
      <button
        onClick={() => onMinutesChange(minutes >= 55 ? 0 : minutes + 5)}
        className="border-border-strong bg-surface-2 text-foreground hover:border-border-focus hover:bg-surface-hover flex h-7 w-7 items-center justify-center rounded-md border transition-colors"
        aria-label="Increase minutes"
      >
        <Plus className="h-3 w-3" />
      </button>
      <button
        onClick={togglePeriod}
        className="border-border-strong bg-surface-2 text-foreground hover:border-border-focus hover:bg-surface-hover ml-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors"
      >
        {period}
      </button>
    </div>
  );
}
