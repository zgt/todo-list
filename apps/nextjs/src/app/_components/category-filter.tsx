"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Filter } from "lucide-react";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";
import { useCategoryFilter } from "./category-filter-context";

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
        className="flex cursor-pointer items-center rounded-md border border-transparent px-2 py-1 text-sm hover:border-emerald-400 hover:bg-[#102A2A] hover:text-white"
        style={{ paddingLeft: `${8 + depth * 20}px` }}
        onClick={() => onToggle(node.id)}
      >
        {/* Expansion chevron — only for parents */}
        {hasChildren ? (
          <div
            className="hover:bg-muted/50 mr-1 flex size-4 items-center justify-center rounded-sm transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            <ChevronDown
              className={cn(
                "size-3 transition-transform",
                !expanded && "-rotate-90",
              )}
            />
          </div>
        ) : (
          <div className="mr-1 size-4" />
        )}

        {/* Color dot */}
        <div
          className="mr-2 size-2.5 rounded-full ring-1 ring-black/10 ring-inset dark:ring-white/20"
          style={{ backgroundColor: node.color }}
        />

        {/* Label */}
        <span className="flex-1 truncate">{node.name}</span>

        {/* Check */}
        {isSelected && <Check className="text-primary ml-2 size-4" />}
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

  if (!categories || categories.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 rounded-full border hover:border-emerald-400 hover:bg-[#102A2A] hover:text-white"
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
          {tree.map((node) => (
            <CategoryTreeItem
              key={node.id}
              node={node}
              depth={0}
              selectedIds={selectedCategoryIds}
              onToggle={toggleCategory}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
