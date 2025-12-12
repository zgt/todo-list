"use client";

import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import { SidebarTrigger } from "@acme/ui/sidebar";

import { CategoryFilter } from "./category-filter";
import { NewTaskModal } from "./new-task-modal";

// Simple SVG icon components
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const BellIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

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
            <SearchIcon />
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
          <BellIcon />
          <span className="bg-destructive absolute top-2 right-2 size-2 rounded-full" />
        </Button>

        {/* New Task button */}
        <NewTaskModal />
      </div>
    </header>
  );
}
