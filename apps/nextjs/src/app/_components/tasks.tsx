"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  AlarmClock,
  Bell,
  Calendar,
  Check,
  ChevronRight,
  Minus,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  X,
} from "lucide-react";
import { z } from "zod";

import type { RouterOutputs } from "@acme/api";
import type { TaskPriority } from "@acme/db/schema";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Checkbox } from "@acme/ui/checkbox";
import { CalendarPicker } from "@acme/ui/date-picker";
import { Input } from "@acme/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";
import { toast } from "@acme/ui/toast";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";
import { CalendarView } from "./calendar-view";
import { useCategoryFilter } from "./category-filter-context";
import { CategoryTreePicker } from "./category-tree-picker";
import { useCreateTask } from "./create-task-context";
import { useListFilter } from "./list-filter-context";
import { ListPickerPill } from "./list-picker-pill";
import { PriorityBadge, PrioritySelectorPill } from "./priority";
import { usePriorityFilter } from "./priority-filter-context";
import { useViewToggle } from "./view-toggle-context";

// Validation schema for inline task editing
const EditTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
});

// --- Helper functions for reminder display and datetime-local conversion ---

type ReminderStatus = "reminded" | "upcoming" | "imminent" | "overdue";

function getReminderStatus(
  reminderAt: Date,
  reminderSentAt: Date | null,
): ReminderStatus {
  const now = new Date();
  const diff = reminderAt.getTime() - now.getTime();
  if (diff < 0 && reminderSentAt) return "reminded";
  if (diff < 0) return "overdue";
  if (diff <= 60 * 60 * 1000) return "imminent"; // within 1 hour
  return "upcoming";
}

function formatReminder(
  reminderAt: Date,
  reminderSentAt?: Date | null,
): string {
  const status = getReminderStatus(reminderAt, reminderSentAt ?? null);
  if (status === "reminded") return "Reminded";
  if (status === "overdue") return "Overdue";

  const now = new Date();
  const diff = reminderAt.getTime() - now.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 60) return `in ${minutes}m`;
  if (hours < 24) return `in ${hours}h`;
  if (days < 7) return `in ${days}d`;
  return (
    reminderAt.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) +
    " at " +
    reminderAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  );
}

function getReminderBadgeClasses(
  reminderAt: Date,
  reminderSentAt: Date | null,
): string {
  const status = getReminderStatus(reminderAt, reminderSentAt);
  switch (status) {
    case "reminded":
      return "border-[#164B49] bg-[#102A2A]/80 text-[#8FA8A8]";
    case "imminent":
      return "border-[#50C878]/50 bg-[#50C878]/10 text-[#50C878]";
    case "overdue":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
    case "upcoming":
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  }
}

// --- Reminder pill used in both InlineCreateTask and TaskCard edit mode ---

