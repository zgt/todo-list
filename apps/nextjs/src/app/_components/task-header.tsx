"use client";

import { useState } from "react";
import { PlusIcon } from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, List, RefreshCw, Search } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import { SidebarTrigger } from "@acme/ui/sidebar";
import { toast } from "@acme/ui/toast";

import { cn } from "@acme/ui";

import { useTRPC } from "~/trpc/react";
import { CategoryFilter } from "./category-filter";
import { useCreateTask } from "./create-task-context";
import { ListFilter } from "./list-filter";
import { PriorityFilter } from "./priority-filter";
import { useViewToggle } from "./view-toggle-context";

export function TaskHeader() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { setIsCreating } = useCreateTask();
  const { viewMode, setViewMode } = useViewToggle();

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
    <header className="flex items-center justify-between gap-2 sm:gap-4 pr-2 sm:pr-6">
      {/* Left side - Mobile trigger and Category Filter */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4 overflow-x-auto">
        {/* Sidebar trigger */}
        <SidebarTrigger className="shrink-0" />

        {/* Category Filter */}
        <div className="shrink-0">
          <CategoryFilter />
        </div>

        {/* Priority Filter */}
        <div className="shrink-0">
          <PriorityFilter />
        </div>

        {/* List Filter */}
        <div className="shrink-0">
          <ListFilter />
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Search input */}
        <div className="relative hidden lg:block">
          <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
            <Search className="h-5 w-5" />
          </div>
          <Input
            type="search"
            placeholder="Search"
            className="border-border bg-surface/50 w-64 rounded-full pl-10 backdrop-blur-sm"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-full border border-[#164B49] bg-[#102A2A]/80 p-0.5">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center justify-center rounded-full p-1.5 transition-colors",
              viewMode === "list"
                ? "bg-primary/20 text-primary"
                : "text-[#8FA8A8] hover:text-[#DCE4E4]",
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
                : "text-[#8FA8A8] hover:text-[#DCE4E4]",
            )}
            aria-label="Calendar view"
          >
            <CalendarDays className="h-4 w-4" />
          </button>
        </div>

        {/* Refresh button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-surface/50 size-9 sm:size-12 rounded-full backdrop-blur-sm transition-opacity disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 sm:h-5 sm:w-5 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>

        {/* New Task button */}
        <Button
          size="lg"
          className="bg-primary shadow-glow hover:shadow-glowHover gap-1 sm:gap-2 rounded-full px-3 sm:px-4 lg:px-6 text-sm sm:text-base"
          onClick={() => setIsCreating(true)}
        >
          <span className="hidden font-semibold lg:inline">New Task</span>
          <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </header>
  );
}
