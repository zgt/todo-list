"use client";

import { Bell, Search } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import { SidebarTrigger } from "@acme/ui/sidebar";

import { CategoryFilter } from "./category-filter";
import { NewTaskModal } from "./new-task-modal";

export function TaskHeader() {
  return (
    <header className="flex items-center justify-between gap-4 pr-6">
      {/* Left side - Mobile trigger and Category Filter */}
      <div className="flex items-center gap-4">
        {/* Mobile sidebar trigger - hidden on desktop */}
        <SidebarTrigger className="md:hidden" />

        {/* Category Filter */}
        <CategoryFilter />
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        {/* Search input */}
        <div className="relative hidden md:block">
          <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
            <Search className="h-5 w-5" />
          </div>
          <Input
            type="search"
            placeholder="Search"
            className="border-border bg-surface/50 w-64 rounded-full pl-10 backdrop-blur-sm"
          />
        </div>

        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="bg-surface/50 relative size-12 rounded-full backdrop-blur-sm"
        >
          <Bell className="h-5 w-5" />
          <span className="bg-destructive absolute top-2 right-2 size-2 rounded-full" />
        </Button>

        {/* New Task button */}
        <NewTaskModal />
      </div>
    </header>
  );
}