function TimePicker({
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
        className="flex h-7 w-7 items-center justify-center rounded-md border border-[#164B49] bg-[#102A2A] text-[#DCE4E4] transition-colors hover:border-[#21716C] hover:bg-[#183F3F]"
        aria-label="Decrease hour"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="min-w-[2rem] text-center text-sm font-medium text-[#DCE4E4]">
        {display12}
      </span>
      <button
        onClick={() => onHoursChange(hours >= 23 ? 0 : hours + 1)}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-[#164B49] bg-[#102A2A] text-[#DCE4E4] transition-colors hover:border-[#21716C] hover:bg-[#183F3F]"
        aria-label="Increase hour"
      >
        <Plus className="h-3 w-3" />
      </button>
      <span className="text-sm font-medium text-[#8FA8A8]">:</span>
      <button
        onClick={() => onMinutesChange(minutes <= 0 ? 55 : minutes - 5)}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-[#164B49] bg-[#102A2A] text-[#DCE4E4] transition-colors hover:border-[#21716C] hover:bg-[#183F3F]"
        aria-label="Decrease minutes"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="min-w-[2rem] text-center text-sm font-medium text-[#DCE4E4]">
        {String(minutes).padStart(2, "0")}
      </span>
      <button
        onClick={() => onMinutesChange(minutes >= 55 ? 0 : minutes + 5)}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-[#164B49] bg-[#102A2A] text-[#DCE4E4] transition-colors hover:border-[#21716C] hover:bg-[#183F3F]"
        aria-label="Increase minutes"
      >
        <Plus className="h-3 w-3" />
      </button>
      <button
        onClick={togglePeriod}
        className="ml-1 rounded-md border border-[#164B49] bg-[#102A2A] px-2 py-1 text-xs font-medium text-[#DCE4E4] transition-colors hover:border-[#21716C] hover:bg-[#183F3F]"
      >
        {period}
      </button>
    </div>
  );
}

function ReminderPill({
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
            "flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md",
            "transition-all hover:border-[#21716C]",
            "focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
            value
              ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
              : "border-[#164B49] bg-[#102A2A]/80 text-[#DCE4E4] hover:bg-[#102A2A]",
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
          <div className="border-t border-[#164B49] px-3 py-2.5">
            <label className="mb-1.5 block text-[10px] font-semibold tracking-wider text-[#8FA8A8]/70 uppercase">
              Time
            </label>
            <TimePicker
              hours={selectedHours}
              minutes={selectedMinutes}
              onHoursChange={handleHoursChange}
              onMinutesChange={handleMinutesChange}
            />
          </div>
          {value && (
            <div className="border-t border-[#164B49] p-2">
              <button
                onClick={() => onChange(undefined)}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium",
                  "bg-[#102A2A] text-[#8FA8A8] hover:bg-[#183F3F] hover:text-[#DCE4E4]",
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

// --- Snooze helper functions ---

function getLaterToday(): Date {
  const later = new Date();
  later.setHours(later.getHours() + 4);
  later.setMinutes(0, 0, 0);
  return later;
}

function getTomorrowAt9am(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow;
}

function getNextMondayAt9am(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(monday.getDate() + daysUntilMonday);
  monday.setHours(9, 0, 0, 0);
  return monday;
}

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
      <div className="border-t border-[#164B49] px-3 py-2.5">
        <label className="mb-1.5 block text-[10px] font-semibold tracking-wider text-[#8FA8A8]/70 uppercase">
          Time
        </label>
        <TimePicker
          hours={hours}
          minutes={minutes}
          onHoursChange={setHours}
          onMinutesChange={setMinutes}
        />
      </div>
      <div className="border-t border-[#164B49] p-2">
        <button
          onClick={handleConfirm}
          disabled={!date}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium",
            date
              ? "bg-[#50C878]/20 text-[#50C878] hover:bg-[#50C878]/30"
              : "bg-[#102A2A] text-[#8FA8A8] opacity-50",
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

function SnoozePopoverContent({ taskId }: { taskId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showCustom, setShowCustom] = useState(false);

  const snoozeMutation = useMutation(
    trpc.task.snooze.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.task.pathFilter()),
          queryClient.invalidateQueries(trpc.taskList.pathFilter()),
        ]);
        toast.success("Task snoozed!");
      },
      onError: () => toast.error("Failed to snooze task"),
    }),
  );

  const handleSnooze = (date: Date) => {
    snoozeMutation.mutate({ id: taskId, snoozedUntil: date });
  };

  return (
    <div className="flex flex-col gap-1">
      <p className="px-2 py-1 text-xs font-medium text-[#8FA8A8]">
        Snooze until
      </p>
      <button
        onClick={() => handleSnooze(getLaterToday())}
        className={cn(
          "rounded-md px-3 py-2 text-left text-sm text-[#DCE4E4]",
          "transition-colors hover:bg-[#183F3F]",
        )}
      >
        Later Today
        <span className="ml-2 text-xs text-[#8FA8A8]">
          {getLaterToday().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </button>
      <button
        onClick={() => handleSnooze(getTomorrowAt9am())}
        className={cn(
          "rounded-md px-3 py-2 text-left text-sm text-[#DCE4E4]",
          "transition-colors hover:bg-[#183F3F]",
        )}
      >
        Tomorrow
        <span className="ml-2 text-xs text-[#8FA8A8]">9:00 AM</span>
      </button>
      <button
        onClick={() => handleSnooze(getNextMondayAt9am())}
        className={cn(
          "rounded-md px-3 py-2 text-left text-sm text-[#DCE4E4]",
          "transition-colors hover:bg-[#183F3F]",
        )}
      >
        Next Week
        <span className="ml-2 text-xs text-[#8FA8A8]">Mon 9:00 AM</span>
      </button>
      <div className="my-1 border-t border-[#164B49]" />
      {showCustom ? (
        <SnoozeCustomPicker onSnooze={handleSnooze} />
      ) : (
        <button
          onClick={() => setShowCustom(true)}
          className={cn(
            "rounded-md px-3 py-2 text-left text-sm text-[#DCE4E4]",
            "transition-colors hover:bg-[#183F3F]",
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

function SnoozePill({ taskId }: { taskId: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md",
            "transition-all hover:border-[#21716C]",
            "focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
            "border-[#164B49] bg-[#102A2A]/80 text-[#DCE4E4] hover:bg-[#102A2A]",
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

// --- Recurrence pill for create/edit ---

type RecurrenceRuleType =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "custom"
  | null;

const RECURRENCE_OPTIONS: { label: string; value: RecurrenceRuleType }[] = [
  { label: "None", value: null },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

function getRecurrenceUnitLabel(rule: RecurrenceRuleType): string {
  switch (rule) {
    case "daily":
      return "day";
    case "weekly":
      return "week";
    case "monthly":
      return "month";
    case "yearly":
      return "year";
    default:
      return "";
  }
}

function RecurrencePill({
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
  const displayLabel = rule
    ? interval === 1
      ? rule.charAt(0).toUpperCase() + rule.slice(1)
      : `Every ${interval} ${unitLabel}s`
    : "Repeat";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md",
            "transition-all hover:border-[#21716C]",
            "focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
            rule
              ? "border-[#50C878]/50 bg-[#50C878]/10 text-[#50C878]"
              : "border-[#164B49] bg-[#102A2A]/80 text-[#DCE4E4] hover:bg-[#102A2A]",
          )}
          disabled={disabled}
        >
          <Repeat className="h-3.5 w-3.5" />
          {displayLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="end">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-[#8FA8A8]">Recurrence</p>
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
                    ? "border-[#50C878]/50 bg-[#50C878]/10 text-[#50C878]"
                    : "border-[#164B49] bg-[#102A2A]/80 text-[#DCE4E4] hover:border-[#21716C] hover:bg-[#102A2A]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {rule && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8FA8A8]">Every</span>
              <button
                onClick={() => onIntervalChange(Math.max(1, interval - 1))}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md",
                  "border border-[#164B49] bg-[#102A2A] text-[#DCE4E4]",
                  "transition-colors hover:border-[#21716C] hover:bg-[#183F3F]",
                  "disabled:opacity-50",
                )}
                disabled={interval <= 1}
                aria-label="Decrease interval"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="min-w-[1.5rem] text-center text-sm font-medium text-[#DCE4E4]">
                {interval}
              </span>
              <button
                onClick={() => onIntervalChange(Math.min(365, interval + 1))}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md",
                  "border border-[#164B49] bg-[#102A2A] text-[#DCE4E4]",
                  "transition-colors hover:border-[#21716C] hover:bg-[#183F3F]",
                  "disabled:opacity-50",
                )}
                disabled={interval >= 365}
                aria-label="Increase interval"
              >
                <Plus className="h-3 w-3" />
              </button>
              <span className="text-xs text-[#8FA8A8]">
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

// --- Inline create task row ---

export function InlineCreateTask({
  initialDueDate,
}: {
  initialDueDate?: Date;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { setIsCreating } = useCreateTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(initialDueDate);
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [reminderAt, setReminderAt] = useState<Date | undefined>();
  const [listId, setListId] = useState<string | undefined>();
  const [recurrenceRule, setRecurrenceRule] =
    useState<RecurrenceRuleType>(null);
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [pendingSubtasks, setPendingSubtasks] = useState<
    { localId: string; title: string }[]
  >([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const newSubtaskInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: categories } = useQuery({
    ...trpc.category.all.queryOptions(),
    enabled: !!session?.user,
  });

  const createTask = useMutation(
    trpc.task.create.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.task.pathFilter()),
          queryClient.invalidateQueries(trpc.taskList.pathFilter()),
        ]);
        setIsCreating(false);
        toast.success("Task created!");
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in"
            : "Failed to create task",
        );
      },
    }),
  );

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    createTask.mutate({
      title: title.trim(),
      description: description || undefined,
      dueDate,
      categoryId,
      priority,
      reminderAt,
      listId,
      recurrenceRule: recurrenceRule ?? undefined,
      recurrenceInterval: recurrenceRule ? recurrenceInterval : undefined,
      subtasks:
        pendingSubtasks.length > 0
          ? pendingSubtasks.map((s) => ({ title: s.title }))
          : undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsCreating(false);
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  // Close on click outside (but not on portal-rendered popovers/selects)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Ignore clicks on any Radix UI portal content (popovers, selects, dialogs, menus)
      if (
        target.closest("[data-radix-popper-content-wrapper]") ||
        target.closest("[data-radix-select-viewport]") ||
        target.closest("[data-radix-dismissable-layer]") ||
        target.closest("[role='dialog']") ||
        target.closest("[role='listbox']") ||
        target.closest("[role='menu']")
      ) {
        return;
      }
      // Also ignore if any Radix portal content exists in the DOM
      // (catches overlay/backdrop clicks that dismiss selects/popovers)
      if (
        document.querySelector("[data-radix-popper-content-wrapper]") ||
        document.querySelector("[data-radix-select-content]")
      ) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsCreating(false);
      }
    };
    // Use pointerdown instead of mousedown for better Radix compatibility
    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, [setIsCreating]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative overflow-hidden rounded-2xl transition-all duration-300",
        "border-primary/50 border bg-[#102A2A]/80 backdrop-blur-sm",
      )}
    >
      {/* Top row with inline title input */}
      <div className="flex flex-row items-center gap-2 p-3 pb-0 sm:gap-3 sm:px-4 sm:pt-4 sm:pb-0">
        {/* Inline title input */}
        <div className="min-w-0 grow">
          <Input
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="New task..."
            className={cn(
              "border-[#164B49] bg-[#1a2f2e] text-white placeholder:text-[#8FA8A8]",
              "focus:border-[#21716C] focus:ring-2 focus:ring-[#21716C]/20",
              "rounded-md px-2 py-1 text-sm font-medium sm:px-3 sm:py-1.5 sm:text-lg",
              "w-full sm:max-w-md",
            )}
            aria-label="New task title"
            disabled={createTask.isPending}
          />
        </div>
      </div>

      {/* Expanded area (always open for create) */}
      <div className="mx-3 mt-2 border-t border-[#164B49] sm:mx-4 sm:mt-3" />
      <div className="px-3 pt-2 pb-3 sm:px-4 sm:pt-3 sm:pb-4">
        {/* Description textarea */}
        <div className="mt-1 max-w-2xl">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsCreating(false);
            }}
            placeholder="Description (optional)"
            rows={2}
            className={cn(
              "w-full resize-y border border-[#164B49] bg-[#1a2f2e] text-[#DCE4E4] placeholder:text-[#8FA8A8]",
              "focus:border-[#21716C] focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
              "rounded-md px-3 py-2 text-sm",
            )}
            aria-label="New task description"
            disabled={createTask.isPending}
          />
        </div>

        {/* Subtasks */}
        <div className="mt-2 max-w-2xl">
          <p className="mb-1.5 text-xs font-semibold tracking-wider text-[#8FA8A8] uppercase">
            Subtasks
            {pendingSubtasks.length > 0 && (
              <span className="text-primary ml-1 font-normal">
                ({pendingSubtasks.length})
              </span>
            )}
          </p>

          {pendingSubtasks.length > 0 && (
            <div className="mb-2 space-y-1">
              {pendingSubtasks.map((ps) => (
                <div
                  key={ps.localId}
                  className="flex items-center gap-2 rounded-lg border border-[#164B49] bg-[#0A1A1A] px-3 py-2"
                >
                  <div className="size-4 shrink-0 rounded border border-[#164B49]" />
                  <span className="flex-1 truncate text-sm text-[#DCE4E4]">
                    {ps.title}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingSubtasks((prev) =>
                        prev.filter((s) => s.localId !== ps.localId),
                      )
                    }
                    className="shrink-0 text-[#8FA8A8] transition-colors hover:text-red-400"
                    aria-label={`Remove subtask: ${ps.title}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              ref={newSubtaskInputRef}
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  const trimmed = newSubtaskTitle.trim();
                  if (trimmed) {
                    setPendingSubtasks((prev) => [
                      ...prev,
                      { localId: `pending-${Date.now()}`, title: trimmed },
                    ]);
                    setNewSubtaskTitle("");
                  }
                } else if (e.key === "Escape") {
                  setIsCreating(false);
                }
              }}
              placeholder="Add a subtask..."
              className={cn(
                "border-[#164B49] bg-[#1a2f2e] text-[#DCE4E4] placeholder:text-[#8FA8A8]",
                "focus:border-[#21716C] focus:ring-2 focus:ring-[#21716C]/20",
                "rounded-md px-3 py-1.5 text-sm",
                "flex-1",
              )}
              aria-label="New subtask title"
              disabled={createTask.isPending}
            />
            {newSubtaskTitle.trim() && (
              <button
                type="button"
                onClick={() => {
                  const trimmed = newSubtaskTitle.trim();
                  if (trimmed) {
                    setPendingSubtasks((prev) => [
                      ...prev,
                      { localId: `pending-${Date.now()}`, title: trimmed },
                    ]);
                    setNewSubtaskTitle("");
                    newSubtaskInputRef.current?.focus();
                  }
                }}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                  "bg-[#50C878] text-[#0A1A1A] hover:bg-[#66D99A]",
                  "transition-colors",
                )}
                aria-label="Add subtask"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Field controls row + Save/Cancel */}
        <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-3">
          <PrioritySelectorPill
            value={priority}
            onChange={setPriority}
            disabled={createTask.isPending}
          />
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-2 rounded-full border border-[#164B49] bg-[#102A2A]/80 px-4 py-1.5 text-xs font-medium text-[#DCE4E4] backdrop-blur-md",
                  "transition-all hover:border-[#21716C] hover:bg-[#102A2A]",
                  "focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
                )}
                disabled={createTask.isPending}
              >
                <Calendar className="h-3.5 w-3.5" />
                {dueDate
                  ? new Date(dueDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Due date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex flex-col">
                <CalendarPicker date={dueDate} onDateChange={setDueDate} />
                {dueDate && (
                  <div className="border-t border-[#164B49] p-2">
                    <button
                      onClick={() => setDueDate(undefined)}
                      className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium",
                        "bg-[#102A2A] text-[#8FA8A8] hover:bg-[#183F3F] hover:text-[#DCE4E4]",
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
          <CategoryTreePicker
            categories={categories ?? []}
            value={categoryId}
            onChange={setCategoryId}
            disabled={createTask.isPending}
          />
          <ReminderPill
            value={reminderAt}
            onChange={setReminderAt}
            disabled={createTask.isPending}
          />
          <ListPickerPill
            value={listId}
            onChange={setListId}
            disabled={createTask.isPending}
          />
          <RecurrencePill
            rule={recurrenceRule}
            interval={recurrenceInterval}
            onRuleChange={setRecurrenceRule}
            onIntervalChange={setRecurrenceInterval}
            disabled={createTask.isPending}
          />

          {/* Save/Cancel inline */}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              disabled={createTask.isPending}
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-[#164B49] bg-[#102A2A]/80 px-4 py-1.5 text-xs font-medium text-[#8FA8A8] backdrop-blur-md",
                "transition-all hover:border-[#21716C] hover:bg-[#102A2A] hover:text-[#DCE4E4]",
              )}
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={createTask.isPending || !title.trim()}
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-[#50C878]/50 bg-[#50C878]/20 px-4 py-1.5 text-xs font-medium text-[#50C878] backdrop-blur-md",
                "transition-all hover:bg-[#50C878]/30",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {createTask.isPending ? (
                "..."
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Task list ---

export function TaskList() {
  const trpc = useTRPC();
  const { data: tasks } = useSuspenseQuery(trpc.task.all.queryOptions());
  const { isCreating } = useCreateTask();

  // Get selected category IDs from filter context
  const { effectiveCategoryIds } = useCategoryFilter();
  const { selectedPriorities } = usePriorityFilter();
  const { selectedListId } = useListFilter();
  const { viewMode } = useViewToggle();

  // Filter tasks based on selected categories, priorities, and list
  const filteredTasks = tasks.filter((task) => {
    // List filter
    if (selectedListId === "personal" && task.listId !== null) {
      return false;
    }
    if (
      selectedListId !== null &&
      selectedListId !== "personal" &&
      task.listId !== selectedListId
    ) {
      return false;
    }

    if (
      effectiveCategoryIds.length > 0 &&
      (!task.categoryId || !effectiveCategoryIds.includes(task.categoryId))
    ) {
      return false;
    }
    if (
      selectedPriorities.length > 0 &&
      (!task.priority ||
        !selectedPriorities.includes(task.priority as TaskPriority))
    ) {
      return false;
    }
    return true;
  });

  if (tasks.length === 0 && !isCreating) {
    return (
      <div className="relative flex w-full flex-col gap-4">
        <TaskCardSkeleton pulse={false} />
        <TaskCardSkeleton pulse={false} />
        <TaskCardSkeleton pulse={false} />

        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10">
          <p className="text-2xl font-bold text-white">No tasks yet</p>
        </div>
      </div>
    );
  }

  if (filteredTasks.length === 0 && !isCreating) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-xl font-semibold text-white">
          No tasks match the current filters
        </p>
        <p className="text-muted-foreground mt-2">
          Try adjusting your list, category, or priority filters
        </p>
      </div>
    );
  }

  if (viewMode === "calendar") {
    return <CalendarView tasks={filteredTasks} />;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {isCreating && <InlineCreateTask />}
      <AnimatePresence mode="popLayout">
        {filteredTasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 30,
              delay: i * 0.04,
            }}
            layout
          >
            <TaskCard task={task} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// --- Subtask section inside expanded task card ---

function SubtaskSection({
  task,
}: {
  task: RouterOutputs["task"]["all"][number];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const newInputRef = useRef<HTMLInputElement>(null);

  const subtasks = [...task.subtasks].sort((a, b) => a.sortOrder - b.sortOrder);

  const createSubtask = useMutation(
    trpc.subtask.create.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries(trpc.task.all.queryFilter());
        const prev = queryClient.getQueryData(trpc.task.all.queryKey());
        queryClient.setQueryData(trpc.task.all.queryKey(), (old) => {
          if (!old) return old;
          return old.map((t) =>
            t.id !== task.id
              ? t
              : {
                  ...t,
                  subtasks: [
                    ...t.subtasks,
                    {
                      id: crypto.randomUUID(),
                      taskId: task.id,
                      title: variables.title,
                      completed: false,
                      sortOrder: t.subtasks.length,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      completedAt: null,
                    },
                  ],
                },
          );
        });
        return { prev };
      },
      onError: (_err, _vars, context) => {
        if (context?.prev)
          queryClient.setQueryData(trpc.task.all.queryKey(), context.prev);
        toast.error("Failed to add subtask");
      },
      onSettled: async () => {
        await queryClient.invalidateQueries(trpc.task.pathFilter());
      },
    }),
  );

  const updateSubtask = useMutation(
    trpc.subtask.update.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries(trpc.task.all.queryFilter());
        const prev = queryClient.getQueryData(trpc.task.all.queryKey());
        queryClient.setQueryData(trpc.task.all.queryKey(), (old) => {
          if (!old) return old;
          return old.map((t) => {
            if (t.id !== task.id) return t;
            const updatedSubtasks = t.subtasks.map((s) =>
              s.id === variables.id
                ? {
                    ...s,
                    ...variables,
                    completedAt:
                      variables.completed === true
                        ? new Date()
                        : variables.completed === false
                          ? null
                          : s.completedAt,
                  }
                : s,
            );
            // Auto-complete/un-complete parent based on subtask states
            const allCompleted =
              updatedSubtasks.length > 0 &&
              updatedSubtasks.every((s) => s.completed);
            return {
              ...t,
              subtasks: updatedSubtasks,
              completed: allCompleted,
              completedAt: allCompleted
                ? (t.completedAt ?? new Date())
                : variables.completed === false
                  ? null
                  : t.completedAt,
            };
          });
        });
        return { prev };
      },
      onError: (_err, _vars, context) => {
        if (context?.prev)
          queryClient.setQueryData(trpc.task.all.queryKey(), context.prev);
        toast.error("Failed to update subtask");
      },
      onSettled: async () => {
        await queryClient.invalidateQueries(trpc.task.pathFilter());
      },
    }),
  );

  const deleteSubtask = useMutation(
    trpc.subtask.delete.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries(trpc.task.all.queryFilter());
        const prev = queryClient.getQueryData(trpc.task.all.queryKey());
        queryClient.setQueryData(trpc.task.all.queryKey(), (old) => {
          if (!old) return old;
          return old.map((t) =>
            t.id !== task.id
              ? t
              : {
                  ...t,
                  subtasks: t.subtasks.filter((s) => s.id !== variables.id),
                },
          );
        });
        return { prev };
      },
      onError: (_err, _vars, context) => {
        if (context?.prev)
          queryClient.setQueryData(trpc.task.all.queryKey(), context.prev);
        toast.error("Failed to delete subtask");
      },
      onSettled: async () => {
        await queryClient.invalidateQueries(trpc.task.pathFilter());
      },
    }),
  );

  const handleCreate = () => {
    const title = newTitle.trim();
    if (!title) return;
    createSubtask.mutate({ taskId: task.id, title });
    setNewTitle("");
    setTimeout(() => newInputRef.current?.focus(), 0);
  };

  const handleSaveEdit = (id: string) => {
    const title = editingTitle.trim();
    if (!title) {
      setEditingId(null);
      return;
    }
    updateSubtask.mutate({ id, title });
    setEditingId(null);
  };

  const hasDescription = !!task.description;

  return (
    <div
      className={cn(
        hasDescription ? "mt-4 border-t border-[#164B49]/40 pt-3" : "mt-1",
      )}
    >
      <p className="mb-2 text-[10px] font-semibold tracking-wider text-[#8FA8A8]/70 uppercase">
        Subtasks
        {subtasks.length > 0 && (
          <span className="ml-1.5 text-[#50C878]/70">
            {subtasks.filter((s) => s.completed).length}/{subtasks.length}
          </span>
        )}
      </p>
      <div className="flex flex-col gap-0.5 rounded-lg bg-white/[0.02] p-1">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="group/subtask flex items-center gap-2.5 rounded-md px-2 py-1 transition-colors hover:bg-white/5"
          >
            <Checkbox
              checked={subtask.completed}
              onCheckedChange={(checked) => {
                updateSubtask.mutate({
                  id: subtask.id,
                  completed: !!checked,
                });
              }}
              className={cn(
                "size-3.5 rounded border-2 transition-all",
                subtask.completed
                  ? "bg-primary border-primary text-black"
                  : "data-[state=checked]:bg-primary data-[state=checked]:border-primary border-white/30",
              )}
            />
            {editingId === subtask.id ? (
              <input
                autoFocus
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveEdit(subtask.id);
                  } else if (e.key === "Escape") {
                    setEditingId(null);
                  }
                }}
                onBlur={() => handleSaveEdit(subtask.id)}
                className="min-w-0 flex-1 bg-transparent text-sm text-[#DCE4E4] outline-none"
              />
            ) : (
              <button
                onClick={() => {
                  setEditingId(subtask.id);
                  setEditingTitle(subtask.title);
                }}
                className={cn(
                  "min-w-0 flex-1 truncate text-left text-[13px] transition-colors",
                  subtask.completed
                    ? "text-[#8FA8A8]/60 line-through"
                    : "text-[#E8F0F0]",
                )}
              >
                {subtask.title}
              </button>
            )}
            <button
              onClick={() => deleteSubtask.mutate({ id: subtask.id })}
              className="shrink-0 text-[#8FA8A8] opacity-0 transition-opacity group-hover/subtask:opacity-100 hover:text-red-400"
              aria-label={`Delete subtask: ${subtask.title}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {/* Add subtask input */}
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1">
          <Plus className="h-3.5 w-3.5 shrink-0 text-[#8FA8A8]/50" />
          <input
            ref={newInputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              } else if (e.key === "Escape") {
                setNewTitle("");
                newInputRef.current?.blur();
              }
            }}
            placeholder="Add a subtask..."
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[#DCE4E4] outline-none placeholder:text-[#8FA8A8]/50"
          />
        </div>
      </div>
    </div>
  );
}

// --- Task card ---

export function TaskCard(props: {
  task: RouterOutputs["task"]["all"][number];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimatingExpand, setIsAnimatingExpand] = useState(false);
  const [editedTitle, setEditedTitle] = useState(props.task.title);
  const [editedDescription, setEditedDescription] = useState(
    props.task.description ?? "",
  );
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(
    props.task.dueDate ?? undefined,
  );
  const [editedCategoryId, setEditedCategoryId] = useState<string | undefined>(
    props.task.categoryId ?? undefined,
  );
  const [editedPriority, setEditedPriority] = useState<TaskPriority>(
    (props.task.priority ?? "medium") as TaskPriority,
  );
  const [editedReminderAt, setEditedReminderAt] = useState<Date | undefined>(
    props.task.reminderAt ?? undefined,
  );
  const [editedListId, setEditedListId] = useState<string | undefined>(
    props.task.listId ?? undefined,
  );
  const [editedRecurrenceRule, setEditedRecurrenceRule] =
    useState<RecurrenceRuleType>(
      (props.task.recurrenceRule as RecurrenceRuleType) ?? null,
    );
  const [editedRecurrenceInterval, setEditedRecurrenceInterval] = useState(
    props.task.recurrenceInterval ?? 1,
  );
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories for the select dropdown (only when user is logged in)
  const { data: categories } = useQuery({
    ...trpc.category.all.queryOptions(),
    enabled: !!session?.user,
  });

  const updateTask = useMutation(
    trpc.task.update.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries(trpc.task.all.queryFilter());
        const previousTasks = queryClient.getQueryData(
          trpc.task.all.queryKey(),
        );
        queryClient.setQueryData(trpc.task.all.queryKey(), (old) => {
          if (!old) return old;
          return old.map((task) =>
            task.id === variables.id ? { ...task, ...variables } : task,
          );
        });
        return { previousTasks };
      },
      onError: (err, variables, context) => {
        if (context?.previousTasks) {
          queryClient.setQueryData(
            trpc.task.all.queryKey(),
            context.previousTasks,
          );
        }
        toast.error("Failed to update task");
      },
      onSettled: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.task.pathFilter()),
          queryClient.invalidateQueries(trpc.taskList.pathFilter()),
        ]);
      },
    }),
  );

  const deleteTask = useMutation(
    trpc.task.delete.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.task.pathFilter()),
          queryClient.invalidateQueries(trpc.taskList.pathFilter()),
        ]);
        toast.success("Task deleted");
      },
    }),
  );

  const handleToggleComplete = () => {
    updateTask.mutate({
      id: props.task.id,
      completed: !props.task.completed,
    });
  };

  const handleEditClick = () => {
    setEditedTitle(props.task.title);
    setEditedDescription(props.task.description ?? "");
    setEditedDueDate(props.task.dueDate ?? undefined);
    setEditedCategoryId(props.task.categoryId ?? undefined);
    setEditedPriority((props.task.priority ?? "medium") as TaskPriority);
    setEditedReminderAt(props.task.reminderAt ?? undefined);
    setEditedListId(props.task.listId ?? undefined);
    setEditedRecurrenceRule(
      (props.task.recurrenceRule as RecurrenceRuleType) ?? null,
    );
    setEditedRecurrenceInterval(props.task.recurrenceInterval ?? 1);
    setIsExpanded(true);
    setIsEditing(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const handleSave = async () => {
    // Validate
    const validation = EditTaskSchema.safeParse({
      title: editedTitle,
      description: editedDescription,
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      toast.error(firstError?.message ?? "Validation failed");
      return;
    }

    try {
      await updateTask.mutateAsync({
        id: props.task.id,
        title: editedTitle,
        description: editedDescription || undefined,
        dueDate: editedDueDate ?? null,
        categoryId: editedCategoryId ?? null,
        priority: editedPriority,
        reminderAt: editedReminderAt ?? null,
        listId: editedListId ?? null,
        recurrenceRule: editedRecurrenceRule ?? null,
        recurrenceInterval: editedRecurrenceRule
          ? editedRecurrenceInterval
          : null,
      });
      setIsEditing(false);
      setIsExpanded(false);
      toast.success("Task updated!");
    } catch {
      // Error is already handled in mutation onError
    }
  };

  const handleCancel = () => {
    setEditedTitle(props.task.title);
    setEditedDescription(props.task.description ?? "");
    setEditedDueDate(props.task.dueDate ?? undefined);
    setEditedCategoryId(props.task.categoryId ?? undefined);
    setEditedPriority((props.task.priority ?? "medium") as TaskPriority);
    setEditedReminderAt(props.task.reminderAt ?? undefined);
    setEditedListId(props.task.listId ?? undefined);
    setEditedRecurrenceRule(
      (props.task.recurrenceRule as RecurrenceRuleType) ?? null,
    );
    setEditedRecurrenceInterval(props.task.recurrenceInterval ?? 1);
    setIsEditing(false);
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSave();
    }
  };

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing]);

  const editedCategory = categories?.find((c) => c.id === editedCategoryId);
  const hasChanges =
    editedTitle !== props.task.title ||
    editedDescription !== (props.task.description ?? "") ||
    editedDueDate?.getTime() !== props.task.dueDate?.getTime() ||
    editedCategoryId !== props.task.categoryId ||
    editedPriority !== (props.task.priority ?? "medium") ||
    editedReminderAt?.getTime() !== props.task.reminderAt?.getTime() ||
    (editedListId ?? null) !== (props.task.listId ?? null) ||
    (editedRecurrenceRule ?? null) !== (props.task.recurrenceRule ?? null) ||
    editedRecurrenceInterval !== (props.task.recurrenceInterval ?? 1);

  // Determine if task is overdue (past due date or overdue reminder, and not completed)
  const isDueDateOverdue =
    !props.task.completed &&
    !!props.task.dueDate &&
    new Date(props.task.dueDate) < new Date();
  const isReminderOverdue =
    !props.task.completed &&
    !!props.task.reminderAt &&
    getReminderStatus(
      props.task.reminderAt,
      props.task.reminderSentAt ?? null,
    ) === "overdue";
  const isOverdue = isDueDateOverdue || isReminderOverdue;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl transition-all duration-300 sm:rounded-2xl",
        "border border-[#164B49] bg-[#102A2A]/80 backdrop-blur-sm",
        props.task.completed
          ? "border-primary/50 shadow-glow bg-primary/5 opacity-50"
          : isOverdue
            ? "hover:shadow-glowHover border-amber-500/20 bg-[rgba(255,165,0,0.08)] hover:border-amber-500/30 hover:bg-[rgba(255,165,0,0.12)]"
            : "hover:shadow-glowHover hover:border-[#21716C] hover:bg-[#102A2A]",
      )}
    >
      {/* Collapsed row */}
      <div
        className={cn(
          "flex flex-row items-center gap-2 p-3 sm:gap-4 sm:p-6",
          !isEditing && "cursor-pointer",
        )}
        onClick={() => {
          if (!isEditing) {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={props.task.completed}
            onCheckedChange={handleToggleComplete}
            disabled={updateTask.isPending || isEditing}
            className={cn(
              "size-4 shrink-0 rounded-full border-2 transition-all sm:size-6",
              props.task.completed
                ? "bg-primary border-primary text-black"
                : "data-[state=checked]:bg-primary data-[state=checked]:border-primary border-white/30",
            )}
          />
        </div>

        {/* Chevron toggle */}
        <div className="shrink-0 text-[#8FA8A8]" aria-hidden="true">
          <ChevronRight
            className={cn(
              "h-3 w-3 transition-transform duration-300 sm:h-4 sm:w-4",
              isExpanded && "rotate-90",
            )}
          />
        </div>

        <div className="min-w-0 grow space-y-1 sm:space-y-2">
          {/* Title - inline editable */}
          {isEditing ? (
            <Input
              ref={titleInputRef}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleKeyDown}
              placeholder="Task title"
              className={cn(
                "border-[#164B49] bg-[#102A2A] text-white placeholder:text-[#8FA8A8]",
                "focus:border-[#21716C] focus:ring-2 focus:ring-[#21716C]/20",
                "rounded-md px-2 py-1 text-sm font-medium sm:px-3 sm:py-1.5 sm:text-lg",
                "max-w-full sm:max-w-md",
              )}
              aria-label="Edit task title"
              disabled={updateTask.isPending}
            />
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick();
              }}
              disabled={updateTask.isPending}
              className={cn(
                "group/title -m-1 rounded-md p-1 text-left transition-all duration-200",
                "hover:bg-white/5 focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
              aria-label={`Edit task title. Current value: ${props.task.title}`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2
                  className={cn(
                    "truncate text-sm font-medium transition-colors sm:text-lg",
                    props.task.completed
                      ? "text-white/50 line-through"
                      : "text-white",
                  )}
                >
                  {props.task.title}
                </h2>
                {props.task.subtasks.length > 0 && (
                  <span className="shrink-0 text-sm text-[#9CA3AF]">
                    {props.task.subtasks.filter((s) => s.completed).length}/
                    {props.task.subtasks.length}
                  </span>
                )}
                <Pencil className="hidden h-4 w-4 text-[#50C878]/60 opacity-0 transition-opacity group-hover/title:opacity-100 sm:block" />
              </div>
            </button>
          )}
          {/* Description snippet - view mode */}
          {!isExpanded && props.task.description ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick();
              }}
              disabled={updateTask.isPending}
              className={cn(
                "group/desc -m-1 rounded-md p-1 text-left transition-all duration-200",
                "hover:bg-white/5 focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "hidden sm:block sm:max-w-xs lg:max-w-sm",
              )}
              aria-label={`Edit task description. Current value: ${props.task.description}`}
            >
              <div className="flex items-center gap-2">
                <p className="truncate text-sm text-[#C8D6D6]">
                  {props.task.description}
                </p>
                <Pencil className="h-3 w-3 shrink-0 text-[#50C878]/60 opacity-0 transition-opacity group-hover/desc:opacity-100" />
              </div>
            </button>
          ) : null}
        </div>

        {/* Priority badge - collapsed row - hidden on mobile, show on hover on desktop */}
        {!isExpanded && (
          <div
            className={cn(
              "z-10 shrink-0 transition-transform duration-300 ease-in-out",
              "hidden sm:block",
              isAnimatingExpand
                ? "translate-x-[600px]"
                : "translate-x-0 sm:group-hover:-translate-x-48",
            )}
          >
            <PriorityBadge priority={props.task.priority} variant="compact" />
          </div>
        )}

        {/* Due Date - collapsed row - hidden on mobile */}
        {!isExpanded && editedDueDate ? (
          <div
            className={cn(
              "z-10 hidden shrink-0 transition-transform duration-300 ease-in-out sm:block",
              isAnimatingExpand
                ? "translate-x-[600px]"
                : "translate-x-0 sm:group-hover:-translate-x-48",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium backdrop-blur-md sm:gap-2 sm:px-4 sm:py-1.5",
                isDueDateOverdue
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : "border-[#164B49] bg-[#102A2A]/80 text-[#DCE4E4]",
              )}
            >
              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden lg:inline">
                {new Date(editedDueDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="lg:hidden">
                {new Date(editedDueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {isDueDateOverdue && (
                <span className="hidden font-semibold sm:inline">Overdue</span>
              )}
            </div>
          </div>
        ) : null}

        {/* Category - collapsed row - hidden on mobile */}
        {!isExpanded && editedCategory ? (
          <div
            className={cn(
              "z-10 hidden shrink-0 transition-transform duration-300 ease-in-out sm:block",
              isAnimatingExpand
                ? "translate-x-[600px]"
                : "translate-x-0 sm:group-hover:-translate-x-48",
            )}
          >
            <div
              className="max-w-[100px] truncate rounded-full border px-2 py-1 text-xs font-medium backdrop-blur-md sm:max-w-none sm:px-4 sm:py-1.5"
              style={{
                backgroundColor: `${editedCategory.color}60`,
                borderColor: `${editedCategory.color}80`,
                color: editedCategory.color,
              }}
            >
              {editedCategory.name}
            </div>
          </div>
        ) : null}

        {/* Reminder - collapsed row - hidden on mobile (hide overdue badge for completed tasks) */}
        {!isExpanded &&
        props.task.reminderAt &&
        !(
          props.task.completed &&
          getReminderStatus(
            props.task.reminderAt,
            props.task.reminderSentAt ?? null,
          ) === "overdue"
        ) ? (
          <div
            className={cn(
              "z-10 hidden shrink-0 transition-transform duration-300 ease-in-out sm:block",
              isAnimatingExpand
                ? "translate-x-[600px]"
                : "translate-x-0 sm:group-hover:-translate-x-48",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium backdrop-blur-md sm:gap-2 sm:px-4 sm:py-1.5",
                getReminderBadgeClasses(
                  props.task.reminderAt,
                  props.task.reminderSentAt,
                ),
              )}
            >
              <Bell className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">
                {formatReminder(
                  props.task.reminderAt,
                  props.task.reminderSentAt,
                )}
              </span>
            </div>
          </div>
        ) : null}

        {/* List badge - collapsed row - hidden on mobile */}
        {!isExpanded && props.task.list ? (
          <div
            className={cn(
              "z-10 hidden shrink-0 transition-transform duration-300 ease-in-out sm:block",
              isAnimatingExpand
                ? "translate-x-[600px]"
                : "translate-x-0 sm:group-hover:-translate-x-48",
            )}
          >
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-[#8FA8A8] backdrop-blur-md sm:gap-1.5 sm:px-3 sm:py-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2"
                style={{
                  backgroundColor: props.task.list.color ?? "#8FA8A8",
                }}
              />
              <span className="max-w-[80px] truncate sm:max-w-none">
                {props.task.list.name}
              </span>
            </div>
          </div>
        ) : null}

        {/* Recurrence - collapsed row - hidden on mobile */}
        {!isExpanded && props.task.recurrenceRule ? (
          <div
            className={cn(
              "z-10 hidden shrink-0 transition-transform duration-300 ease-in-out sm:block",
              isAnimatingExpand
                ? "translate-x-[600px]"
                : "translate-x-0 sm:group-hover:-translate-x-48",
            )}
          >
            <div className="flex items-center gap-1.5 rounded-full border border-[#50C878]/30 bg-[#50C878]/10 px-2 py-1 text-xs font-medium text-[#50C878] backdrop-blur-md sm:gap-2 sm:px-4 sm:py-1.5">
              <Repeat className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">
                {(props.task.recurrenceInterval ?? 1) === 1
                  ? props.task.recurrenceRule.charAt(0).toUpperCase() +
                    props.task.recurrenceRule.slice(1)
                  : `Every ${props.task.recurrenceInterval} ${getRecurrenceUnitLabel(props.task.recurrenceRule as RecurrenceRuleType)}s`}
              </span>
            </div>
          </div>
        ) : null}

        {/* Hover Actions - only in collapsed non-editing state - hidden on mobile */}
        {!isExpanded && !isEditing && (
          <div
            className={cn(
              "absolute inset-y-0 right-0 z-20 hidden transition-transform duration-300 ease-in-out sm:flex",
              isAnimatingExpand
                ? "translate-x-full"
                : "translate-x-full group-hover:translate-x-0",
            )}
          >
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-full w-12 rounded-none bg-amber-500 text-white hover:bg-amber-600 hover:text-white sm:w-16"
                  aria-label="Snooze task"
                >
                  <AlarmClock className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="sr-only">Snooze</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="end">
                <SnoozePopoverContent taskId={props.task.id} />
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              className="h-full w-12 rounded-none bg-blue-500 text-white hover:bg-blue-600 hover:text-white sm:w-16"
              onClick={handleEditClick}
              aria-label="Edit task"
            >
              <Pencil className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-full w-12 rounded-none bg-red-500 text-white hover:bg-red-600 hover:text-white sm:w-16"
              onClick={() => deleteTask.mutate(props.task.id)}
              disabled={deleteTask.isPending}
              aria-label="Delete task"
            >
              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        )}
      </div>

      {/* Expanded area */}
      <AnimatePresence
        onExitComplete={() => setIsAnimatingExpand(false)}
      >
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { type: "spring", stiffness: 400, damping: 35 },
              opacity: { duration: 0.2 },
            }}
            onAnimationStart={() => setIsAnimatingExpand(true)}
            className="overflow-hidden"
          >
          <div className="space-y-0 px-3 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-6">
            {/* Description section */}
            {(isEditing || props.task.description) && (
              <div className="border-t border-[#164B49]/60 pt-3">
                {isEditing ? (
                  <div className="max-w-2xl">
                    <label className="mb-1.5 block text-[10px] font-semibold tracking-wider text-[#8FA8A8]/70 uppercase">
                      Description
                    </label>
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") handleCancel();
                        // Don't handle Enter in textarea — allow newlines
                      }}
                      placeholder="Add a description..."
                      rows={3}
                      className={cn(
                        "w-full resize-y border border-[#164B49] bg-[#102A2A] text-[#DCE4E4] placeholder:text-[#8FA8A8]",
                        "focus:border-[#21716C] focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
                        "rounded-lg px-3 py-2.5 text-sm leading-relaxed",
                      )}
                      aria-label="Edit task description"
                      disabled={updateTask.isPending}
                    />
                  </div>
                ) : props.task.description ? (
                  <p className="max-w-2xl text-sm leading-relaxed whitespace-pre-wrap text-[#C8D6D6]">
                    {props.task.description}
                  </p>
                ) : null}
              </div>
            )}

            {/* Subtask section */}
            <SubtaskSection task={props.task} />

            {/* Field controls row */}
            {isEditing && (
              <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4 sm:gap-3">
                <PrioritySelectorPill
                  value={editedPriority}
                  onChange={setEditedPriority}
                  disabled={updateTask.isPending}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-2 rounded-full border border-[#164B49] bg-[#102A2A]/80 px-4 py-1.5 text-xs font-medium text-[#DCE4E4] backdrop-blur-md",
                        "transition-all hover:border-[#21716C] hover:bg-[#102A2A]",
                        "focus:ring-2 focus:ring-[#21716C]/20 focus:outline-none",
                      )}
                      disabled={updateTask.isPending}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      {editedDueDate
                        ? new Date(editedDueDate).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Set due date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex flex-col">
                      <CalendarPicker
                        date={editedDueDate}
                        onDateChange={setEditedDueDate}
                      />
                      {editedDueDate && (
                        <div className="border-t border-[#164B49] p-2">
                          <button
                            onClick={() => setEditedDueDate(undefined)}
                            className={cn(
                              "flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium",
                              "bg-[#102A2A] text-[#8FA8A8] hover:bg-[#183F3F] hover:text-[#DCE4E4]",
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
                <CategoryTreePicker
                  categories={categories ?? []}
                  value={editedCategoryId}
                  onChange={setEditedCategoryId}
                  disabled={updateTask.isPending}
                />
                <ReminderPill
                  value={editedReminderAt}
                  onChange={setEditedReminderAt}
                  disabled={updateTask.isPending}
                />
                <ListPickerPill
                  value={editedListId}
                  onChange={setEditedListId}
                  disabled={updateTask.isPending}
                />
                <RecurrencePill
                  rule={editedRecurrenceRule}
                  interval={editedRecurrenceInterval}
                  onRuleChange={setEditedRecurrenceRule}
                  onIntervalChange={setEditedRecurrenceInterval}
                  disabled={updateTask.isPending}
                />
                <SnoozePill taskId={props.task.id} />
              </div>
            )}

            {/* Read-only badges when expanded but not editing */}
            {!isEditing && (
              <div className="mt-4 border-t border-[#164B49]/40 pt-3">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <PriorityBadge
                    priority={props.task.priority}
                    variant="compact"
                  />
                  {props.task.dueDate && (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                        isDueDateOverdue
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border-[#164B49] bg-[#102A2A]/80 text-[#8FA8A8]",
                      )}
                    >
                      <Calendar className="h-3 w-3" />
                      {new Date(props.task.dueDate).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                      {isDueDateOverdue && (
                        <span className="font-semibold text-amber-400">
                          Overdue
                        </span>
                      )}
                    </div>
                  )}
                  {editedCategory && (
                    <div
                      className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
                      style={{
                        backgroundColor: `${editedCategory.color}20`,
                        borderColor: `${editedCategory.color}40`,
                        color: editedCategory.color,
                      }}
                    >
                      {editedCategory.name}
                    </div>
                  )}
                  {props.task.reminderAt &&
                    !(
                      props.task.completed &&
                      getReminderStatus(
                        props.task.reminderAt,
                        props.task.reminderSentAt ?? null,
                      ) === "overdue"
                    ) && (
                      <div
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                          getReminderBadgeClasses(
                            props.task.reminderAt,
                            props.task.reminderSentAt,
                          ),
                        )}
                      >
                        <Bell className="h-3 w-3" />
                        {formatReminder(
                          props.task.reminderAt,
                          props.task.reminderSentAt,
                        )}
                      </div>
                    )}
                  {props.task.recurrenceRule && (
                    <div className="flex items-center gap-1.5 rounded-full border border-[#50C878]/20 bg-[#50C878]/5 px-2.5 py-1 text-[11px] font-medium text-[#50C878]">
                      <Repeat className="h-3 w-3" />
                      {(props.task.recurrenceInterval ?? 1) === 1
                        ? props.task.recurrenceRule.charAt(0).toUpperCase() +
                          props.task.recurrenceRule.slice(1)
                        : `Every ${props.task.recurrenceInterval} ${getRecurrenceUnitLabel(props.task.recurrenceRule as RecurrenceRuleType)}s`}
                    </div>
                  )}
                  {props.task.list && (
                    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#8FA8A8]">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: props.task.list.color ?? "#8FA8A8",
                        }}
                      />
                      {props.task.list.name}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons - expanded non-editing view */}
            {!isEditing && (
              <div className="mt-3 flex items-center justify-end gap-1 border-t border-[#164B49]/40 pt-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#8FA8A8] transition-colors hover:bg-amber-500/10 hover:text-amber-400"
                      aria-label="Snooze task"
                    >
                      <AlarmClock className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Snooze</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="end">
                    <SnoozePopoverContent taskId={props.task.id} />
                  </PopoverContent>
                </Popover>
                <button
                  onClick={handleEditClick}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#8FA8A8] transition-colors hover:bg-[#50C878]/10 hover:text-[#50C878]"
                  aria-label="Edit task"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => deleteTask.mutate(props.task.id)}
                  disabled={deleteTask.isPending}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#8FA8A8] transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                  aria-label="Delete task"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            )}

            {/* Save/Cancel buttons inside expanded area */}
            {isEditing && (
              <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-[#164B49]/40 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={updateTask.isPending}
                  className="h-8 px-3 text-xs text-[#8FA8A8] hover:bg-[#183F3F] hover:text-[#DCE4E4]"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={
                    updateTask.isPending || !hasChanges || !editedTitle.trim()
                  }
                  className={cn(
                    "h-8 bg-[#50C878] px-4 text-xs text-[#0A1A1A] hover:bg-[#66D99A]",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  {updateTask.isPending ? (
                    "..."
                  ) : (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TaskCardSkeleton(props: { pulse?: boolean }) {
  const { pulse = true } = props;
  return (
    <div className="bg-muted flex flex-row items-center gap-4 rounded-lg p-4">
      <div
        className={cn("h-5 w-5 rounded bg-current", pulse && "animate-pulse")}
      />
      <div className="grow">
        <h2
          className={cn(
            "bg-primary w-1/4 rounded text-2xl font-bold",
            pulse && "animate-pulse",
          )}
        >
          &nbsp;
        </h2>
      </div>
    </div>
  );
}
