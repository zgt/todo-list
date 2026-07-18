"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Filter, Plus } from "lucide-react";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";
import { useCategoryFilter } from "./use-task-filters";

interface CategoryNode {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  sortOrder: number;
  children: CategoryNode[];
}

function buildTree(
  categories: {
    id: string;
    name: string;
    color: string;
    icon: string | null;
    parentId: string | null;
    sortOrder: number;
  }[],
): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of categories) {
    const node = map.get(cat.id);
    if (!node) continue;
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortFn = (a: CategoryNode, b: CategoryNode) =>
    a.sortOrder - b.sortOrder;
  roots.sort(sortFn);
  for (const node of map.values()) {
    node.children.sort(sortFn);
  }

  return roots;
}

function CategoryTreeItem({
  node,
  depth,
  selectedIds,
  onToggle,
}: {
  node: CategoryNode;
  depth: number;
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedIds.includes(node.id);

  return (
    <>
      <div
        className="flex items-center gap-1"
        style={{ paddingLeft: `${8 + depth * 20}px` }}
      >
        {/* Expansion chevron — only for parents */}
        {hasChildren ? (
          <button
            type="button"
            aria-label={expanded ? "Collapse" : "Expand"}
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            className="hover:bg-muted/50 focus-visible:ring-border-focus flex size-4 shrink-0 items-center justify-center rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ChevronDown
              className={cn(
                "size-3 transition-transform",
                !expanded && "-rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}

        {/* Row toggle */}
        <button
          type="button"
          aria-pressed={isSelected}
          onClick={() => onToggle(node.id)}
          className="hover:bg-surface-2 focus-visible:border-border-focus focus-visible:ring-border-focus/40 flex flex-1 items-center rounded-md border border-transparent px-2 py-1 text-left text-sm hover:border-emerald-400 hover:text-white focus-visible:ring-2 focus-visible:outline-none"
        >
          {/* Color dot */}
          <span
            className="mr-2 size-2.5 rounded-full ring-1 ring-black/10 ring-inset dark:ring-white/20"
            style={{ backgroundColor: node.color }}
          />

          {/* Label */}
          <span className="flex-1 truncate">{node.name}</span>

          {/* Check */}
          {isSelected && <Check className="text-primary ml-2 size-4" />}
        </button>
      </div>

      {/* Children */}
      {hasChildren &&
        expanded &&
        node.children.map((child) => (
          <CategoryTreeItem
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedIds={selectedIds}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}

export function CategoryFilter() {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const { data: categories } = useQuery({
    ...trpc.category.all.queryOptions(),
    enabled: !!session?.user,
  });
  const { selectedCategoryIds, setSelectedCategoryIds } = useCategoryFilter();

  const tree = useMemo(() => {
    if (!categories) return [];
    return buildTree(categories);
  }, [categories]);

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds(
      selectedCategoryIds.includes(id)
        ? selectedCategoryIds.filter((cid) => cid !== id)
        : [...selectedCategoryIds, id],
    );
  };

  if (!categories) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hover:bg-surface-2 h-8 gap-1 rounded-full border hover:border-emerald-400 hover:text-white"
        >
          <Filter className="mr-2 size-4" />
          Category
          {selectedCategoryIds.length > 0 && (
            <div className="bg-primary text-primary-foreground ml-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold">
              {selectedCategoryIds.length}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2" align="start">
        <div className="flex max-h-[300px] flex-col gap-0.5 overflow-y-auto">
          {tree.length === 0 ? (
            <Link
              href="/categories"
              className="text-muted-foreground hover:bg-surface-2 flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:border-emerald-400 hover:text-white"
            >
              <Plus className="size-4" />
              Create a category
            </Link>
          ) : (
            tree.map((node) => (
              <CategoryTreeItem
                key={node.id}
                node={node}
                depth={0}
                selectedIds={selectedCategoryIds}
                onToggle={toggleCategory}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
