"use client";

import { Search, SlidersHorizontal } from "lucide-react";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@acme/ui/sheet";

import { CategoryFilter } from "./category-filter";
import { ListFilter } from "./list-filter";
import { PriorityFilter } from "./priority-filter";
import {
  useCategoryFilter,
  useListFilter,
  usePriorityFilter,
  useSearchFilter,
} from "./use-task-filters";

/**
 * Compact filter + search surface for narrow (<lg) viewports, where the inline
 * pill row clips. A single trigger button (with an active-filter-count badge)
 * opens a bottom sheet containing the search field and the existing filter
 * components stacked vertically.
 */
export function MobileFilterSheet({ className }: { className?: string }) {
  const { search, setSearch } = useSearchFilter();
  const { selectedCategoryIds } = useCategoryFilter();
  const { selectedPriorities } = usePriorityFilter();
  const { selectedListId, isTrashView } = useListFilter();

  const activeCount =
    (search.trim() !== "" ? 1 : 0) +
    (selectedCategoryIds.length > 0 ? 1 : 0) +
    (selectedPriorities.length > 0 ? 1 : 0) +
    (selectedListId !== null || isTrashView ? 1 : 0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Filter and search tasks"
          className={cn(
            "bg-surface/50 relative size-9 rounded-full backdrop-blur-sm hover:text-white sm:size-10",
            className,
          )}
        >
          <SlidersHorizontal className="size-4 sm:size-5" />
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="bg-background border-border-strong max-h-[85vh] gap-0 overflow-y-auto rounded-t-2xl"
      >
        <SheetHeader className="px-4 pt-5 pb-2">
          <SheetTitle className="text-lg">Filter tasks</SheetTitle>
          <SheetDescription className="sr-only">
            Search and filter your tasks by category, priority, and list.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pt-2 pb-8">
          {/* Search */}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks"
              aria-label="Search tasks"
              className="border-border-strong bg-surface-2 h-11 rounded-full pl-10"
            />
          </div>

          {/* Filters — the existing popover pills, stacked */}
          <div className="flex flex-col items-start gap-3">
            <CategoryFilter />
            <PriorityFilter />
            <ListFilter />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
