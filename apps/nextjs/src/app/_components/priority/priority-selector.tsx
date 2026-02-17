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

interface PrioritySelectorProps {
  value: TaskPriority | null;
  onChange: (value: TaskPriority | null) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function PrioritySelector({
  value,
  onChange,
  disabled,
  className,
  placeholder = "Priority",
}: PrioritySelectorProps) {
  return (
    <Select
      value={value ?? "null"} // Use "null" string for the select value to handle null
      onValueChange={(val) => onChange(val === "null" ? null : (val as TaskPriority))}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "w-[140px]",
          !value && "text-muted-foreground",
          className,
        )}
      >
        <SelectValue placeholder={placeholder}>
          {value ? (
            <div className="flex items-center gap-2">
              {value === "high" && <ArrowUp className="h-4 w-4 text-red-500" />}
              {value === "medium" && <Minus className="h-4 w-4 text-emerald-500" />}
              {value === "low" && <ArrowDown className="h-4 w-4 text-blue-500" />}
              <span className="capitalize">{value}</span>
            </div>
          ) : (
            placeholder
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="high">
          <div className="flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-red-500" />
            <span>High</span>
          </div>
        </SelectItem>
        <SelectItem value="medium">
          <div className="flex items-center gap-2">
            <Minus className="h-4 w-4 text-emerald-500" />
            <span>Medium</span>
          </div>
        </SelectItem>
        <SelectItem value="low">
          <div className="flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-blue-500" />
            <span>Low</span>
          </div>
        </SelectItem>
        {/* Option to clear priority if needed, or just represent 'None' */}
        <SelectItem value="null">
          <div className="flex items-center gap-2">
             <span className="text-muted-foreground">None</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
