"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Filter } from "lucide-react";
import { useTree } from "@headless-tree/react";

import { Button } from "@acme/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";
import { cn } from "@acme/ui";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";
import { useCategoryFilter } from "./category-filter-context";
import { Tree, TreeItem, TreeItemLabel } from "./tree";

export function CategoryFilter() {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const { data: categories } = useQuery({
    ...trpc.category.all.queryOptions(),
    enabled: !!session?.user,
  });
  const { selectedCategoryIds, setSelectedCategoryIds } = useCategoryFilter();

  const { itemMap, rootChildren } = useMemo(() => {
    if (!categories) return { itemMap: {}, rootChildren: [] };

    const map: Record<string, any> = {};
    const roots: string[] = [];

    // First pass: create items
    categories.forEach((cat) => {
      map[cat.id] = { ...cat, children: [] };
    });

    // Second pass: link parent/children
    categories.forEach((cat) => {
      if (cat.parentId && map[cat.parentId]) {
        map[cat.parentId].children.push(cat.id);
      } else {
        roots.push(cat.id);
      }
    });

    // Sort function (by sortOrder)
    const sortFn = (aId: string, bId: string) => 
      (map[aId]?.sortOrder ?? 0) - (map[bId]?.sortOrder ?? 0);

    roots.sort(sortFn);
    Object.values(map).forEach((item: any) => {
      item.children.sort(sortFn);
    });

    return { itemMap: map, rootChildren: roots };
  }, [categories]);

  const tree = useTree<any>({
    rootItemId: "root",
    dataLoader: {
      getItem: (itemId: string) => {
        if (itemId === "root") return { id: "root", children: rootChildren, isFolder: true, name: "Root" };
        return itemMap[itemId];
      },
      getChildren: (itemId: string) => {
        if (itemId === "root") return rootChildren;
        return itemMap[itemId]?.children || [];
      },
    },
    getItemName: (item: any) => item.name,
    isItemFolder: (item: any) => item.isFolder || (item.children && item.children.length > 0) || item.id === "root",
    defaultSelectedItems: selectedCategoryIds,
    onSelectChange: (items: any) => {
        // @ts-expect-error - items might be Set or Array depending on version
        setSelectedCategoryIds(Array.from(items));
    }
  });

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed gap-1 rounded-full">
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
        <Tree tree={tree} className="space-y-0.5">
          {tree.getItems().map((item) => (
            <TreeItem 
              key={item.getId()} 
              item={item}
              asChild
            >
              <div 
                className="flex cursor-pointer items-center rounded-md py-1 px-2 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => item.toggleSelect()}
              >
                  {/* Expansion chevron */}
                  <div 
                    className={cn(
                        "mr-1 flex size-4 items-center justify-center rounded-sm transition-colors hover:bg-muted/50",
                        !item.isFolder() && "opacity-0 pointer-events-none"
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        (item as any).toggle();
                    }}
                  >
                    <ChevronDown className={cn("size-3 transition-transform", !item.isExpanded() && "-rotate-90")} />
                  </div>

                  {/* Color indicator */}
                  <div 
                    className="mr-2 size-2.5 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/20" 
                    style={{ backgroundColor: itemMap[item.getId()]?.color || "gray" }}
                  />
                  
                  {/* Name */}
                  <span className="flex-1 truncate">{item.getItemName()}</span>
                  
                  {/* Selection check */}
                  {selectedCategoryIds.includes(item.getId()) && (
                    <Check className="ml-2 size-4 text-primary" />
                  )}
              </div>
            </TreeItem>
          ))}
        </Tree>
      </PopoverContent>
    </Popover>
  );
}
