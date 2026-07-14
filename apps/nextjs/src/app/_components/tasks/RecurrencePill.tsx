"use client";

import { Minus, Plus, Repeat } from "lucide-react";

import { cn } from "@acme/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

import type { RecurrenceRuleType } from "./recurrence-utils";
import {
  formatRecurrenceLabel,
  getRecurrenceUnitLabel,
  RECURRENCE_OPTIONS,
} from "./recurrence-utils";

// --- Recurrence pill for create/edit ---

export function RecurrencePill({
  rule,
  interval,
  onRuleChange,
  onIntervalChange,
  disabled,
}: {
  rule: RecurrenceRuleType;
  interval: number;
  onRuleChange: (rule: RecurrenceRuleType) => void;
  onIntervalChange: (interval: number) => void;
  disabled?: boolean;
}) {
  const unitLabel = rule ? getRecurrenceUnitLabel(rule) : "";
  const displayLabel = rule ? formatRecurrenceLabel(rule, interval) : "Repeat";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md",
            "hover:border-border-focus transition-all",
            "focus:ring-border-focus/20 focus:ring-2 focus:outline-none",
            rule
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border-strong bg-surface-2/80 text-foreground hover:bg-surface-2",
          )}
          disabled={disabled}
        >
          <Repeat className="h-3.5 w-3.5" />
          {displayLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="end">
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-xs font-medium">
            Recurrence
          </p>
          <div className="flex flex-wrap gap-1.5">
            {RECURRENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value ?? "none"}
                onClick={() => {
                  onRuleChange(opt.value);
                  if (!opt.value) onIntervalChange(1);
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  rule === opt.value
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border-strong bg-surface-2/80 text-foreground hover:border-border-focus hover:bg-surface-2",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {rule && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Every</span>
              <button
                onClick={() => onIntervalChange(Math.max(1, interval - 1))}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md",
                  "border-border-strong bg-surface-2 text-foreground border",
                  "hover:border-border-focus hover:bg-surface-hover transition-colors",
                  "disabled:opacity-50",
                )}
                disabled={interval <= 1}
                aria-label="Decrease interval"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="text-foreground min-w-[1.5rem] text-center text-sm font-medium">
                {interval}
              </span>
              <button
                onClick={() => onIntervalChange(Math.min(365, interval + 1))}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md",
                  "border-border-strong bg-surface-2 text-foreground border",
                  "hover:border-border-focus hover:bg-surface-hover transition-colors",
                  "disabled:opacity-50",
                )}
                disabled={interval >= 365}
                aria-label="Increase interval"
              >
                <Plus className="h-3 w-3" />
              </button>
              <span className="text-muted-foreground text-xs">
                {unitLabel}
                {interval !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
