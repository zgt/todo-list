import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import type { TaskPriority } from "@acme/db/schema";
import { cn } from "@acme/ui";

interface PriorityBadgeProps {
  priority: TaskPriority | null;
  className?: string;
  variant?: "default" | "compact" | "icon-only";
  showLabel?: boolean;
}

const priorityConfig = {
  high: {
    label: "High",
    icon: ArrowUp,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  medium: {
    label: "Medium",
    icon: Minus, // Or maybe a dot or equal sign
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  low: {
    label: "Low",
    icon: ArrowDown,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
};

export function PriorityBadge({
  priority,
  className,
  variant = "default",
  showLabel = true,
}: PriorityBadgeProps) {
  if (!priority) return null;

  const config = priorityConfig[priority];
  const Icon = config.icon;

  if (variant === "icon-only") {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md p-1",
          config.bg,
          config.color,
          className,
        )}
        title={`${config.label} Priority`}
      >
        <Icon className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        config.bg,
        config.color,
        config.border,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}
