"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock,
  Check,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import type { RouterOutputs } from "@acme/api";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Checkbox } from "@acme/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@acme/ui/dropdown-menu";
import { Input } from "@acme/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";
import { CategoryTreePicker } from "../category-tree-picker";
import { ListPickerPill } from "../list-picker-pill";
import { PrioritySelectorPill } from "../priority";
import { DueDatePill } from "./DueDatePill";
import { useSnoozeMutation } from "./hooks/useSnoozeMutation";
import { useTaskEditForm } from "./hooks/useTaskEditForm";
import { useTaskMutations } from "./hooks/useTaskMutations";
import { RecurrencePill } from "./RecurrencePill";
import { getReminderStatus } from "./reminder-utils";
import { ReminderPill } from "./ReminderPill";
import {
  getLaterToday,
  getNextMondayAt9am,
  getTomorrowAt9am,
} from "./snooze-utils";
import { SnoozePill, SnoozePopoverContent } from "./SnoozePill";
import { SubtaskSection } from "./SubtaskSection";
import { CollapsedHoverBadges, ExpandedReadonlyBadges } from "./TaskCardBadges";

// --- Task card ---

export function TaskCard(props: {
  task: RouterOutputs["task"]["all"][number];
}) {
  const trpc = useTRPC();
  const { data: session } = useSession();

  const { updateTask, deleteTask } = useTaskMutations(props.task.id);
  const snoozeTask = useSnoozeMutation();

  const {
    isEditing,
    isExpanded,
    setIsExpanded,
    isAnimatingExpand,
    setIsAnimatingExpand,
    editedTitle,
    setEditedTitle,
    editedDescription,
    setEditedDescription,
    editedDueDate,
    setEditedDueDate,
    editedCategoryId,
    setEditedCategoryId,
    editedPriority,
    setEditedPriority,
    editedReminderAt,
    setEditedReminderAt,
    editedListId,
    setEditedListId,
    editedRecurrenceRule,
    setEditedRecurrenceRule,
    editedRecurrenceInterval,
    setEditedRecurrenceInterval,
    titleInputRef,
    handleToggleComplete,
    handleEditClick,
    handleSave,
    handleCancel,
    handleKeyDown,
    hasChanges,
  } = useTaskEditForm(props.task, updateTask);

  // Fetch categories for the select dropdown (only when user is logged in)
  const { data: categories } = useQuery({
    ...trpc.category.all.queryOptions(),
    enabled: !!session?.user,
  });

  const editedCategory = categories?.find((c) => c.id === editedCategoryId);

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
        "border-border-strong bg-surface-2/80 border backdrop-blur-sm",
        props.task.completed
          ? "border-primary/50 shadow-glow bg-primary/5 opacity-50"
          : isOverdue
            ? "hover:shadow-glowHover border-amber-500/20 bg-[rgba(255,165,0,0.08)] hover:border-amber-500/30 hover:bg-[rgba(255,165,0,0.12)]"
            : "hover:shadow-glowHover hover:border-border-focus hover:bg-surface-2",
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
        <div className="text-muted-foreground shrink-0" aria-hidden="true">
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
                "border-border-strong bg-surface-2 placeholder:text-muted-foreground text-white",
                "focus:border-border-focus focus:ring-border-focus/20 focus:ring-2",
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
                "focus:ring-border-focus/20 hover:bg-white/5 focus:ring-2 focus:outline-none",
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
                  <span className="text-muted-foreground shrink-0 text-sm">
                    {props.task.subtasks.filter((s) => s.completed).length}/
                    {props.task.subtasks.length}
                  </span>
                )}
                <Pencil className="text-primary/60 hidden h-4 w-4 opacity-0 transition-opacity group-hover/title:opacity-100 sm:block" />
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
                "focus:ring-border-focus/20 hover:bg-white/5 focus:ring-2 focus:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "hidden sm:block sm:max-w-xs lg:max-w-sm",
              )}
              aria-label={`Edit task description. Current value: ${props.task.description}`}
            >
              <div className="flex items-center gap-2">
                <p className="truncate text-sm text-[#C8D6D6]">
                  {props.task.description}
                </p>
                <Pencil className="text-primary/60 h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/desc:opacity-100" />
              </div>
            </button>
          ) : null}
        </div>

        {/* Collapsed-row hover badges (desktop only) */}
        {!isExpanded && (
          <CollapsedHoverBadges
            task={props.task}
            editedDueDate={editedDueDate}
            editedCategory={editedCategory}
            isAnimatingExpand={isAnimatingExpand}
            isDueDateOverdue={isDueDateOverdue}
          />
        )}

        {/* Hover Actions - collapsed non-editing state, desktop only.
            Reveals on hover and on focus-within so keyboard users can reach
            the (otherwise off-screen) buttons; the gradient backdrop keeps the
            ghost icons legible over any badges underneath. */}
        {!isExpanded && !isEditing && (
          <div
            className={cn(
              "absolute inset-y-0 right-0 z-20 hidden items-center gap-1 pr-3 pl-8 transition-transform duration-300 ease-in-out sm:flex",
              "from-surface-2 via-surface-2/95 bg-gradient-to-l to-transparent",
              isAnimatingExpand
                ? "translate-x-full"
                : "translate-x-full group-hover:translate-x-0 focus-within:translate-x-0",
            )}
          >
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="text-muted-foreground focus:ring-border-focus/20 flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-amber-500/10 hover:text-amber-400 focus:ring-2 focus:outline-none"
                  aria-label="Snooze task"
                >
                  <AlarmClock className="h-4 w-4" />
                  <span className="sr-only">Snooze</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="end">
                <SnoozePopoverContent taskId={props.task.id} />
              </PopoverContent>
            </Popover>
            <button
              className="text-muted-foreground hover:bg-primary/10 hover:text-primary focus:ring-border-focus/20 flex h-8 w-8 items-center justify-center rounded-md transition-colors focus:ring-2 focus:outline-none"
              onClick={handleEditClick}
              aria-label="Edit task"
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </button>
            <button
              className="text-muted-foreground focus:ring-border-focus/20 flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-red-500/10 hover:text-red-400 focus:ring-2 focus:outline-none disabled:opacity-50"
              onClick={() => deleteTask.mutate(props.task.id)}
              disabled={deleteTask.isPending}
              aria-label="Delete task"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </button>
          </div>
        )}

        {/* Mobile action menu - touch widths where hover is unavailable */}
        {!isExpanded && !isEditing && (
          <div
            className="shrink-0 sm:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-foreground focus:ring-border-focus/20 flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white/5 focus:ring-2 focus:outline-none"
                  aria-label="Task actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border-border-strong bg-surface-2 text-foreground"
              >
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-foreground focus:bg-surface-hover focus:text-foreground data-[state=open]:bg-surface-hover">
                    <AlarmClock className="h-3.5 w-3.5" />
                    Snooze
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="border-border-strong bg-surface-2 text-foreground">
                    <DropdownMenuItem
                      className="text-foreground focus:bg-surface-hover focus:text-foreground"
                      onSelect={() =>
                        snoozeTask.mutate({
                          id: props.task.id,
                          snoozedUntil: getLaterToday(),
                        })
                      }
                    >
                      Later Today
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-foreground focus:bg-surface-hover focus:text-foreground"
                      onSelect={() =>
                        snoozeTask.mutate({
                          id: props.task.id,
                          snoozedUntil: getTomorrowAt9am(),
                        })
                      }
                    >
                      Tomorrow
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-foreground focus:bg-surface-hover focus:text-foreground"
                      onSelect={() =>
                        snoozeTask.mutate({
                          id: props.task.id,
                          snoozedUntil: getNextMondayAt9am(),
                        })
                      }
                    >
                      Next Week
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                  className="text-foreground focus:bg-surface-hover focus:text-foreground"
                  onSelect={handleEditClick}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => deleteTask.mutate(props.task.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Expanded area */}
      <AnimatePresence onExitComplete={() => setIsAnimatingExpand(false)}>
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
                <div className="border-border-strong/60 border-t pt-3">
                  {isEditing ? (
                    <div className="max-w-2xl">
                      <label className="text-muted-foreground/70 mb-1.5 block text-[10px] font-semibold tracking-wider uppercase">
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
                          "border-border-strong bg-surface-2 text-foreground placeholder:text-muted-foreground w-full resize-y border",
                          "focus:border-border-focus focus:ring-border-focus/20 focus:ring-2 focus:outline-none",
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
                  <DueDatePill
                    value={editedDueDate}
                    onChange={setEditedDueDate}
                    disabled={updateTask.isPending}
                    placeholder="Set due date"
                  />
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
                <ExpandedReadonlyBadges
                  task={props.task}
                  editedCategory={editedCategory}
                  isDueDateOverdue={isDueDateOverdue}
                />
              )}

              {/* Action buttons - expanded non-editing view */}
              {!isEditing && (
                <div className="border-border-strong/40 mt-3 flex items-center justify-end gap-1 border-t pt-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="text-muted-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-amber-500/10 hover:text-amber-400"
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
                    className="text-muted-foreground hover:bg-primary/10 hover:text-primary flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                    aria-label="Edit task"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    onClick={() => deleteTask.mutate(props.task.id)}
                    disabled={deleteTask.isPending}
                    className="text-muted-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              )}

              {/* Save/Cancel buttons inside expanded area */}
              {isEditing && (
                <div className="border-border-strong/40 mt-3 flex items-center justify-end gap-1.5 border-t pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={updateTask.isPending}
                    className="text-muted-foreground hover:bg-surface-hover hover:text-foreground h-8 px-3 text-xs"
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
                      "bg-primary text-primary-foreground hover:bg-primary-hover h-8 px-4 text-xs",
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
