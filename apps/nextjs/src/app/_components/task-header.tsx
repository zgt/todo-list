"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Search } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import { SidebarTrigger } from "@acme/ui/sidebar";
import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";
import { CategoryFilter } from "./category-filter";
import { NewTaskModal } from "./new-task-modal";
import { PriorityFilter } from "./priority-filter";

export function TaskHeader() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    <header className="flex items-center justify-between gap-4 pr-6">
      {/* Left side - Mobile trigger and Category Filter */}
      <div className="flex items-center gap-4">
        {/* Sidebar trigger */}
        <SidebarTrigger />

        {/* Category Filter */}
        <CategoryFilter />

        {/* Priority Filter */}
        <PriorityFilter />
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
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

        {/* Refresh button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-surface/50 size-12 rounded-full backdrop-blur-sm transition-opacity disabled:opacity-60"
        >
          <RefreshCw
            className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>

        {/* New Task button */}
        <NewTaskModal />
      </div>
    </header>
  );
}
