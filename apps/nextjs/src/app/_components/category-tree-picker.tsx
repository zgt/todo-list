"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import { cn } from "@acme/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

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

function TreeItem({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: CategoryNode;
  depth: number;
  selectedId: string | undefined;
  onSelect: (id: string | undefined) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <>
      <div
        className="flex items-center gap-1"
        style={{ paddingLeft: `${8 + depth * 20}px` }}
      >
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

        <button
          type="button"
          aria-pressed={isSelected}
          onClick={() => onSelect(isSelected ? undefined : node.id)}
          className="hover:bg-surface-2 focus-visible:border-border-focus focus-visible:ring-border-focus/40 hover:border-primary flex flex-1 items-center rounded-md border border-transparent px-2 py-1 text-left text-sm hover:text-white focus-visible:ring-2 focus-visible:outline-none"
        >
          <span
            className="mr-2 size-2.5 rounded-full ring-1 ring-black/10 ring-inset dark:ring-white/20"
            style={{ backgroundColor: node.color }}
          />

          <span className="flex-1 truncate">{node.name}</span>

          {isSelected && <Check className="text-primary ml-2 size-4" />}
        </button>
      </div>

      {hasChildren &&
        expanded &&
        node.children.map((child) => (
          <TreeItem
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </>
  );
}

interface CategoryTreePickerProps {
  categories: {
    id: string;
    name: string;
    color: string;
    icon: string | null;
    parentId: string | null;
    sortOrder: number;
  }[];
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  disabled?: boolean;
}

export function CategoryTreePicker({
  categories,
  value,
  onChange,
  disabled,
}: CategoryTreePickerProps) {
  const [open, setOpen] = useState(false);

  const tree = useMemo(() => buildTree(categories), [categories]);

  const selected = categories.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-auto items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur-md",
            "hover:border-border-focus transition-all",
            "focus:ring-border-focus/20 focus:ring-2 focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            selected
              ? "border-opacity-80"
              : "border-border-strong bg-surface-2/80 text-foreground",
          )}
          style={
            selected
              ? {
                  backgroundColor: `${selected.color}60`,
                  borderColor: `${selected.color}80`,
                  color: selected.color,
                }
              : undefined
          }
        >
          {selected ? (
            <>
              <div
                className="size-2.5 rounded-full"
                style={{ backgroundColor: selected.color }}
              />
              {selected.name}
            </>
          ) : (
            "Set category"
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2" align="start">
        <div className="flex max-h-[300px] flex-col gap-0.5 overflow-y-auto">
          {/* No category option */}
          <button
            type="button"
            aria-pressed={!value}
            className="hover:bg-surface-2 focus-visible:border-border-focus focus-visible:ring-border-focus/40 hover:border-primary flex items-center rounded-md border border-transparent px-2 py-1 text-sm hover:text-white focus-visible:ring-2 focus-visible:outline-none"
            style={{ paddingLeft: "8px" }}
            onClick={() => {
              onChange(undefined);
              setOpen(false);
            }}
          >
            <span className="mr-1 size-4" />
            <X className="text-muted-foreground mr-2 size-2.5" />
            <span className="text-muted-foreground flex-1 truncate text-left">
              No category
            </span>
            {!value && <Check className="text-primary ml-2 size-4" />}
          </button>

          {tree.map((node) => (
            <TreeItem
              key={node.id}
              node={node}
              depth={0}
              selectedId={value}
              onSelect={(id) => {
                onChange(id);
                setOpen(false);
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
