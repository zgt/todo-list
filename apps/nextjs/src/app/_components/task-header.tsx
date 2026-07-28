"use client";

import { useState } from "react";
import { PlusIcon } from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
} from "lucide-react";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import { SidebarTrigger } from "@acme/ui/sidebar";
import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";
import { CategoryFilter } from "./category-filter";
import { useCreateTask } from "./create-task-context";
import { ListFilter } from "./list-filter";
import { MobileFilterSheet } from "./mobile-filter-sheet";
import { PriorityFilter } from "./priority-filter";
import {
  useListFilter,
  useSearchFilter,
  useViewToggle,
} from "./use-task-filters";

export function TaskHeader() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { setIsCreating } = useCreateTask();
  const { viewMode, setViewMode } = useViewToggle();
  const { isTrashView, isSnoozedView } = useListFilter();
  const { search, setSearch } = useSearchFilter();
  // Trash and Snoozed are read-only pseudo-views: the filters, search box and
  // New Task button have no effect there, so they're hidden.
  const isPseudoView = isTrashView || isSnoozedView;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries(trpc.task.pathFilter());
      toast.success("Tasks refreshed!");
    } catch (error) {
      console.error("Refresh failed:", error);
      toast.error("Failed to refresh tasks");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="flex items-center justify-between gap-2 pr-2 sm:gap-4 sm:pr-6">
      {/* Left side - Mobile trigger and Category Filter */}
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-4">
        {/* Sidebar trigger */}
        <SidebarTrigger className="shrink-0" />

        {/* Page title */}
        <h1 className="shrink-0 text-2xl font-bold text-white sm:text-3xl">
          Tokilist
        </h1>

        {/* Filters — hidden in the read-only Trash/Snoozed views */}
        {!isPseudoView && (
          <>
            {/* Desktop: inline filter pills */}
            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              <CategoryFilter />
              <PriorityFilter />
              <ListFilter />
            </div>

            {/* Mobile/tablet: compact filter + search trigger (bottom sheet) */}
            <MobileFilterSheet className="shrink-0 lg:hidden" />
          </>
        )}
      </div>

      {/* Right side controls */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Search input — hidden in the read-only Trash/Snoozed views */}
        {!isPseudoView && (
          <div className="relative hidden lg:block">
            <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
              <Search className="h-5 w-5" />
            </div>
            <Input
              type="search"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search tasks"
              className="border-border bg-surface/50 w-64 rounded-full pl-10 backdrop-blur-sm"
            />
          </div>
        )}

        {/* View toggle */}
        <div className="border-border-strong bg-surface-2/80 flex items-center rounded-full border p-0.5">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center justify-center rounded-full p-1.5 transition-colors",
              viewMode === "list"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={cn(
              "flex items-center justify-center rounded-full p-1.5 transition-colors",
              viewMode === "calendar"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Calendar view"
          >
            <CalendarDays className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={cn(
              "flex items-center justify-center rounded-full p-1.5 transition-colors",
              viewMode === "cards"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        {/* Refresh button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh tasks"
          className="bg-surface/50 size-9 rounded-full backdrop-blur-sm transition-opacity disabled:opacity-60 sm:size-12"
        >
          <RefreshCw
            className={`h-4 w-4 sm:h-5 sm:w-5 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>

        {/* New Task button (hidden in the Trash/Snoozed views) */}
        {!isPseudoView && (
          <Button
            size="lg"
            aria-label="New Task"
            className="bg-primary shadow-glow hover:shadow-glow-hover gap-1 rounded-full px-3 text-sm sm:gap-2 sm:px-4 sm:text-base lg:px-6"
            onClick={() => setIsCreating(true)}
          >
            <span className="hidden font-semibold lg:inline">New Task</span>
            <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        )}
      </div>
    </header>
  );
}
