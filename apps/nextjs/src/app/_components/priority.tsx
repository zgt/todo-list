"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import type { TaskPriority } from "@acme/db/schema";
import { cn } from "@acme/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";

const priorityConfig = {
  high: {
    label: "High",
    icon: ArrowUp,
    color: "#EF4444",
    bgOpacity: "25",
  },
  medium: {
    label: "Medium",
    icon: Minus,
    color: "#F59E0B",
    bgOpacity: "20",
  },
  low: {
    label: "Low",
    icon: ArrowDown,
    color: "#3B82F6",
    bgOpacity: "20",
  },
} as const;

// --- PriorityBadge (display-only) ---

export function PriorityBadge({
  priority,
  variant = "default",
}: {
  priority: string | null;
  variant?: "default" | "compact" | "icon-only";
}) {
  if (!priority || !(priority in priorityConfig) || priority === "medium")
    return null;

  const config = priorityConfig[priority as TaskPriority];
  const Icon = config.icon;

  if (variant === "icon-only") {
    return (
      <div
        className="flex size-5 items-center justify-center rounded"
        style={{ color: config.color }}
        title={`${config.label} priority`}
      >
        <Icon className="size-3.5" strokeWidth={2.5} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium backdrop-blur-md",
        variant === "compact" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
      )}
      style={{
        backgroundColor: `${config.color}${config.bgOpacity}`,
        borderColor: `${config.color}80`,
        color: config.color,
      }}
    >
      <Icon
        className={variant === "compact" ? "size-2.5" : "size-3"}
        strokeWidth={2.5}
      />
      {config.label}
    </div>
  );
}

// --- PrioritySelector (interactive) ---

export function PrioritySelector({
  value,
  onChange,
  disabled,
}: {
  value: string | null | undefined;
  onChange: (priority: TaskPriority | undefined) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value ?? "medium"}
      onValueChange={(v) =>
        onChange(v === "__none__" ? undefined : (v as TaskPriority))
      }
      disabled={disabled}
    >
      <SelectTrigger
        className={cn("bg-background/50 w-full border-0 focus-visible:ring-1")}
      >
        <SelectValue placeholder="Priority" />
      </SelectTrigger>
      <SelectContent>
        {(
          Object.entries(priorityConfig) as [
            TaskPriority,
            (typeof priorityConfig)[TaskPriority],
          ][]
        ).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <SelectItem key={key} value={key}>
              <span className="flex items-center gap-2">
                <Icon
                  className="size-3.5"
                  style={{ color: config.color }}
                  strokeWidth={2.5}
                />
                <span>{config.label}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

// --- PrioritySelectorPill (compact inline for TaskCard edit mode) ---

export function PrioritySelectorPill({
  value,
  onChange,
  disabled,
}: {
  value: string | null | undefined;
  onChange: (priority: TaskPriority) => void;
  disabled?: boolean;
}) {
  const current = (value ?? "medium") as TaskPriority;
  const config = priorityConfig[current];
  const Icon = config.icon;

  return (
    <Select
      value={current}
      onValueChange={(v) => onChange(v as TaskPriority)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md",
          "transition-all hover:brightness-110",
          "focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
          "shadow-none data-[size]:h-auto [&>[aria-hidden]]:hidden",
        )}
        style={{
          backgroundColor: `${config.color}20`,
          borderColor: `${config.color}80`,
          color: config.color,
        }}
      >
        <Icon className="size-3.5" strokeWidth={2.5} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(
          Object.entries(priorityConfig) as [
            TaskPriority,
            (typeof priorityConfig)[TaskPriority],
          ][]
        ).map(([key, cfg]) => {
          const ItemIcon = cfg.icon;
          return (
            <SelectItem key={key} value={key}>
              <span className="flex items-center gap-2">
                <ItemIcon
                  className="size-3.5"
                  style={{ color: cfg.color }}
                  strokeWidth={2.5}
                />
                <span>{cfg.label}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export { priorityConfig };
